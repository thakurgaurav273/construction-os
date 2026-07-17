import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { subDays } from 'date-fns';
import { PrismaService } from '../../database/prisma.service';
import { deriveInventoryStatus, num, round2 } from './inventory.helpers';

const CARD_INCLUDE = {
  project: { select: { id: true, name: true } },
  items: {
    select: {
      quantity: true,
      reserved: true,
      damaged: true,
      reorderLevel: true,
      material: { select: { unitCost: true } },
    },
  },
  _count: { select: { locations: true } },
} satisfies Prisma.WarehouseInclude;

type WarehouseCard = Prisma.WarehouseGetPayload<{ include: typeof CARD_INCLUDE }>;

@Injectable()
export class InventoryWarehousesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string) {
    const warehouses = await this.prisma.warehouse.findMany({
      where: { organizationId, deletedAt: null },
      include: CARD_INCLUDE,
      orderBy: { name: 'asc' },
    });

    const since = subDays(new Date(), 7);
    const activity = await this.prisma.inventoryTransaction.groupBy({
      by: ['warehouseId'],
      where: { organizationId, occurredAt: { gte: since } },
      _count: { _all: true },
    });
    const activityMap = new Map(activity.map((a) => [a.warehouseId, a._count._all]));

    return warehouses.map((w) => this.mapCard(w, activityMap.get(w.id) ?? 0));
  }

  private mapCard(w: WarehouseCard, recentActivity: number) {
    let inventoryValue = 0;
    let totalQuantity = 0;
    let reservedValue = 0;
    let lowStockCount = 0;

    for (const item of w.items) {
      const quantity = num(item.quantity);
      const reserved = num(item.reserved);
      const damaged = num(item.damaged);
      const reorderLevel = num(item.reorderLevel);
      const unitCost = num(item.material.unitCost);
      const available = Math.max(0, quantity - reserved - damaged);
      inventoryValue += quantity * unitCost;
      reservedValue += reserved * unitCost;
      totalQuantity += quantity;
      const status = deriveInventoryStatus(available, reorderLevel);
      if (status === 'LOW_STOCK' || status === 'OUT_OF_STOCK') lowStockCount += 1;
    }

    const capacity = w.capacity == null ? null : num(w.capacity);
    const utilization = capacity && capacity > 0 ? Math.min(100, round2((totalQuantity / capacity) * 100)) : null;

    return {
      id: w.id,
      name: w.name,
      code: w.code,
      type: w.type,
      city: w.city,
      manager: w.manager,
      projectId: w.projectId,
      projectName: w.project?.name ?? null,
      capacity,
      itemCount: w.items.length,
      locationCount: w._count.locations,
      totalQuantity: round2(totalQuantity),
      inventoryValue: round2(inventoryValue),
      reservedValue: round2(reservedValue),
      lowStockCount,
      utilization,
      recentActivity,
    };
  }

  async findOne(id: string, organizationId: string) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        project: { select: { id: true, name: true } },
        locations: { orderBy: { code: 'asc' } },
        items: {
          include: {
            material: { select: { id: true, name: true, sku: true, unit: true, unitCost: true } },
          },
        },
      },
    });
    if (!warehouse) throw new NotFoundException('Warehouse not found');

    const transactions = await this.prisma.inventoryTransaction.findMany({
      where: { organizationId, warehouseId: id },
      orderBy: { occurredAt: 'desc' },
      take: 40,
      include: { material: { select: { id: true, name: true, unit: true } } },
    });

    const INBOUND_TYPES = new Set(['RECEIVE', 'TRANSFER_IN', 'RETURN']);
    const inbound = transactions.filter((t) => INBOUND_TYPES.has(t.type)).slice(0, 12);
    const outbound = transactions.filter((t) => !INBOUND_TYPES.has(t.type)).slice(0, 12);

    let inventoryValue = 0;
    let reservedValue = 0;
    let totalQuantity = 0;
    let lowStockCount = 0;
    const items = warehouse.items.map((item) => {
      const quantity = num(item.quantity);
      const reserved = num(item.reserved);
      const damaged = num(item.damaged);
      const reorderLevel = num(item.reorderLevel);
      const unitCost = num(item.material.unitCost);
      const available = Math.max(0, quantity - reserved - damaged);
      const status = deriveInventoryStatus(available, reorderLevel);
      inventoryValue += quantity * unitCost;
      reservedValue += reserved * unitCost;
      totalQuantity += quantity;
      if (status === 'LOW_STOCK' || status === 'OUT_OF_STOCK') lowStockCount += 1;
      return {
        id: item.id,
        materialId: item.materialId,
        materialName: item.material.name,
        sku: item.material.sku,
        unit: item.material.unit,
        quantity,
        reserved,
        damaged,
        available,
        reorderLevel,
        value: round2(quantity * unitCost),
        status,
      };
    });

    const capacity = warehouse.capacity == null ? null : num(warehouse.capacity);
    const utilization = capacity && capacity > 0 ? Math.min(100, round2((totalQuantity / capacity) * 100)) : null;

    const mapTx = (t: (typeof transactions)[number]) => ({
      id: t.id,
      type: t.type,
      materialName: t.material.name,
      unit: t.material.unit,
      quantity: num(t.quantity),
      reference: t.reference,
      occurredAt: t.occurredAt,
    });

    return {
      id: warehouse.id,
      name: warehouse.name,
      code: warehouse.code,
      type: warehouse.type,
      address: warehouse.address,
      city: warehouse.city,
      manager: warehouse.manager,
      capacity,
      projectId: warehouse.projectId,
      projectName: warehouse.project?.name ?? null,
      locations: warehouse.locations.map((l) => ({ id: l.id, name: l.name, code: l.code, zone: l.zone })),
      items,
      inbound: inbound.map(mapTx),
      outbound: outbound.map(mapTx),
      kpis: {
        itemCount: items.length,
        totalQuantity: round2(totalQuantity),
        inventoryValue: round2(inventoryValue),
        reservedValue: round2(reservedValue),
        lowStockCount,
        utilization,
      },
    };
  }
}
