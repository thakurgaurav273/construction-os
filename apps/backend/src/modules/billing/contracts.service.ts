import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ContractDirection, ContractStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { nextDocumentNumber, withDocumentNumberRetry } from '../procurement/document-numbers';
import { VendorsService } from '../procurement/vendors.service';
import { OPEN_BILL_STATUSES } from './billing.constants';
import { ClientsService } from './clients.service';
import { RetentionService } from './retention.service';
import {
  CONTRACT_INCLUDE, ContractDetailView, ContractSummaryView, LoadedContract, toContractDetail, toContractSummary,
} from './contract.mapper';
import { AdjustmentRuleDto, ContractQueryDto, CreateContractDto, UpdateContractDto } from './dto/contract.dto';

const toDay = (value: string | null | undefined): Date | null | undefined => {
  if (value === undefined) return undefined;
  return value ? new Date(value) : null;
};

export function adjustmentRows(rules: AdjustmentRuleDto[]): Omit<Prisma.ContractAdjustmentRuleCreateManyInput, 'contractId'>[] {
  return rules.map((rule, index) => ({
    label: rule.label, effect: rule.effect, calculation: rule.calculation, value: rule.value, isRetention: rule.isRetention ?? false, sortOrder: index,
  }));
}

/** Contracts (work orders) and their deduction rules. The BOQ lives in ContractItemsService. */
@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clients: ClientsService,
    private readonly vendors: VendorsService,
    private readonly retention: RetentionService,
  ) {}

  async findAll(organizationId: string, query: ContractQueryDto): Promise<ContractSummaryView[]> {
    const contracts = await this.prisma.contract.findMany({
      where: { organizationId, projectId: query.projectId, direction: query.direction, status: query.status },
      include: CONTRACT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return contracts.map(toContractSummary);
  }

  async findOne(id: string, organizationId: string): Promise<ContractDetailView> {
    const contract = await this.findContractOrThrow(id, organizationId);
    const itemIds = contract.items.map((item) => item.id);
    const [certified, used, retention] = await Promise.all([
      this.prisma.raBillLine.groupBy({
        by: ['contractItemId'],
        where: { contractItemId: { in: itemIds }, bill: { status: 'CERTIFIED' } },
        _sum: { certifiedQuantity: true },
      }),
      this.prisma.raBillLine.findMany({ where: { contractItemId: { in: itemIds } }, select: { contractItemId: true }, distinct: ['contractItemId'] }),
      this.retention.summary(id),
    ]);
    const certifiedByItem = new Map(certified.map((entry) => [entry.contractItemId, entry._sum.certifiedQuantity?.toNumber() ?? 0]));
    return toContractDetail(contract, certifiedByItem, new Set(used.map((line) => line.contractItemId)), retention);
  }

  async create(organizationId: string, userId: string, dto: CreateContractDto): Promise<ContractDetailView> {
    await this.assertOpenProject(dto.projectId, organizationId);
    const party = await this.resolveParty(dto.direction, dto, organizationId);
    const contract = await withDocumentNumberRetry(async () => this.prisma.contract.create({
      data: {
        code: await this.nextCode(organizationId),
        direction: dto.direction,
        reference: dto.reference?.trim() || null,
        title: dto.title,
        startDate: toDay(dto.startDate),
        endDate: toDay(dto.endDate),
        notes: dto.notes?.trim() ?? '',
        paymentTermDays: dto.paymentTermDays,
        projectId: dto.projectId,
        ...party,
        organizationId,
        createdById: userId,
        adjustments: { createMany: { data: adjustmentRows(dto.adjustments ?? []) } },
      },
    }));
    return this.findOne(contract.id, organizationId);
  }

  async update(id: string, organizationId: string, dto: UpdateContractDto): Promise<ContractDetailView> {
    const contract = await this.findContractOrThrow(id, organizationId);
    const partyChanged = (dto.clientId !== undefined && dto.clientId !== contract.clientId)
      || (dto.vendorId !== undefined && dto.vendorId !== contract.vendorId);
    if (partyChanged && contract.bills.some((bill) => bill.status !== 'CANCELLED')) {
      throw new ConflictException("This contract already has bills, so its client or subcontractor can't change.");
    }
    const party = partyChanged ? await this.resolveParty(contract.direction, { ...contract, ...dto }, organizationId) : {};

    await this.prisma.$transaction(async (tx) => {
      await tx.contract.update({
        where: { id },
        data: {
          ...party,
          reference: dto.reference === undefined ? undefined : dto.reference?.trim() || null,
          title: dto.title,
          startDate: toDay(dto.startDate),
          endDate: toDay(dto.endDate),
          notes: dto.notes?.trim(),
          paymentTermDays: dto.paymentTermDays,
        },
      });
      // Rules only seed new bills; bills already started keep their own copy.
      if (dto.adjustments) {
        await tx.contractAdjustmentRule.deleteMany({ where: { contractId: id } });
        await tx.contractAdjustmentRule.createMany({ data: adjustmentRows(dto.adjustments).map((row) => ({ ...row, contractId: id })) });
      }
    });
    return this.findOne(id, organizationId);
  }

  /** Closing stops new bills; an open bill has to be finished or cancelled first. */
  async setStatus(id: string, organizationId: string, status: ContractStatus): Promise<ContractDetailView> {
    const contract = await this.findContractOrThrow(id, organizationId);
    if (contract.status === status) throw new ConflictException(`This contract is already ${status === 'CLOSED' ? 'closed' : 'open'}.`);
    if (status === 'CLOSED' && contract.bills.some((bill) => OPEN_BILL_STATUSES.includes(bill.status))) {
      throw new ConflictException('Certify or cancel the open RA bill before closing this contract.');
    }
    await this.prisma.contract.update({ where: { id }, data: { status } });
    return this.findOne(id, organizationId);
  }

  async findContractOrThrow(id: string, organizationId: string): Promise<LoadedContract> {
    const contract = await this.prisma.contract.findFirst({ where: { id, organizationId }, include: CONTRACT_INCLUDE });
    if (!contract) throw new NotFoundException('Contract not found.');
    return contract;
  }

  async assertOpenProject(projectId: string, organizationId: string): Promise<void> {
    const project = await this.prisma.project.findFirst({ where: { id: projectId, organizationId, deletedAt: null }, select: { status: true } });
    if (!project) throw new NotFoundException('Project not found.');
    if (project.status === 'ARCHIVED') throw new ConflictException('This project is archived. Restore it before billing against it.');
  }

  /** A client contract bills a client; a subcontract is billed by an active vendor. Never both. */
  private async resolveParty(
    direction: ContractDirection,
    dto: { clientId?: string | null; vendorId?: string | null },
    organizationId: string,
  ): Promise<{ clientId: string | null; vendorId: string | null }> {
    if (direction === 'CLIENT') {
      if (!dto.clientId) throw new BadRequestException('Choose the client this contract bills.');
      await this.clients.findClientOrThrow(dto.clientId, organizationId);
      return { clientId: dto.clientId, vendorId: null };
    }
    if (!dto.vendorId) throw new BadRequestException('Choose the subcontractor for this contract.');
    await this.vendors.findActiveVendor(dto.vendorId, organizationId);
    return { clientId: null, vendorId: dto.vendorId };
  }

  private async nextCode(organizationId: string): Promise<string> {
    const existing = await this.prisma.contract.findMany({ where: { organizationId }, select: { code: true } });
    return nextDocumentNumber('CT', existing.map((contract) => contract.code));
  }
}
