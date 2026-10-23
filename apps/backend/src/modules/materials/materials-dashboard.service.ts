import { Injectable } from '@nestjs/common';
import { format, startOfDay, subDays } from 'date-fns';
import { PrismaService } from '../../database/prisma.service';
import { MATERIAL_LIST_INCLUDE, num, toMaterialView } from './material.mapper';

@Injectable()
export class MaterialsDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(organizationId: string) {
    const [materials, movements, suppliers] = await Promise.all([
      this.prisma.material.findMany({ where: { organizationId, deletedAt: null }, include: MATERIAL_LIST_INCLUDE }),
      this.prisma.materialMovement.findMany({
        where: { organizationId, occurredAt: { gte: subDays(new Date(), 7) } },
        include: { material: { select: { unitCost: true } } },
      }),
      this.prisma.materialSupplier.findMany({ where: { organizationId }, select: { name: true, totalSpend: true } }),
    ]);

    const mapped = materials.map((m) => toMaterialView(m));
    const inventoryValue = mapped.reduce((sum, m) => sum + m.stockValue, 0);
    const lowStock = mapped.filter((m) => m.status === 'LOW_STOCK' || m.status === 'OUT_OF_STOCK');
    const reservedValue = mapped.reduce((sum, m) => sum + m.reserved * m.unitCost, 0);
    const pendingDeliveries = mapped.filter((m) => m.incoming > 0);

    const today = startOfDay(new Date());
    const todaysConsumption = movements
      .filter((mv) => (mv.type === 'CONSUMPTION' || mv.type === 'OUTBOUND') && mv.occurredAt >= today)
      .reduce((sum, mv) => sum + num(mv.quantity) * num(mv.material.unitCost), 0);

    const catMap = new Map<string, { count: number; value: number }>();
    for (const m of mapped) {
      const key = m.categoryName ?? 'Uncategorised';
      const c = catMap.get(key) ?? { count: 0, value: 0 };
      c.count += 1;
      c.value += m.stockValue;
      catMap.set(key, c);
    }
    const categorySplit = Array.from(catMap.entries()).map(([name, v]) => ({ name, count: v.count, value: Math.round(v.value) }));

    const days = Array.from({ length: 7 }, (_, i) => startOfDay(subDays(new Date(), 6 - i)));
    const consumptionTrend = days.map((d) => {
      const dayMoves = movements.filter((mv) => startOfDay(mv.occurredAt).getTime() === d.getTime());
      const inbound = dayMoves
        .filter((mv) => mv.type === 'INBOUND')
        .reduce((s, mv) => s + num(mv.quantity) * num(mv.material.unitCost), 0);
      const outbound = dayMoves
        .filter((mv) => mv.type === 'OUTBOUND' || mv.type === 'CONSUMPTION')
        .reduce((s, mv) => s + num(mv.quantity) * num(mv.material.unitCost), 0);
      return { day: format(d, 'EEE'), inbound: Math.round(inbound), outbound: Math.round(outbound) };
    });

    const supplierSpend = suppliers
      .map((s) => ({ name: s.name, spend: num(s.totalSpend) }))
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 6);

    const deadStock = mapped
      .filter((m) => m.status === 'OVERSTOCKED')
      .map((m) => ({ id: m.id, name: m.name, quantity: m.quantity, unit: m.unit, stockValue: Math.round(m.stockValue) }));

    return {
      kpis: {
        totalMaterials: mapped.length,
        inventoryValue: Math.round(inventoryValue),
        lowStockCount: lowStock.length,
        reservedValue: Math.round(reservedValue),
        todaysConsumption: Math.round(todaysConsumption),
        pendingDeliveries: pendingDeliveries.length,
      },
      categorySplit,
      consumptionTrend,
      supplierSpend,
      lowStock: lowStock.map((m) => ({ id: m.id, name: m.name, available: m.available, minStock: m.minStock, unit: m.unit, status: m.status })),
      deadStock,
    };
  }
}
