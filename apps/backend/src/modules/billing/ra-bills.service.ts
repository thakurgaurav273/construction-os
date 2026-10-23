import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { measurementQuantity } from './billing-math';
import { BILL_EVENTS, EDITABLE_BILL_STATUSES, OPEN_BILL_STATUSES } from './billing.constants';
import { billCode } from './contract.mapper';
import { ContractsService, adjustmentRows } from './contracts.service';
import {
  CreateRaBillDto, RaBillQueryDto, ReplaceMeasurementsDto, UpdateRaBillDto,
} from './dto/ra-bill.dto';
import { RaBillHistoryService } from './ra-bill-history.service';
import { RaBillTotalsService } from './ra-bill-totals.service';
import {
  DetailBill, RA_BILL_DETAIL_INCLUDE, RA_BILL_SUMMARY_INCLUDE, RaBillDetailView, RaBillSummaryView, toRaBillDetail,
  toRaBillSummary,
} from './ra-bill.mapper';

function assertPeriod(from: Date, to: Date): void {
  if (from > to) throw new BadRequestException('The bill period must end on or after the day it starts.');
}

/** RA bills and their measurement books. Status changes live in RaBillWorkflowService. */
@Injectable()
export class RaBillsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contracts: ContractsService,
    private readonly totals: RaBillTotalsService,
    private readonly history: RaBillHistoryService,
  ) {}

  async findAll(organizationId: string, query: RaBillQueryDto): Promise<RaBillSummaryView[]> {
    const bills = await this.prisma.raBill.findMany({
      where: {
        organizationId,
        contractId: query.contractId,
        projectId: query.projectId,
        status: query.status,
        ...(query.direction && { contract: { direction: query.direction } }),
      },
      include: RA_BILL_SUMMARY_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return bills.map(toRaBillSummary);
  }

  async findOne(id: string, organizationId: string): Promise<RaBillDetailView> {
    const bill = await this.findBillOrThrow(id, organizationId);
    const previousLines = await this.prisma.raBillLine.findMany({
      where: { bill: { contractId: bill.contractId, status: 'CERTIFIED', sequence: { lt: bill.sequence } } },
      select: { contractItemId: true, certifiedQuantity: true, rate: true },
    });
    return toRaBillDetail(bill, previousLines);
  }

  /** Bills are sequential: "previous" quantities only make sense when the one before is finished. */
  async create(contractId: string, organizationId: string, userId: string, dto: CreateRaBillDto): Promise<RaBillDetailView> {
    const contract = await this.contracts.findContractOrThrow(contractId, organizationId);
    if (contract.status === 'CLOSED') throw new ConflictException('This contract is closed. Reopen it to raise another bill.');
    if (contract.items.length === 0) throw new BadRequestException('Add the BOQ to this contract before starting a bill.');
    const open = contract.bills.find((bill) => OPEN_BILL_STATUSES.includes(bill.status));
    if (open) throw new ConflictException(`${billCode(open.sequence)} is still open. Certify or cancel it before starting the next bill.`);
    await this.contracts.assertOpenProject(contract.projectId, organizationId);

    const periodFrom = new Date(dto.periodFrom);
    const periodTo = new Date(dto.periodTo);
    assertPeriod(periodFrom, periodTo);
    const sequence = Math.max(0, ...contract.bills.map((bill) => bill.sequence)) + 1;

    const bill = await this.prisma.$transaction(async (tx) => {
      const created = await tx.raBill.create({
        data: {
          contractId,
          projectId: contract.projectId,
          organizationId,
          sequence,
          reference: dto.reference?.trim() || null,
          periodFrom,
          periodTo,
          notes: dto.notes?.trim() ?? '',
          preparedById: userId,
          adjustments: {
            createMany: {
              data: contract.adjustments.map((rule) => ({
                label: rule.label, effect: rule.effect, calculation: rule.calculation, value: rule.value, sortOrder: rule.sortOrder,
              })),
            },
          },
        },
      });
      await this.history.record(tx, {
        bill: created,
        actorId: userId,
        stage: BILL_EVENTS.created,
        activity: { type: 'update', title: 'RA bill started', description: `${billCode(sequence)} on ${contract.code} (${contract.title}) was started.` },
      });
      return created;
    });
    return this.findOne(bill.id, organizationId);
  }

  async update(id: string, organizationId: string, dto: UpdateRaBillDto): Promise<RaBillDetailView> {
    const bill = await this.findEditableBill(id, organizationId);
    const periodFrom = dto.periodFrom ? new Date(dto.periodFrom) : bill.periodFrom;
    const periodTo = dto.periodTo ? new Date(dto.periodTo) : bill.periodTo;
    assertPeriod(periodFrom, periodTo);

    await this.prisma.$transaction(async (tx) => {
      await tx.raBill.update({
        where: { id },
        data: {
          periodFrom,
          periodTo,
          reference: dto.reference === undefined ? undefined : dto.reference?.trim() || null,
          notes: dto.notes?.trim(),
        },
      });
      if (dto.adjustments) {
        await tx.raBillAdjustment.deleteMany({ where: { billId: id } });
        await tx.raBillAdjustment.createMany({ data: adjustmentRows(dto.adjustments).map((row) => ({ ...row, billId: id })) });
      }
      await this.totals.refresh(tx, id);
    });
    return this.findOne(id, organizationId);
  }

  /** Replaces one BOQ line's measurement book rows; the line's claimed quantity is their total. */
  async replaceMeasurements(
    id: string,
    contractItemId: string,
    organizationId: string,
    dto: ReplaceMeasurementsDto,
  ): Promise<RaBillDetailView> {
    const bill = await this.findEditableBill(id, organizationId);
    if (!bill.contract.items.some((item) => item.id === contractItemId)) throw new NotFoundException('BOQ item not found on this contract.');

    const rows = dto.rows.map((row, index) => {
      const values = { ...row, isDeduction: row.isDeduction ?? false };
      if (row.type === 'DIRECT' && row.quantity == null) throw new BadRequestException(`Enter a quantity for "${row.description}".`);
      if (row.type === 'STEEL' && (row.length == null || row.unitWeight == null)) {
        throw new BadRequestException(`Enter the cut length and kg per metre for "${row.description}".`);
      }
      return {
        billId: id,
        contractItemId,
        description: row.description,
        type: row.type,
        nos: row.nos ?? null,
        length: row.length ?? null,
        breadth: row.breadth ?? null,
        height: row.height ?? null,
        unitWeight: row.unitWeight ?? null,
        quantity: measurementQuantity(values),
        isDeduction: values.isDeduction,
        sortOrder: index,
      } satisfies Prisma.RaBillMeasurementCreateManyInput;
    });
    const claimed = rows.reduce((sum, row) => sum + row.quantity, 0);
    if (claimed < 0) throw new BadRequestException('Deductions add up to more than the measured quantity.');

    await this.prisma.$transaction(async (tx) => {
      await tx.raBillMeasurement.deleteMany({ where: { billId: id, contractItemId } });
      await tx.raBillMeasurement.createMany({ data: rows });
      if (rows.length === 0) {
        await tx.raBillLine.deleteMany({ where: { billId: id, contractItemId } });
      } else {
        await tx.raBillLine.upsert({
          where: { billId_contractItemId: { billId: id, contractItemId } },
          create: { billId: id, contractItemId, claimedQuantity: claimed },
          update: { claimedQuantity: claimed },
        });
      }
      await this.totals.refresh(tx, id);
    });
    return this.findOne(id, organizationId);
  }

  async findBillOrThrow(id: string, organizationId: string): Promise<DetailBill> {
    const bill = await this.prisma.raBill.findFirst({ where: { id, organizationId }, include: RA_BILL_DETAIL_INCLUDE });
    if (!bill) throw new NotFoundException('RA bill not found.');
    return bill;
  }

  private async findEditableBill(id: string, organizationId: string): Promise<DetailBill> {
    const bill = await this.findBillOrThrow(id, organizationId);
    if (!EDITABLE_BILL_STATUSES.includes(bill.status)) {
      throw new ConflictException('Only drafts and bills sent back for changes can be edited.');
    }
    return bill;
  }
}
