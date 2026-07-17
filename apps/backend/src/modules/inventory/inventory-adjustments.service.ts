import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InventoryTransactionType, Prisma, StockAdjustmentReason } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto';
import { buildCode, num, round2 } from './inventory.helpers';

@Injectable()
export class InventoryAdjustmentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Correct the on-hand quantity of a material at a warehouse. Writes a StockAdjustment
   * audit record and a matching ADJUSTMENT/DAMAGE transaction, and updates the inventory item.
   * Damaged / lost quantity is moved into the item's damaged bucket so it is excluded from availability.
   */
  async create(organizationId: string, dto: CreateAdjustmentDto) {
    const material = await this.prisma.material.findFirst({
      where: { id: dto.materialId, organizationId, deletedAt: null },
      select: { id: true, unitCost: true },
    });
    if (!material) throw new NotFoundException('Material not found');

    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: dto.warehouseId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!warehouse) throw new NotFoundException('Warehouse not found');

    const item = await this.prisma.inventoryItem.findUnique({
      where: { materialId_warehouseId: { materialId: dto.materialId, warehouseId: dto.warehouseId } },
    });

    const quantityBefore = item ? num(item.quantity) : 0;
    const quantityAfter = dto.quantityAfter;
    const delta = round2(quantityAfter - quantityBefore);
    if (delta === 0) throw new BadRequestException('Adjustment does not change the on-hand quantity');

    const reason = dto.reason as StockAdjustmentReason;
    const movesToDamaged = reason === 'DAMAGE' || reason === 'LOSS';

    const adjustmentCount = await this.prisma.stockAdjustment.count({ where: { organizationId } });
    const code = buildCode('ADJ', adjustmentCount);

    return this.prisma.$transaction(async (tx) => {
      const savedItem = item
        ? await tx.inventoryItem.update({
            where: { id: item.id },
            data: {
              quantity: quantityAfter,
              damaged:
                movesToDamaged && delta < 0 ? num(item.damaged) + Math.abs(delta) : item.damaged,
            },
          })
        : await tx.inventoryItem.create({
            data: {
              materialId: dto.materialId,
              warehouseId: dto.warehouseId,
              organizationId,
              quantity: quantityAfter,
              reorderLevel: 0,
            },
          });

      const adjustment = await tx.stockAdjustment.create({
        data: {
          code,
          reason,
          quantityBefore,
          quantityAfter,
          delta,
          note: dto.note ?? null,
          adjustedBy: dto.adjustedBy ?? null,
          inventoryItemId: savedItem.id,
          materialId: dto.materialId,
          warehouseId: dto.warehouseId,
          organizationId,
        },
      });

      await tx.inventoryTransaction.create({
        data: {
          type: movesToDamaged ? InventoryTransactionType.DAMAGE : InventoryTransactionType.ADJUSTMENT,
          quantity: delta,
          unitCost: material.unitCost,
          reference: code,
          note: dto.note ?? `${reason} adjustment`,
          inventoryItemId: savedItem.id,
          materialId: dto.materialId,
          warehouseId: dto.warehouseId,
          organizationId,
        },
      });

      return {
        id: adjustment.id,
        code: adjustment.code,
        reason: adjustment.reason,
        quantityBefore,
        quantityAfter,
        delta,
        materialId: dto.materialId,
        warehouseId: dto.warehouseId,
        createdAt: adjustment.createdAt,
      };
    });
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
      createdAt: a.createdAt,
    }));
  }
}
