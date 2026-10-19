import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InventoryTransactionType, MaterialMovementType, Prisma } from '@prisma/client';
import { num } from './inventory.helpers';

export interface ReceiptLine {
  materialId: string;
  quantity: number;
  /** Landed rate per unit before GST (GST is recoverable input credit, not stock cost). */
  unitCost: number;
}

export interface StockReceipt {
  organizationId: string;
  warehouseId: string;
  projectId: string | null;
  /** Document that moved the stock, e.g. GRN-0012. */
  reference: string;
  note: string;
  occurredAt: Date;
  lines: ReceiptLine[];
}

export interface MaterialTotalChange {
  organizationId: string;
  materialId: string;
  /** Signed change to the organization-wide quantity. */
  delta: number;
  type: MaterialMovementType;
  reference: string;
  note?: string;
  projectId?: string | null;
  occurredAt?: Date;
}

const roundQuantity = (value: number): number => Math.round(value * 1000) / 1000;
const roundMoney = (value: number): number => Math.round(value * 100) / 100;

/**
 * The one place stock quantities change. Stock lives at two levels that must agree: per warehouse
 * (InventoryItem, with InventoryTransaction history) and per material across the organization
 * (Material.quantity, with MaterialMovement history used by the Materials module). Every write here updates
 * both inside the caller's transaction.
 */
@Injectable()
export class StockLedgerService {
  /** Goods arriving into a warehouse, e.g. from a GRN. Updates weighted-average cost and consumes "incoming". */
  async receive(tx: Prisma.TransactionClient, receipt: StockReceipt): Promise<void> {
    const warehouse = await tx.warehouse.findFirst({
      where: { id: receipt.warehouseId, organizationId: receipt.organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!warehouse) throw new NotFoundException('Store not found.');

    for (const line of receipt.lines) {
      if (line.quantity <= 0) continue;
      const material = await tx.material.findFirst({
        where: { id: line.materialId, organizationId: receipt.organizationId, deletedAt: null },
        select: { id: true, quantity: true, unitCost: true, incoming: true },
      });
      if (!material) throw new BadRequestException('A received line is linked to a material that no longer exists.');

      const item = await tx.inventoryItem.upsert({
        where: { materialId_warehouseId: { materialId: material.id, warehouseId: warehouse.id } },
        create: { materialId: material.id, warehouseId: warehouse.id, organizationId: receipt.organizationId, quantity: 0 },
        update: {},
      });
      await tx.inventoryItem.update({
        where: { id: item.id },
        data: {
          quantity: { increment: line.quantity },
          incoming: roundQuantity(Math.max(0, num(item.incoming) - line.quantity)),
        },
      });
      await tx.inventoryTransaction.create({
        data: {
          type: InventoryTransactionType.RECEIVE,
          quantity: line.quantity,
          unitCost: line.unitCost,
          reference: receipt.reference,
          note: receipt.note,
          inventoryItemId: item.id,
          materialId: material.id,
          warehouseId: warehouse.id,
          projectId: receipt.projectId,
          organizationId: receipt.organizationId,
          occurredAt: receipt.occurredAt,
        },
      });

      // Moving average: existing stock at its carrying cost plus the new receipt at the purchase rate.
      const onHand = Math.max(0, num(material.quantity));
      const averageCost = onHand > 0
        ? (onHand * num(material.unitCost) + line.quantity * line.unitCost) / (onHand + line.quantity)
        : line.unitCost;
      await tx.material.update({
        where: { id: material.id },
        data: {
          unitCost: roundMoney(averageCost),
          incoming: roundQuantity(Math.max(0, num(material.incoming) - line.quantity)),
        },
      });
      await this.changeMaterialTotal(tx, {
        organizationId: receipt.organizationId,
        materialId: material.id,
        delta: line.quantity,
        type: MaterialMovementType.INBOUND,
        reference: receipt.reference,
        note: receipt.note,
        projectId: receipt.projectId,
        occurredAt: receipt.occurredAt,
      });
    }
  }

  /** Keeps the organization-wide material total in step with a warehouse-level change. */
  async changeMaterialTotal(tx: Prisma.TransactionClient, change: MaterialTotalChange): Promise<void> {
    if (change.delta === 0) return;
    await tx.material.update({ where: { id: change.materialId }, data: { quantity: { increment: change.delta } } });
    await tx.materialMovement.create({
      data: {
        materialId: change.materialId,
        type: change.type,
        // Movements record magnitude; the type says which way stock moved.
        quantity: Math.abs(change.delta),
        reference: change.reference,
        note: change.note ?? null,
        projectId: change.projectId ?? null,
        organizationId: change.organizationId,
        occurredAt: change.occurredAt ?? new Date(),
      },
    });
  }
}
