import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InventoryTransactionType, MaterialMovementType, Prisma, StockAdjustmentReason } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto';
import { num } from './inventory.helpers';
import { nextDocumentNumber, withDocumentNumberRetry } from '../procurement/document-numbers';
import { normalizeOptionalText } from '../../common/utils/normalize-text';
import { StockLedgerService } from './stock-ledger.service';

export interface AdjustmentView {
  id: string;
  code: string;
  reason: StockAdjustmentReason;
  quantityBefore: number;
  quantityAfter: number;
  delta: number;
  materialId: string;
  warehouseId: string;
  createdAt: Date;
}

const round3 = (value: number): number => Math.round(value * 1000) / 1000;

@Injectable()
export class InventoryAdjustmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: StockLedgerService,
  ) {}

  /**
   * Correct the on-hand quantity of a material at a store to what was physically counted. Writes a
   * StockAdjustment record, a matching ADJUSTMENT/DAMAGE transaction and keeps the material total in step.
   * Damaged or lost stock leaves `quantity`; the item's `damaged` bucket only records how much was written off.
   */
  async create(organizationId: string, userId: string, dto: CreateAdjustmentDto): Promise<AdjustmentView> {
    const material = await this.prisma.material.findFirst({
      where: { id: dto.materialId, organizationId, deletedAt: null },
      select: { id: true, unitCost: true },
    });
    if (!material) throw new NotFoundException('Material not found');

    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: dto.warehouseId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!warehouse) throw new NotFoundException('Store not found');

    const reason = dto.reason as StockAdjustmentReason;
    const writesOff = reason === 'DAMAGE' || reason === 'LOSS';
    const note = normalizeOptionalText(dto.note) ?? `${reason.replace('_', ' ').toLowerCase()} adjustment`;

    return withDocumentNumberRetry(() => this.prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.upsert({
        where: { materialId_warehouseId: { materialId: dto.materialId, warehouseId: dto.warehouseId } },
        create: { materialId: dto.materialId, warehouseId: dto.warehouseId, organizationId, quantity: 0 },
        update: {},
        select: { id: true },
      });
      // Lock the row so an issue or transfer can't change the quantity between the count and the correction.
      const [locked] = await tx.$queryRaw<{ quantity: Prisma.Decimal; damaged: Prisma.Decimal }[]>`
        SELECT "quantity", "damaged" FROM "inventory_items" WHERE "id" = ${item.id} FOR UPDATE`;
      const quantityBefore = num(locked.quantity);
      const delta = round3(dto.quantityAfter - quantityBefore);
      if (delta === 0) throw new BadRequestException('The counted quantity matches the current stock, so there is nothing to adjust.');
      if (writesOff && delta > 0) throw new BadRequestException('Damage and loss can only reduce stock.');

      await tx.inventoryItem.update({
        where: { id: item.id },
        data: {
          quantity: dto.quantityAfter,
          damaged: writesOff ? num(locked.damaged) + Math.abs(delta) : undefined,
        },
      });

      const code = await this.nextCode(tx, organizationId);
      const adjustment = await tx.stockAdjustment.create({
        data: {
          code,
          reason,
          quantityBefore,
          quantityAfter: dto.quantityAfter,
          delta,
          note,
          adjustedById: userId,
          inventoryItemId: item.id,
          materialId: dto.materialId,
          warehouseId: dto.warehouseId,
          organizationId,
        },
      });
      await tx.inventoryTransaction.create({
        data: {
          type: writesOff ? InventoryTransactionType.DAMAGE : InventoryTransactionType.ADJUSTMENT,
          quantity: delta,
          unitCost: material.unitCost,
          reference: code,
          note,
          inventoryItemId: item.id,
          materialId: dto.materialId,
          warehouseId: dto.warehouseId,
          organizationId,
        },
      });
      await this.ledger.changeMaterialTotal(tx, {
        organizationId,
        materialId: dto.materialId,
        delta,
        type: MaterialMovementType.ADJUSTMENT,
        reference: code,
        note,
      });

      return {
        id: adjustment.id,
        code,
        reason,
        quantityBefore,
        quantityAfter: dto.quantityAfter,
        delta,
        materialId: dto.materialId,
        warehouseId: dto.warehouseId,
        createdAt: adjustment.createdAt,
      };
    }));
  }

  private async nextCode(tx: Prisma.TransactionClient, organizationId: string): Promise<string> {
    const existing = await tx.stockAdjustment.findMany({
      where: { organizationId, code: { startsWith: 'ADJ-' } },
      select: { code: true },
    });
    return nextDocumentNumber('ADJ', existing.map((row) => row.code));
  }

  async findAll(organizationId: string, warehouseId?: string) {
    const where: Prisma.StockAdjustmentWhereInput = { organizationId };
    if (warehouseId) where.warehouseId = warehouseId;
    const rows = await this.prisma.stockAdjustment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        material: { select: { id: true, name: true, unit: true } },
        warehouse: { select: { id: true, name: true } },
        adjustedBy: { select: { id: true, name: true } },
      },
    });
    return rows.map((a) => ({
      id: a.id,
      code: a.code,
      reason: a.reason,
      quantityBefore: num(a.quantityBefore),
      quantityAfter: num(a.quantityAfter),
      delta: num(a.delta),
      note: a.note,
      materialName: a.material.name,
      unit: a.material.unit,
      warehouseName: a.warehouse.name,
      adjustedBy: a.adjustedBy,
      createdAt: a.createdAt,
    }));
  }
}
