import { Injectable } from '@nestjs/common';
import { differenceInDays, format, startOfDay, startOfMonth, subDays, subMonths } from 'date-fns';
import { PrismaService } from '../../database/prisma.service';
import { availableStock, deriveInventoryStatus, num, round2 } from './inventory.helpers';

const INBOUND_TYPES = new Set(['RECEIVE', 'TRANSFER_IN', 'RETURN']);
const OUTBOUND_TYPES = new Set(['ISSUE', 'CONSUMPTION', 'TRANSFER_OUT', 'DAMAGE']);
const CONSUMPTION_TYPES = new Set(['CONSUMPTION', 'ISSUE']);

@Injectable()
export class InventoryDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(organizationId: string) {
    const trendStart = subDays(startOfDay(new Date()), 6);

    const [items, pendingTransfers, audits, movements] = await Promise.all([
      this.prisma.inventoryItem.findMany({
        where: { organizationId },
        include: {
          material: {
            select: { name: true, unit: true, unitCost: true, category: { select: { name: true } } },
          },
          warehouse: { select: { id: true, name: true, capacity: true } },
        },
      }),
      this.prisma.stockTransfer.count({
        where: { organizationId, status: { in: ['PENDING', 'APPROVED', 'IN_TRANSIT'] } },
      }),
      this.prisma.inventoryAudit.findMany({
        where: { organizationId },
        select: { accuracy: true },
        orderBy: { createdAt: 'desc' },
        take: 24,
      }),
      this.prisma.inventoryTransaction.findMany({
        where: { organizationId, occurredAt: { gte: trendStart } },
        select: { type: true, quantity: true, occurredAt: true },
      }),
    ]);

    let inventoryValue = 0;
    let totalAvailable = 0;
    let reservedValue = 0;
    let lowStockCount = 0;
    const valueByWarehouse = new Map<
      string,
      { name: string; value: number; quantity: number; capacity: number | null }
    >();
    const categorySplit = new Map<string, { name: string; value: number; count: number }>();
    const lowStock: {
      id: string;
      materialName: string;
      warehouseName: string;
      available: number;
      reorderLevel: number;
      unit: string;
      status: string;
    }[] = [];

    for (const item of items) {
      const quantity = num(item.quantity);
      const reserved = num(item.reserved);
      const reorderLevel = num(item.reorderLevel);
      const unitCost = num(item.material.unitCost);
      const available = availableStock(quantity, reserved);
      const value = quantity * unitCost;
      const status = deriveInventoryStatus(available, reorderLevel);

      inventoryValue += value;
      totalAvailable += available;
      reservedValue += reserved * unitCost;

      const wh = valueByWarehouse.get(item.warehouse.id) ?? {
        name: item.warehouse.name,
        value: 0,
        quantity: 0,
        capacity: item.warehouse.capacity == null ? null : num(item.warehouse.capacity),
      };
      wh.value += value;
      wh.quantity += quantity;
      valueByWarehouse.set(item.warehouse.id, wh);

      const catName = item.material.category?.name ?? 'Uncategorized';
      const cat = categorySplit.get(catName) ?? { name: catName, value: 0, count: 0 };
      cat.value += value;
      cat.count += 1;
      categorySplit.set(catName, cat);

      if (status === 'LOW_STOCK' || status === 'OUT_OF_STOCK') {
        lowStockCount += 1;
        lowStock.push({
          id: item.id,
          materialName: item.material.name,
          warehouseName: item.warehouse.name,
          available,
          reorderLevel,
          unit: item.material.unit,
          status,
        });
      }
    }

    const trend = this.buildDailyTrend(movements);
    const stockAccuracy =
      audits.length > 0 ? round2(audits.reduce((sum, a) => sum + a.accuracy, 0) / audits.length) : 100;

    return {
      kpis: {
        inventoryValue: round2(inventoryValue),
        availableStock: round2(totalAvailable),
        reservedValue: round2(reservedValue),
        lowStockItems: lowStockCount,
        pendingTransfers,
        stockAccuracy,
      },
      valueByWarehouse: Array.from(valueByWarehouse.values())
        .map((w) => ({ name: w.name, value: round2(w.value) }))
        .sort((a, b) => b.value - a.value),
      warehouseUtilization: Array.from(valueByWarehouse.values())
        .map((w) => ({
          name: w.name,
          utilization: w.capacity && w.capacity > 0 ? Math.min(100, round2((w.quantity / w.capacity) * 100)) : 0,
        }))
        .sort((a, b) => b.utilization - a.utilization),
      categorySplit: Array.from(categorySplit.values())
        .map((c) => ({ ...c, value: round2(c.value) }))
        .sort((a, b) => b.value - a.value),
      movementTrend: trend,
      lowStock: lowStock
        .sort((a, b) => a.available - a.reorderLevel - (b.available - b.reorderLevel))
        .slice(0, 8),
    };
  }

  private buildDailyTrend(movements: { type: string; quantity: unknown; occurredAt: Date }[]) {
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(startOfDay(new Date()), 6 - i);
      return { key: format(date, 'yyyy-MM-dd'), day: format(date, 'EEE'), inbound: 0, outbound: 0 };
    });
    const byKey = new Map(days.map((d) => [d.key, d]));
    for (const m of movements) {
      const key = format(startOfDay(new Date(m.occurredAt)), 'yyyy-MM-dd');
      const bucket = byKey.get(key);
      if (!bucket) continue;
      const qty = Math.abs(num(m.quantity as number));
      if (INBOUND_TYPES.has(m.type)) bucket.inbound += qty;
      else if (OUTBOUND_TYPES.has(m.type)) bucket.outbound += qty;
    }
    return days.map((d) => ({ day: d.day, inbound: round2(d.inbound), outbound: round2(d.outbound) }));
  }

  async getAnalytics(organizationId: string) {
    const windowStart = startOfMonth(subMonths(new Date(), 5));
    const ninetyDaysAgo = subDays(new Date(), 90);

    const [items, transactions] = await Promise.all([
      this.prisma.inventoryItem.findMany({
        where: { organizationId },
        include: {
          material: { select: { id: true, name: true, unit: true, unitCost: true } },
          warehouse: { select: { id: true, name: true, capacity: true } },
        },
      }),
      this.prisma.inventoryTransaction.findMany({
        where: { organizationId, occurredAt: { gte: windowStart } },
        select: { type: true, quantity: true, occurredAt: true, materialId: true },
      }),
    ]);

    const warehouses = new Map<
      string,
      { name: string; value: number; quantity: number; capacity: number | null }
    >();
    const aging = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    const now = new Date();

    for (const item of items) {
      const quantity = num(item.quantity);
      const unitCost = num(item.material.unitCost);
      const value = quantity * unitCost;
      const wh = warehouses.get(item.warehouse.id) ?? {
        name: item.warehouse.name,
        value: 0,
        quantity: 0,
        capacity: item.warehouse.capacity == null ? null : num(item.warehouse.capacity),
      };
      wh.value += value;
      wh.quantity += quantity;
      warehouses.set(item.warehouse.id, wh);

      const ageDays = differenceInDays(now, new Date(item.updatedAt));
      if (ageDays <= 30) aging['0-30'] += value;
      else if (ageDays <= 60) aging['31-60'] += value;
      else if (ageDays <= 90) aging['61-90'] += value;
      else aging['90+'] += value;
    }

    const materialName = new Map<string, string>();
    const materialUnit = new Map<string, string>();
    for (const item of items) {
      materialName.set(item.materialId, item.material.name);
      materialUnit.set(item.materialId, item.material.unit);
    }

    const movementByMaterial = new Map<string, number>();
    const recentlyMovedMaterials = new Set<string>();
    const monthly = new Map<string, { month: string; consumption: number; transfers: number }>();
    for (let i = 5; i >= 0; i -= 1) {
      const d = subMonths(new Date(), i);
      monthly.set(format(d, 'yyyy-MM'), { month: format(d, 'MMM'), consumption: 0, transfers: 0 });
    }

    for (const t of transactions) {
      const qty = Math.abs(num(t.quantity as unknown as number));
      const bucket = monthly.get(format(new Date(t.occurredAt), 'yyyy-MM'));
      if (OUTBOUND_TYPES.has(t.type)) {
        movementByMaterial.set(t.materialId, (movementByMaterial.get(t.materialId) ?? 0) + qty);
        if (new Date(t.occurredAt) >= ninetyDaysAgo) recentlyMovedMaterials.add(t.materialId);
      }
      if (bucket) {
        if (CONSUMPTION_TYPES.has(t.type)) bucket.consumption += qty;
        if (t.type === 'TRANSFER_OUT') bucket.transfers += qty;
      }
    }

    const movementRanked = Array.from(movementByMaterial.entries())
      .map(([id, movement]) => ({
        name: materialName.get(id) ?? 'Unknown',
        unit: materialUnit.get(id) ?? '',
        movement: round2(movement),
      }))
      .sort((a, b) => b.movement - a.movement);

    const deadStock = items
      .filter((item) => num(item.quantity) > 0 && !recentlyMovedMaterials.has(item.materialId))
      .map((item) => ({
        name: item.material.name,
        unit: item.material.unit,
        quantity: round2(num(item.quantity)),
        value: round2(num(item.quantity) * num(item.material.unitCost)),
        warehouse: item.warehouse.name,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    return {
      valueByWarehouse: Array.from(warehouses.values())
        .map((w) => ({ name: w.name, value: round2(w.value) }))
        .sort((a, b) => b.value - a.value),
      warehouseUtilization: Array.from(warehouses.values())
        .map((w) => ({
          name: w.name,
          utilization: w.capacity && w.capacity > 0 ? Math.min(100, round2((w.quantity / w.capacity) * 100)) : 0,
        }))
        .sort((a, b) => b.utilization - a.utilization),
      stockAging: Object.entries(aging).map(([bucket, value]) => ({ bucket, value: round2(value) })),
      fastMoving: movementRanked.slice(0, 6),
      slowMoving: movementRanked.filter((m) => m.movement > 0).slice(-6).reverse(),
      deadStock,
      monthlyConsumption: Array.from(monthly.values()).map((m) => ({
        month: m.month,
        consumption: round2(m.consumption),
      })),
      transferVolume: Array.from(monthly.values()).map((m) => ({ month: m.month, quantity: round2(m.transfers) })),
    };
  }
}
