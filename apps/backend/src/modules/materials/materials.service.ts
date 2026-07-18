import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { subDays, startOfDay, format } from 'date-fns';
import { PrismaService } from '../../database/prisma.service';
import { MaterialQueryDto } from './dto/material-query.dto';
import { MovementQueryDto } from './dto/movement-query.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { CreateMaterialDto } from './dto/create-material.dto';

const LIST_INCLUDE = {
  category: { select: { id: true, name: true } },
  supplier: { select: { id: true, name: true } },
  _count: { select: { usages: true } },
} satisfies Prisma.MaterialInclude;

type MaterialWithRels = Prisma.MaterialGetPayload<{ include: typeof LIST_INCLUDE }>;

type MaterialStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'OVERSTOCKED';

function num(d: Prisma.Decimal | number | null | undefined): number {
  if (d == null) return 0;
  return typeof d === 'number' ? d : Number(d);
}

function deriveStatus(quantity: number, reserved: number, minStock: number, maxStock: number | null): MaterialStatus {
  const available = quantity - reserved;
  if (quantity <= 0) return 'OUT_OF_STOCK';
  if (available <= minStock) return 'LOW_STOCK';
  if (maxStock != null && quantity > maxStock) return 'OVERSTOCKED';
  return 'IN_STOCK';
}

@Injectable()
export class MaterialsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateMaterialDto) {
    const material = await this.prisma.material.create({
      data: {
        ...dto,
        organizationId,
      },
      include: LIST_INCLUDE,
    });
    return {
      message: 'Material created successfully',
      data: this.mapMaterial(material),
    };
  }

  private mapMaterial(m: MaterialWithRels) {
    const quantity = num(m.quantity);
    const reserved = num(m.reserved);
    const incoming = num(m.incoming);
    const minStock = num(m.minStock);
    const maxStock = m.maxStock == null ? null : num(m.maxStock);
    const unitCost = num(m.unitCost);
    const available = quantity - reserved;
    return {
      id: m.id,
      name: m.name,
      sku: m.sku,
      unit: m.unit,
      unitCost,
      quantity,
      reserved,
      incoming,
      available,
      minStock,
      maxStock,
      stockValue: quantity * unitCost,
      status: deriveStatus(quantity, reserved, minStock, maxStock),
      warehouse: m.warehouse,
      imageUrl: m.imageUrl,
      categoryId: m.categoryId,
      categoryName: m.category?.name ?? null,
      supplierId: m.supplierId,
      supplierName: m.supplier?.name ?? null,
      projectCount: m._count.usages,
      updatedAt: m.updatedAt,
      createdAt: m.createdAt,
    };
  }

  async findAll(organizationId: string, query: MaterialQueryDto) {
    const where: Prisma.MaterialWhereInput = { organizationId, deletedAt: null };
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.supplierId) where.supplierId = query.supplierId;
    if (query.projectId) where.usages = { some: { projectId: query.projectId } };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const rows = await this.prisma.material.findMany({
      where,
      include: LIST_INCLUDE,
      orderBy: { name: 'asc' },
    });

    let items = rows.map((m) => this.mapMaterial(m));

    if (query.status) {
      const status = query.status.toUpperCase();
      items = items.filter((m) => m.status === status);
    }
    if (query.lowStock === 'true') {
      items = items.filter((m) => m.status === 'LOW_STOCK' || m.status === 'OUT_OF_STOCK');
    }

    const sortKey = query.sort ?? 'name';
    const dir = query.order === 'desc' ? -1 : 1;
    items.sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortKey];
      const bv = (b as Record<string, unknown>)[sortKey];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });

    const total = items.length;
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const paged = items.slice((page - 1) * limit, page * limit);

    return { items: paged, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, organizationId: string) {
    const material = await this.prisma.material.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        category: { select: { id: true, name: true } },
        supplier: true,
        _count: { select: { usages: true } },
        movements: {
          orderBy: { occurredAt: 'desc' },
          take: 12,
          include: { project: { select: { id: true, name: true } } },
        },
        usages: {
          include: { project: { select: { id: true, name: true, code: true, status: true } } },
        },
      },
    });

    if (!material) throw new NotFoundException('Material not found');

    const base = this.mapMaterial(material as unknown as MaterialWithRels);
    return {
      ...base,
      specifications: material.specifications ?? null,
      supplier: material.supplier
        ? {
            id: material.supplier.id,
            name: material.supplier.name,
            contactName: material.supplier.contactName,
            email: material.supplier.email,
            phone: material.supplier.phone,
            leadTimeDays: material.supplier.leadTimeDays,
            rating: material.supplier.rating,
            onTimeRate: material.supplier.onTimeRate,
          }
        : null,
      movements: material.movements.map((mv) => ({
        id: mv.id,
        type: mv.type.toLowerCase(),
        quantity: num(mv.quantity),
        reference: mv.reference,
        note: mv.note,
        occurredAt: mv.occurredAt,
        project: mv.project,
      })),
      projects: material.usages.map((u) => ({
        projectId: u.projectId,
        projectName: u.project.name,
        projectCode: u.project.code,
        projectStatus: u.project.status,
        allocated: num(u.allocated),
        consumed: num(u.consumed),
      })),
    };
  }

  async getCategories(organizationId: string) {
    const categories = await this.prisma.materialCategory.findMany({
      where: { organizationId },
      include: { _count: { select: { materials: true } } },
      orderBy: { name: 'asc' },
    });
    return categories.map((c) => ({ id: c.id, name: c.name, description: c.description, materialCount: c._count.materials }));
  }

  async getLowStock(organizationId: string) {
    const rows = await this.prisma.material.findMany({
      where: { organizationId, deletedAt: null },
      include: LIST_INCLUDE,
      orderBy: { name: 'asc' },
    });
    return rows
      .map((m) => this.mapMaterial(m))
      .filter((m) => m.status === 'LOW_STOCK' || m.status === 'OUT_OF_STOCK')
      .sort((a, b) => a.available - b.available);
  }

  async getMovements(organizationId: string, query: MovementQueryDto) {
    const where: Prisma.MaterialMovementWhereInput = { organizationId };
    if (query.materialId) where.materialId = query.materialId;
    if (query.projectId) where.projectId = query.projectId;
    if (query.type) where.type = query.type.toUpperCase() as Prisma.MaterialMovementWhereInput['type'];
    if (query.dateFrom || query.dateTo) {
      where.occurredAt = {};
      if (query.dateFrom) where.occurredAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.occurredAt.lte = new Date(query.dateTo);
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [rows, total] = await Promise.all([
      this.prisma.materialMovement.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          material: { select: { id: true, name: true, unit: true } },
          project: { select: { id: true, name: true } },
        },
      }),
      this.prisma.materialMovement.count({ where }),
    ]);

    return {
      items: rows.map((mv) => ({
        id: mv.id,
        type: mv.type.toLowerCase(),
        quantity: num(mv.quantity),
        reference: mv.reference,
        note: mv.note,
        occurredAt: mv.occurredAt,
        material: mv.material,
        project: mv.project,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getSuppliers(organizationId: string) {
    const suppliers = await this.prisma.materialSupplier.findMany({
      where: { organizationId },
      include: {
        _count: { select: { materials: true } },
        materials: { select: { name: true, quantity: true, unitCost: true } },
      },
      orderBy: { name: 'asc' },
    });
    return suppliers.map((s) => ({
      id: s.id,
      name: s.name,
      contactName: s.contactName,
      email: s.email,
      phone: s.phone,
      leadTimeDays: s.leadTimeDays,
      rating: s.rating,
      onTimeRate: s.onTimeRate,
      openPurchaseOrders: s.openPurchaseOrders,
      totalSpend: num(s.totalSpend),
      materialCount: s._count.materials,
      suppliedMaterials: s.materials.map((m) => m.name),
      inventoryValue: s.materials.reduce((sum, m) => sum + num(m.quantity) * num(m.unitCost), 0),
    }));
  }

  async getDashboard(organizationId: string) {
    const [materials, movements, suppliers] = await Promise.all([
      this.prisma.material.findMany({ where: { organizationId, deletedAt: null }, include: LIST_INCLUDE }),
      this.prisma.materialMovement.findMany({
        where: { organizationId, occurredAt: { gte: subDays(new Date(), 7) } },
        include: { material: { select: { unitCost: true } } },
      }),
      this.prisma.materialSupplier.findMany({ where: { organizationId }, select: { name: true, totalSpend: true } }),
    ]);

    const mapped = materials.map((m) => this.mapMaterial(m));
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

  async update(id: string, organizationId: string, dto: UpdateMaterialDto) {
    const existing = await this.prisma.material.findFirst({ where: { id, organizationId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Material not found');

    const updated = await this.prisma.material.update({
      where: { id },
      data: {
        name: dto.name,
        sku: dto.sku,
        unit: dto.unit,
        unitCost: dto.unitCost,
        quantity: dto.quantity,
        reserved: dto.reserved,
        incoming: dto.incoming,
        minStock: dto.minStock,
        maxStock: dto.maxStock,
        warehouse: dto.warehouse,
        imageUrl: dto.imageUrl,
        categoryId: dto.categoryId,
        supplierId: dto.supplierId,
      },
      include: LIST_INCLUDE,
    });

    return this.mapMaterial(updated);
  }
}
