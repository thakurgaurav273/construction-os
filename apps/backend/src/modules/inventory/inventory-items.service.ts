import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { InventoryItemQueryDto } from './dto/inventory-query.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import {
  availableStock,
  deriveInventoryStatus,
  num,
  paginate,
  parseBool,
  round2,
  sortByKey,
} from './inventory.helpers';

const ITEM_INCLUDE = {
  material: {
    select: {
      id: true,
      name: true,
      sku: true,
      unit: true,
      unitCost: true,
      categoryId: true,
      category: { select: { name: true } },
      supplierId: true,
      supplier: { select: { name: true } },
    },
  },
  warehouse: {
    select: { id: true, name: true, type: true, projectId: true, project: { select: { name: true } } },
  },
} satisfies Prisma.InventoryItemInclude;

type ItemWithRels = Prisma.InventoryItemGetPayload<{ include: typeof ITEM_INCLUDE }>;

function mapItem(item: ItemWithRels) {
  const quantity = num(item.quantity);
  const reserved = num(item.reserved);
  const damaged = num(item.damaged);
  const incoming = num(item.incoming);
  const reorderLevel = num(item.reorderLevel);
  const unitCost = num(item.material.unitCost);
  const available = availableStock(quantity, reserved);
  return {
    id: item.id,
    materialId: item.materialId,
    materialName: item.material.name,
    sku: item.material.sku,
    unit: item.material.unit,
    unitCost,
    categoryId: item.material.categoryId,
    categoryName: item.material.category?.name ?? null,
    supplierId: item.material.supplierId,
    supplierName: item.material.supplier?.name ?? null,
    warehouseId: item.warehouseId,
    warehouseName: item.warehouse.name,
    warehouseType: item.warehouse.type,
    projectId: item.warehouse.projectId,
    projectName: item.warehouse.project?.name ?? null,
    quantity,
    reserved,
    damaged,
    incoming,
    available,
    reorderLevel,
    value: round2(quantity * unitCost),
    status: deriveInventoryStatus(available, reorderLevel),
    updatedAt: item.updatedAt,
  };
}

@Injectable()
export class InventoryItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, query: InventoryItemQueryDto) {
    const where: Prisma.InventoryItemWhereInput = { organizationId };
    if (query.warehouseId) where.warehouseId = query.warehouseId;
    if (query.materialId) where.materialId = query.materialId;
    if (query.projectId) where.warehouse = { projectId: query.projectId };

    const materialFilter: Prisma.MaterialWhereInput = { deletedAt: null };
    if (query.categoryId) materialFilter.categoryId = query.categoryId;
    if (query.search) {
      materialFilter.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    where.material = materialFilter;

    const rows = await this.prisma.inventoryItem.findMany({ where, include: ITEM_INCLUDE });
    let items = rows.map(mapItem);

    if (query.status) {
      const status = query.status.toUpperCase();
      items = items.filter((i) => i.status === status);
    }
    if (parseBool(query.lowStock)) {
      items = items.filter((i) => i.status === 'LOW_STOCK' || i.status === 'OUT_OF_STOCK');
    }
    if (parseBool(query.reserved)) {
      items = items.filter((i) => i.reserved > 0);
    }

    const sorted = sortByKey(
      items as unknown as Record<string, unknown>[],
      query.sort ?? 'materialName',
      query.order,
    ) as unknown as typeof items;

    return paginate(sorted, query.page, query.limit);
  }

  async findOne(id: string, organizationId: string) {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id, organizationId },
      include: {
        material: {
          include: {
            category: { select: { id: true, name: true } },
            supplier: {
              select: {
                id: true,
                name: true,
                contactName: true,
                email: true,
                phone: true,
                leadTimeDays: true,
                rating: true,
                onTimeRate: true,
                openPurchaseOrders: true,
              },
            },
          },
        },
        warehouse: { select: { id: true, name: true, type: true, city: true, projectId: true } },
        location: { select: { id: true, name: true, code: true, zone: true } },
      },
    });
    if (!item) throw new NotFoundException('Inventory item not found');

    const [transactions, reservations, consumptionRows] = await Promise.all([
      this.prisma.inventoryTransaction.findMany({
        where: { organizationId, materialId: item.materialId, warehouseId: item.warehouseId },
        orderBy: { occurredAt: 'desc' },
        take: 25,
        include: { project: { select: { id: true, name: true } } },
      }),
      this.prisma.stockReservation.findMany({
        where: { organizationId, inventoryItemId: item.id, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
        include: { project: { select: { id: true, name: true } } },
      }),
      this.prisma.inventoryTransaction.findMany({
        where: {
          organizationId,
          materialId: item.materialId,
          warehouseId: item.warehouseId,
          type: { in: ['CONSUMPTION', 'ISSUE'] },
        },
        include: { project: { select: { id: true, name: true } } },
      }),
    ]);

    const quantity = num(item.quantity);
    const reserved = num(item.reserved);
    const damaged = num(item.damaged);
    const unitCost = num(item.material.unitCost);
    const reorderLevel = num(item.reorderLevel);
    const available = availableStock(quantity, reserved);

    const consumptionByProject = new Map<string, { projectId: string; projectName: string; quantity: number }>();
    for (const row of consumptionRows) {
      const key = row.projectId ?? 'unassigned';
      const name = row.project?.name ?? 'Unassigned';
      const entry = consumptionByProject.get(key) ?? { projectId: key, projectName: name, quantity: 0 };
      entry.quantity += num(row.quantity);
      consumptionByProject.set(key, entry);
    }

    const purchaseOrders = transactions
      .filter((t) => t.type === 'RECEIVE' && t.reference)
      .map((t) => ({
        reference: t.reference as string,
        quantity: num(t.quantity),
        unitCost: num(t.unitCost),
        occurredAt: t.occurredAt,
      }));

    return {
      id: item.id,
      materialId: item.materialId,
      materialName: item.material.name,
      sku: item.material.sku,
      unit: item.material.unit,
      unitCost,
      quantity,
      reserved,
      damaged,
      incoming: num(item.incoming),
      available,
      reorderLevel,
      value: round2(quantity * unitCost),
      status: deriveInventoryStatus(available, reorderLevel),
      warehouse: item.warehouse,
      location: item.location,
      category: item.material.category,
      supplier: item.material.supplier
        ? {
            ...item.material.supplier,
            rating: num(item.material.supplier.rating),
            onTimeRate: num(item.material.supplier.onTimeRate),
          }
        : null,
      transactions: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        quantity: num(t.quantity),
        reference: t.reference,
        note: t.note,
        project: t.project,
        occurredAt: t.occurredAt,
      })),
      reservations: reservations.map((r) => ({
        id: r.id,
        quantity: num(r.quantity),
        status: r.status,
        note: r.note,
        project: r.project,
        createdAt: r.createdAt,
      })),
      purchaseOrders,
      consumption: Array.from(consumptionByProject.values())
        .map((c) => ({ ...c, quantity: round2(c.quantity) }))
        .sort((a, b) => b.quantity - a.quantity),
      updatedAt: item.updatedAt,
    };
  }

  async update(id: string, organizationId: string, dto: UpdateInventoryItemDto) {
    const existing = await this.prisma.inventoryItem.findFirst({ where: { id, organizationId } });
    if (!existing) throw new NotFoundException('Inventory item not found');
    if (dto.locationId) {
      const location = await this.prisma.warehouseLocation.findFirst({
        where: { id: dto.locationId, warehouseId: existing.warehouseId, organizationId },
        select: { id: true },
      });
      if (!location) throw new BadRequestException('Choose a bin location in the same store.');
    }

    const updated = await this.prisma.inventoryItem.update({
      where: { id },
      data: { reorderLevel: dto.reorderLevel, locationId: dto.locationId },
      include: ITEM_INCLUDE,
    });
    return mapItem(updated);
  }
}
