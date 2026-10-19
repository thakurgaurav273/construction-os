import { Injectable, NotFoundException } from '@nestjs/common';
import { PurchaseOrderStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { num } from './inventory.helpers';

/** Orders that will still bring stock in: committed (approved) or on their way to approval. */
const OPEN_ORDER_STATUSES: PurchaseOrderStatus[] = ['DRAFT', 'PENDING', 'CHANGES_REQUESTED', 'APPROVED'];

export interface ReorderSuggestion {
  /** unitCost is the current carrying cost, used as the rate when the material has never been bought on a PO. */
  material: { id: string; name: string; sku: string; unit: string; unitCost: number };
  warehouse: { id: string; name: string; projectId: string | null } | null;
  available: number;
  reorderLevel: number;
  /** Stock level a reorder should restore. */
  targetLevel: number;
  /** Ordered on approved POs but not yet received. */
  onOrder: number;
  /** On draft or pending POs, not yet approved. */
  inApproval: number;
  suggestedQuantity: number;
  lastPurchase: {
    poNumber: string;
    date: Date;
    vendor: { id: string; name: string } | null;
    rate: number;
    taxPercent: number;
    category: string;
  } | null;
  projectId: string | null;
  deliveryAddress: string;
  category: string;
}

const roundUp = (value: number): number => Math.ceil(Math.max(0, value) - 1e-9);

/**
 * How much to reorder: enough to bring available stock back to twice the reorder level (or the material's
 * maximum, when one is set), minus what is already on order so the same shortage isn't bought twice.
 * Rate and vendor come from the last approved purchase of the material.
 */
@Injectable()
export class InventoryReorderService {
  constructor(private readonly prisma: PrismaService) {}

  async suggest(organizationId: string, materialId: string, warehouseId?: string): Promise<ReorderSuggestion> {
    const material = await this.prisma.material.findFirst({
      where: { id: materialId, organizationId, deletedAt: null },
      include: { category: { select: { name: true } } },
    });
    if (!material) throw new NotFoundException('Material not found.');

    const warehouse = warehouseId
      ? await this.prisma.warehouse.findFirst({ where: { id: warehouseId, organizationId, deletedAt: null } })
      : null;
    if (warehouseId && !warehouse) throw new NotFoundException('Store not found.');

    let available: number;
    let reorderLevel: number;
    let targetLevel: number;
    if (warehouse) {
      const item = await this.prisma.inventoryItem.findUnique({
        where: { materialId_warehouseId: { materialId, warehouseId: warehouse.id } },
      });
      available = item ? Math.max(0, num(item.quantity) - num(item.reserved) - num(item.damaged)) : 0;
      reorderLevel = item ? num(item.reorderLevel) : 0;
      targetLevel = reorderLevel * 2;
    } else {
      available = Math.max(0, num(material.quantity) - num(material.reserved));
      reorderLevel = num(material.minStock);
      targetLevel = material.maxStock ? num(material.maxStock) : reorderLevel * 2;
    }

    // A site store is fed by its project's orders; a central store (or the whole organization) by all orders.
    const projectScope = warehouse?.projectId ? { projectId: warehouse.projectId } : {};
    const [openLines, lastLine] = await Promise.all([
      this.prisma.poLineItem.findMany({
        where: { materialId, purchaseOrder: { organizationId, status: { in: OPEN_ORDER_STATUSES }, ...projectScope } },
        select: { quantity: true, receivedQuantity: true, purchaseOrder: { select: { status: true } } },
      }),
      this.prisma.poLineItem.findFirst({
        where: { materialId, purchaseOrder: { organizationId, status: 'APPROVED' } },
        orderBy: { purchaseOrder: { requestedDate: 'desc' } },
        include: {
          purchaseOrder: {
            select: {
              poNumber: true, requestedDate: true, category: true,
              vendor: { select: { id: true, name: true, status: true } },
            },
          },
        },
      }),
    ]);

    const outstanding = (status: 'approved' | 'other'): number => openLines
      .filter((line) => (line.purchaseOrder.status === 'APPROVED') === (status === 'approved'))
      .reduce((sum, line) => sum + Math.max(0, num(line.quantity) - num(line.receivedQuantity)), 0);
    const onOrder = outstanding('approved');
    const inApproval = outstanding('other');

    const lastPurchase = lastLine ? {
      poNumber: lastLine.purchaseOrder.poNumber,
      date: lastLine.purchaseOrder.requestedDate,
      // Inactive vendors can't take new orders, so don't suggest them.
      vendor: lastLine.purchaseOrder.vendor?.status === 'ACTIVE'
        ? { id: lastLine.purchaseOrder.vendor.id, name: lastLine.purchaseOrder.vendor.name }
        : null,
      rate: Math.round(num(lastLine.rate) * (1 - lastLine.discountPercent / 100) * 100) / 100,
      taxPercent: lastLine.taxPercent,
      category: lastLine.purchaseOrder.category,
    } : null;

    return {
      material: { id: material.id, name: material.name, sku: material.sku, unit: material.unit, unitCost: num(material.unitCost) },
      warehouse: warehouse ? { id: warehouse.id, name: warehouse.name, projectId: warehouse.projectId } : null,
      available,
      reorderLevel,
      targetLevel,
      onOrder,
      inApproval,
      suggestedQuantity: roundUp(targetLevel - available - onOrder - inApproval),
      lastPurchase,
      // Only a site store implies the project; an organization-wide reorder leaves the choice to the buyer.
      projectId: warehouse?.projectId ?? null,
      deliveryAddress: warehouse ? [warehouse.name, warehouse.address, warehouse.city].filter(Boolean).join(', ') : '',
      category: lastPurchase?.category ?? material.category?.name ?? 'Other',
    };
  }
}
