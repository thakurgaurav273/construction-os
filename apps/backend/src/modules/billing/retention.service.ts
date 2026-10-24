import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { BillingPayablesService } from '../finance/billing-payables.service';
import { formatRupees } from '../procurement/purchase-order-history.service';
import { isFutureDay } from '../procurement/procurement-math';
import { adjustmentAmount, roundMoney } from './billing-math';
import { billCode } from './contract.mapper';
import { ReleaseRetentionDto } from './dto/settlement.dto';

export interface RetentionView {
  held: number;
  released: number;
  balance: number;
  byBill: { billId: string; code: string; amount: number }[];
  releases: { id: string; amount: number; releasedOn: Date; reference: string; note: string; invoiceId: string | null; createdAt: Date }[];
}

const RETENTION_INCLUDE = {
  bills: {
    where: { status: 'CERTIFIED' },
    select: { id: true, sequence: true, grossAmount: true, adjustments: { where: { isRetention: true, effect: 'DEDUCT' } } },
    orderBy: { sequence: 'asc' },
  },
  retentionReleases: { include: { invoice: { select: { id: true } } }, orderBy: { releasedOn: 'asc' } },
} satisfies Prisma.ContractInclude;

type ContractRetention = Prisma.ContractGetPayload<{ include: typeof RETENTION_INCLUDE }>;

function toRetentionView(contract: ContractRetention): RetentionView {
  const byBill = contract.bills.map((bill) => ({
    billId: bill.id,
    code: billCode(bill.sequence),
    amount: roundMoney(bill.adjustments.reduce(
      (sum, adjustment) => sum - adjustmentAmount({ ...adjustment, value: adjustment.value.toNumber() }, bill.grossAmount.toNumber()),
      0,
    )),
  })).filter((entry) => entry.amount > 0);
  const held = roundMoney(byBill.reduce((sum, entry) => sum + entry.amount, 0));
  const released = roundMoney(contract.retentionReleases.reduce((sum, release) => sum + release.amount.toNumber(), 0));
  return {
    held,
    released,
    balance: roundMoney(held - released),
    byBill,
    releases: contract.retentionReleases.map((release) => ({
      id: release.id,
      amount: release.amount.toNumber(),
      releasedOn: release.releasedOn,
      reference: release.reference,
      note: release.note,
      invoiceId: release.invoice?.id ?? null,
      createdAt: release.createdAt,
    })),
  };
}

/** Works with the Prisma service and inside a transaction. */
type ContractReader = Pick<Prisma.TransactionClient, 'contract'>;

export async function contractRetention(db: ContractReader, contractId: string): Promise<RetentionView> {
  return toRetentionView(await db.contract.findUniqueOrThrow({ where: { id: contractId }, include: RETENTION_INCLUDE }));
}

export interface RetentionBalances {
  /** Clients still hold this much of our certified bills. */
  heldByClients: number;
  /** We still hold this much of our subcontractors' certified bills. */
  heldFromSubcontractors: number;
}

/** Retention not yet released, across every contract of the organization, by direction. */
export async function retentionBalances(db: ContractReader, organizationId: string): Promise<RetentionBalances> {
  const contracts = await db.contract.findMany({
    where: { organizationId, project: { deletedAt: null } },
    include: RETENTION_INCLUDE,
  });
  const balances: RetentionBalances = { heldByClients: 0, heldFromSubcontractors: 0 };
  for (const contract of contracts) {
    const { balance } = toRetentionView(contract);
    if (balance <= 0) continue;
    const key = contract.direction === 'CLIENT' ? 'heldByClients' : 'heldFromSubcontractors';
    balances[key] = roundMoney(balances[key] + balance);
  }
  return balances;
}

/**
 * Retention is what certified bills held back under deductions marked as retention (security deposit,
 * retention money). Releasing it on a subcontract raises an approved vendor bill to pay; on a client
 * contract it records the retention the client paid back.
 */
@Injectable()
export class RetentionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payables: BillingPayablesService,
  ) {}

  async summary(contractId: string): Promise<RetentionView> {
    return contractRetention(this.prisma, contractId);
  }

  async release(contractId: string, organizationId: string, userId: string, dto: ReleaseRetentionDto): Promise<void> {
    const releasedOn = new Date(dto.releasedOn);
    if (isFutureDay(releasedOn)) throw new BadRequestException("The release date can't be in the future.");

    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM contracts WHERE id = ${contractId} AND "organizationId" = ${organizationId} FOR UPDATE`;
      const contract = await tx.contract.findFirst({
        where: { id: contractId, organizationId },
        include: { ...RETENTION_INCLUDE, vendor: { select: { id: true, name: true } } },
      });
      if (!contract) throw new NotFoundException('Contract not found.');
      const { balance } = toRetentionView(contract);
      if (dto.amount > balance + 0.005) {
        throw new ConflictException(balance <= 0 ? 'No retention is held on this contract.' : `Only ${formatRupees(balance)} of retention is held.`);
      }

      const release = await tx.retentionRelease.create({
        data: { contractId, amount: dto.amount, releasedOn, reference: dto.reference ?? '', note: dto.note?.trim() ?? '', createdById: userId },
      });
      const isSubcontract = contract.direction === 'SUBCONTRACT';
      if (isSubcontract && contract.vendor) {
        const number = `${contract.code}/RET-${String(contract.retentionReleases.length + 1).padStart(2, '0')}`;
        await this.payables.createForRetentionRelease(tx, {
          retentionReleaseId: release.id,
          organizationId,
          projectId: contract.projectId,
          vendor: contract.vendor,
          invoiceNumber: number,
          fallbackNumber: `${number}-${release.id.slice(0, 4)}`,
          description: `Retention release on ${contract.code}: ${contract.title}`.slice(0, 200),
          issuedDate: releasedOn,
          dueDate: releasedOn,
          lines: [{ description: `Retention released on ${contract.code}`, unit: 'LS', quantity: 1, rate: dto.amount }],
          createdById: userId,
          approvedById: userId,
          approvalNote: `Retention released on ${contract.code}.`,
        });
      }
      await tx.activity.create({
        data: {
          type: 'update',
          title: isSubcontract ? 'Retention released to subcontractor' : 'Retention received from client',
          description: `${formatRupees(dto.amount)} of retention on ${contract.code} (${contract.title}).`,
          entityType: 'contract',
          entityId: contractId,
          actorId: userId,
          projectId: contract.projectId,
          organizationId,
        },
      });
    });
  }
}
