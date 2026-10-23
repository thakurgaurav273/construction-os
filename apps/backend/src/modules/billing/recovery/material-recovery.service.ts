import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RaBillStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { roundMoney, roundQuantity } from '../billing-math';
import { EDITABLE_BILL_STATUSES } from '../billing.constants';
import { RaBillTotalsService } from '../ra-bill-totals.service';

/** An issue still to recover: never recovered, or recovered on a bill that was later cancelled. */
const PENDING = (contractId: string): Prisma.MaterialIssueWhereInput => ({
  contractId,
  OR: [{ recoveryAdjustmentId: null }, { recoveryAdjustment: { bill: { status: 'CANCELLED' } } }],
});

const ISSUE_SELECT = {
  id: true, code: true, type: true, quantity: true, recoveryRate: true, unitCost: true, issuedOn: true,
  material: { select: { id: true, name: true, unit: true } },
} satisfies Prisma.MaterialIssueSelect;

type IssueRow = Prisma.MaterialIssueGetPayload<{ select: typeof ISSUE_SELECT }>;

export interface RecoverableMaterial {
  materialId: string;
  name: string;
  unit: string;
  issued: number;
  returned: number;
  /** Issued less returned. */
  quantity: number;
  /** Rupees to deduct: issues at their recovery rate, less returns at theirs. */
  amount: number;
  notes: string[];
}

export interface MaterialRecoveryView {
  /** Not yet recovered on any live bill, by material. */
  pending: RecoverableMaterial[];
  /** Recovery lines already on this bill. */
  onBill: { adjustmentId: string; label: string; amount: number; codes: string[] }[];
}

export interface ContractMaterialsSummary {
  issuedValue: number;
  recoveredValue: number;
  pendingValue: number;
}

const signed = (issue: IssueRow): number => (issue.type === 'RETURN' ? -1 : 1);
const rate = (issue: IssueRow): number => (issue.recoveryRate ?? issue.unitCost).toNumber();

function byMaterial(issues: IssueRow[]): RecoverableMaterial[] {
  const groups = new Map<string, IssueRow[]>();
  for (const issue of issues) groups.set(issue.material.id, [...(groups.get(issue.material.id) ?? []), issue]);
  return [...groups.values()].map((rows) => {
    const issued = roundQuantity(rows.filter((row) => row.type === 'ISSUE').reduce((sum, row) => sum + row.quantity.toNumber(), 0));
    const returned = roundQuantity(rows.filter((row) => row.type === 'RETURN').reduce((sum, row) => sum + row.quantity.toNumber(), 0));
    return {
      materialId: rows[0].material.id,
      name: rows[0].material.name,
      unit: rows[0].material.unit,
      issued,
      returned,
      quantity: roundQuantity(issued - returned),
      amount: roundMoney(rows.reduce((sum, row) => sum + signed(row) * row.quantity.toNumber() * rate(row), 0)),
      notes: rows.map((row) => row.code),
    };
  });
}

/**
 * Material issued from our stores to a subcontractor is recovered from their RA bills. Recovering adds a
 * fixed deduction to the bill, linked to the issue notes it covers, so nothing is recovered twice and the
 * vendor bill, print and export carry it like any other deduction. Cancelling the bill frees the issues again.
 */
@Injectable()
export class MaterialRecoveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly totals: RaBillTotalsService,
  ) {}

  async forBill(billId: string, organizationId: string): Promise<MaterialRecoveryView> {
    const bill = await this.findSubcontractBill(billId, organizationId);
    const [pending, onBill] = await Promise.all([
      this.prisma.materialIssue.findMany({ where: PENDING(bill.contractId), select: ISSUE_SELECT, orderBy: { issuedOn: 'asc' } }),
      this.prisma.raBillAdjustment.findMany({
        where: { billId, kind: 'MATERIAL_RECOVERY' },
        include: { recoveredIssues: { select: { code: true } } },
        orderBy: { sortOrder: 'asc' },
      }),
    ]);
    return {
      pending: byMaterial(pending).filter((material) => material.amount > 0),
      onBill: onBill.map((line) => ({ adjustmentId: line.id, label: line.label, amount: line.value.toNumber(), codes: line.recoveredIssues.map((issue) => issue.code) })),
    };
  }

  async contractSummary(contractId: string): Promise<ContractMaterialsSummary> {
    const issues = await this.prisma.materialIssue.findMany({
      where: { contractId },
      select: { ...ISSUE_SELECT, recoveryAdjustment: { select: { bill: { select: { status: true } } } } },
    });
    const value = (rows: typeof issues): number => roundMoney(rows.reduce((sum, row) => sum + signed(row) * row.quantity.toNumber() * rate(row), 0));
    const recovered = issues.filter((issue) => issue.recoveryAdjustment?.bill.status === 'CERTIFIED');
    const pending = issues.filter((issue) => !issue.recoveryAdjustment || issue.recoveryAdjustment.bill.status === 'CANCELLED');
    return { issuedValue: value(issues), recoveredValue: value(recovered), pendingValue: value(pending) };
  }

  /** Adds one deduction per material for everything still to recover on these materials. */
  async recover(billId: string, organizationId: string, materialIds: string[]): Promise<void> {
    const bill = await this.findSubcontractBill(billId, organizationId);
    if (!EDITABLE_BILL_STATUSES.includes(bill.status)) throw new ConflictException('Recover material on drafts and bills sent back for changes.');

    await this.prisma.$transaction(async (tx) => {
      // Lock the contract so two bills can't claim the same issue notes at once.
      await tx.$queryRaw`SELECT id FROM contracts WHERE id = ${bill.contractId} FOR UPDATE`;
      const issues = await tx.materialIssue.findMany({
        where: { ...PENDING(bill.contractId), materialId: { in: materialIds } },
        select: ISSUE_SELECT,
        orderBy: { issuedOn: 'asc' },
      });
      const groups = byMaterial(issues).filter((material) => material.amount > 0);
      if (groups.length === 0) throw new BadRequestException('Nothing is left to recover for those materials.');
      let sortOrder = (await tx.raBillAdjustment.count({ where: { billId } })) + 1;

      for (const group of groups) {
        const adjustment = await tx.raBillAdjustment.create({
          data: {
            billId,
            label: `Material recovery: ${group.name} ${group.quantity} ${group.unit}`.slice(0, 80),
            effect: 'DEDUCT',
            calculation: 'FIXED',
            value: group.amount,
            kind: 'MATERIAL_RECOVERY',
            sortOrder: sortOrder++,
          },
        });
        await tx.materialIssue.updateMany({
          where: { id: { in: issues.filter((issue) => issue.material.id === group.materialId).map((issue) => issue.id) } },
          data: { recoveryAdjustmentId: adjustment.id },
        });
      }
      await this.totals.refresh(tx, billId);
    });
  }

  /** Takes a recovery line off the bill; its issue notes become recoverable again. */
  async release(billId: string, adjustmentId: string, organizationId: string): Promise<void> {
    const bill = await this.findSubcontractBill(billId, organizationId);
    if (!EDITABLE_BILL_STATUSES.includes(bill.status)) throw new ConflictException('Only drafts and bills sent back for changes can be changed.');
    const adjustment = await this.prisma.raBillAdjustment.findFirst({ where: { id: adjustmentId, billId, kind: 'MATERIAL_RECOVERY' } });
    if (!adjustment) throw new NotFoundException('Recovery line not found on this bill.');
    await this.prisma.$transaction(async (tx) => {
      await tx.materialIssue.updateMany({ where: { recoveryAdjustmentId: adjustmentId }, data: { recoveryAdjustmentId: null } });
      await tx.raBillAdjustment.delete({ where: { id: adjustmentId } });
      await this.totals.refresh(tx, billId);
    });
  }

  private async findSubcontractBill(billId: string, organizationId: string): Promise<{ contractId: string; status: RaBillStatus }> {
    const bill = await this.prisma.raBill.findFirst({
      where: { id: billId, organizationId },
      select: { contractId: true, status: true, contract: { select: { direction: true } } },
    });
    if (!bill) throw new NotFoundException('RA bill not found.');
    if (bill.contract.direction !== 'SUBCONTRACT') throw new BadRequestException('Material is only recovered on subcontract bills.');
    return bill;
  }
}
