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

export interface SiteStockMovement {
  organizationId: string;
  warehouseId: string;
  materialId: string;
  projectId: string;
  quantity: number;
  /** Issue or return note number, e.g. MIN-0004. */
  reference: string;
  note: string;
  occurredAt: Date;
}

export interface StoreTransfer {
  organizationId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  materialId: string;
  quantity: number;
  /** Transfer code, e.g. TRF-0003. */
  reference: string;
  transferId: string;
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

  /**
   * Stock leaving a store for a project site. It is charged to the project as consumed. Fails without
   * changing anything if the store doesn't have enough unreserved stock, even under concurrent issues.
   */
  async issueToProject(tx: Prisma.TransactionClient, movement: SiteStockMovement): Promise<void> {
    const itemId = await this.takeFromStore(tx, movement.organizationId, movement.warehouseId, movement.materialId, movement.quantity);
    await this.recordSiteMovement(tx, itemId, movement, InventoryTransactionType.ISSUE);
    await tx.materialProjectUsage.upsert({
      where: { materialId_projectId: { materialId: movement.materialId, projectId: movement.projectId } },
      create: {
        materialId: movement.materialId,
        projectId: movement.projectId,
        organizationId: movement.organizationId,
        consumed: movement.quantity,
      },
      update: { consumed: { increment: movement.quantity } },
    });
    await this.changeMaterialTotal(tx, {
      organizationId: movement.organizationId,
      materialId: movement.materialId,
      delta: -movement.quantity,
      type: MaterialMovementType.CONSUMPTION,
      reference: movement.reference,
      note: movement.note,
      projectId: movement.projectId,
      occurredAt: movement.occurredAt,
    });
  }

  /** Unused stock coming back from a site. A project can't return more than it has been issued. */
  async returnFromProject(tx: Prisma.TransactionClient, movement: SiteStockMovement): Promise<void> {
    const { count } = await tx.materialProjectUsage.updateMany({
      where: {
        materialId: movement.materialId,
        projectId: movement.projectId,
        organizationId: movement.organizationId,
        consumed: { gte: movement.quantity },
      },
      data: { consumed: { decrement: movement.quantity } },
    });
    if (count === 0) throw new BadRequestException("You can't return more than was issued to this project.");

    const item = await tx.inventoryItem.upsert({
      where: { materialId_warehouseId: { materialId: movement.materialId, warehouseId: movement.warehouseId } },
      create: {
        materialId: movement.materialId,
        warehouseId: movement.warehouseId,
        organizationId: movement.organizationId,
        quantity: movement.quantity,
      },
      update: { quantity: { increment: movement.quantity } },
      select: { id: true },
    });

    await this.recordSiteMovement(tx, item.id, movement, InventoryTransactionType.RETURN);
    await this.changeMaterialTotal(tx, {
      organizationId: movement.organizationId,
      materialId: movement.materialId,
      delta: movement.quantity,
      type: MaterialMovementType.INBOUND,
      reference: movement.reference,
      note: movement.note,
      projectId: movement.projectId,
      occurredAt: movement.occurredAt,
    });
  }

  /**
   * Moves stock between two stores. The organization-wide material total is unchanged, so only the
   * store levels and their TRANSFER_OUT / TRANSFER_IN history are written.
   */
  async transferBetweenStores(tx: Prisma.TransactionClient, transfer: StoreTransfer): Promise<void> {
    const originItemId = await this.takeFromStore(
      tx, transfer.organizationId, transfer.fromWarehouseId, transfer.materialId, transfer.quantity,
    );
    const origin = await tx.inventoryItem.findUniqueOrThrow({ where: { id: originItemId }, select: { reorderLevel: true } });
    const destination = await tx.inventoryItem.upsert({
      where: { materialId_warehouseId: { materialId: transfer.materialId, warehouseId: transfer.toWarehouseId } },
      create: {
        materialId: transfer.materialId,
        warehouseId: transfer.toWarehouseId,
        organizationId: transfer.organizationId,
        quantity: transfer.quantity,
        reorderLevel: origin.reorderLevel,
      },
      update: { quantity: { increment: transfer.quantity } },
      select: { id: true },
    });
    const material = await tx.material.findUniqueOrThrow({ where: { id: transfer.materialId }, select: { unitCost: true } });
    const shared = {
      quantity: transfer.quantity,
      unitCost: material.unitCost,
      reference: transfer.reference,
      materialId: transfer.materialId,
      transferId: transfer.transferId,
      organizationId: transfer.organizationId,
    };
    await tx.inventoryTransaction.createMany({
      data: [
        {
          ...shared,
          type: InventoryTransactionType.TRANSFER_OUT,
          note: `Transfer ${transfer.reference} out`,
          inventoryItemId: originItemId,
          warehouseId: transfer.fromWarehouseId,
        },
        {
          ...shared,
          type: InventoryTransactionType.TRANSFER_IN,
          note: `Transfer ${transfer.reference} in`,
          inventoryItemId: destination.id,
          warehouseId: transfer.toWarehouseId,
        },
      ],
    });
  }

  /**
   * Takes stock out of a store, failing without changing anything if the store doesn't have enough
   * unreserved stock. The availability check and the decrement are one statement, so concurrent
   * issues or transfers can't both spend the same stock. Returns the store item's id.
   */
  private async takeFromStore(
    tx: Prisma.TransactionClient,
    organizationId: string,
    warehouseId: string,
    materialId: string,
    quantity: number,
  ): Promise<string> {
    const item = await tx.inventoryItem.findUnique({
      where: { materialId_warehouseId: { materialId, warehouseId } },
      select: { id: true, organizationId: true, material: { select: { name: true, unit: true } } },
    });
    if (!item || item.organizationId !== organizationId) {
      throw new BadRequestException('This store holds no stock of the material.');
    }

    const amount = new Prisma.Decimal(quantity);
    const updated = await tx.$executeRaw`
      UPDATE "inventory_items"
      SET "quantity" = "quantity" - ${amount}, "updatedAt" = NOW()
      WHERE "id" = ${item.id} AND "quantity" - "reserved" >= ${amount}`;
    if (updated === 0) {
      const current = await tx.inventoryItem.findUniqueOrThrow({ where: { id: item.id }, select: { quantity: true, reserved: true } });
      const available = roundQuantity(Math.max(0, num(current.quantity) - num(current.reserved)));
      throw new BadRequestException(`Only ${available} ${item.material.unit} of ${item.material.name} available at this store.`);
    }
    return item.id;
  }

  private async recordSiteMovement(
    tx: Prisma.TransactionClient,
    inventoryItemId: string,
    movement: SiteStockMovement,
    type: InventoryTransactionType,
  ): Promise<void> {
    const material = await tx.material.findUniqueOrThrow({ where: { id: movement.materialId }, select: { unitCost: true } });
    await tx.inventoryTransaction.create({
      data: {
        type,
        quantity: movement.quantity,
        unitCost: material.unitCost,
        reference: movement.reference,
        note: movement.note,
        inventoryItemId,
        materialId: movement.materialId,
        warehouseId: movement.warehouseId,
        projectId: movement.projectId,
        organizationId: movement.organizationId,
        occurredAt: movement.occurredAt,
      },
    });
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
