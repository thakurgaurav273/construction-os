import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { MaterialQueryDto } from './dto/material-query.dto';
import { MovementQueryDto } from './dto/movement-query.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { CreateMaterialDto } from './dto/create-material.dto';
import {
  MATERIAL_LIST_INCLUDE, MaterialView, MaterialWithRelations, num, toMaterialView,
} from './material.mapper';

const SORTABLE_FIELDS = [
  'name', 'sku', 'unit', 'unitCost', 'quantity', 'available', 'reserved', 'minStock', 'stockValue', 'status', 'categoryName', 'supplierName', 'updatedAt',
] as const satisfies readonly (keyof MaterialView)[];

@Injectable()
export class MaterialsService {
  constructor(private readonly prisma: PrismaService) {}

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
      include: MATERIAL_LIST_INCLUDE,
      orderBy: { name: 'asc' },
    });

    let items = rows.map((m) => toMaterialView(m));

    if (query.status) {
      const status = query.status.toUpperCase();
      items = items.filter((m) => m.status === status);
    }
    if (query.lowStock === 'true') {
      items = items.filter((m) => m.status === 'LOW_STOCK' || m.status === 'OUT_OF_STOCK');
    }

    const sortKey = SORTABLE_FIELDS.find((field) => field === query.sort) ?? 'name';
    const dir = query.order === 'desc' ? -1 : 1;
    items.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
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

    const base = toMaterialView(material as unknown as MaterialWithRelations);
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
      include: MATERIAL_LIST_INCLUDE,
      orderBy: { name: 'asc' },
    });
    return rows
      .map((m) => toMaterialView(m))
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

  async create(organizationId: string, dto: CreateMaterialDto): Promise<MaterialView> {
    assertStockLimits(dto.minStock ?? 0, dto.maxStock);
    await this.assertCatalogueReferences(organizationId, dto);
    try {
      const material = await this.prisma.material.create({
        data: {
          name: dto.name.trim(),
          sku: dto.sku.trim(),
          unit: dto.unit.trim(),
          unitCost: dto.unitCost,
          minStock: dto.minStock,
          maxStock: dto.maxStock,
          categoryId: dto.categoryId ?? null,
          supplierId: dto.supplierId ?? null,
          specifications: dto.specifications,
          organizationId,
        },
        include: MATERIAL_LIST_INCLUDE,
      });
      return toMaterialView(material);
    } catch (error) {
      throw toSkuConflict(error, dto.sku);
    }
  }

  async update(id: string, organizationId: string, dto: UpdateMaterialDto): Promise<MaterialView> {
    const existing = await this.prisma.material.findFirst({ where: { id, organizationId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Material not found');
    await this.assertCatalogueReferences(organizationId, dto);

    assertStockLimits(
      dto.minStock ?? num(existing.minStock),
      dto.maxStock === undefined ? existing.maxStock == null ? null : num(existing.maxStock) : dto.maxStock,
    );

    try {
      const updated = await this.prisma.material.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          sku: dto.sku?.trim(),
          unit: dto.unit?.trim(),
          unitCost: dto.unitCost,
          minStock: dto.minStock,
          maxStock: dto.maxStock,
          categoryId: dto.categoryId,
          supplierId: dto.supplierId,
          specifications: dto.specifications,
        },
        include: MATERIAL_LIST_INCLUDE,
      });
      return toMaterialView(updated);
    } catch (error) {
      throw toSkuConflict(error, dto.sku ?? existing.sku);
    }
  }

  /**
   * Archived materials disappear from the catalogue but keep their history (receipts, issues, POs).
   * Only empty materials can be archived, otherwise stock would vanish from the books.
   */
  async archive(id: string, organizationId: string): Promise<{ id: string }> {
    const material = await this.prisma.material.findFirst({
      where: { id, organizationId, deletedAt: null },
      select: { id: true, name: true, quantity: true, incoming: true },
    });
    if (!material) throw new NotFoundException('Material not found');
    if (num(material.quantity) > 0) {
      throw new BadRequestException(`${material.name} still has stock on hand. Issue or adjust it to zero before archiving.`);
    }
    if (num(material.incoming) > 0) {
      throw new BadRequestException(`${material.name} has deliveries on the way. Receive or cancel them before archiving.`);
    }

    await this.prisma.material.update({ where: { id }, data: { deletedAt: new Date() } });
    return { id };
  }

  /** Category and supplier ids come from the client, so make sure they belong to this organization. */
  private async assertCatalogueReferences(
    organizationId: string,
    refs: { categoryId?: string | null; supplierId?: string | null },
  ): Promise<void> {
    const [category, supplier] = await Promise.all([
      refs.categoryId
        ? this.prisma.materialCategory.findFirst({ where: { id: refs.categoryId, organizationId }, select: { id: true } })
        : null,
      refs.supplierId
        ? this.prisma.materialSupplier.findFirst({ where: { id: refs.supplierId, organizationId }, select: { id: true } })
        : null,
    ]);
    if (refs.categoryId && !category) throw new BadRequestException('Choose a category from your catalogue.');
    if (refs.supplierId && !supplier) throw new BadRequestException('Choose a supplier from your catalogue.');
  }
}

function toSkuConflict(error: unknown, sku: string): unknown {
  const isDuplicate = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  // Archived materials keep their SKU so their history stays traceable.
  return isDuplicate ? new ConflictException(`SKU ${sku.trim()} is already used by another material, including archived ones.`) : error;
}

function assertStockLimits(minStock: number, maxStock: number | null | undefined): void {
  if (maxStock != null && maxStock < minStock) {
    throw new BadRequestException('Maximum stock must be at least the minimum stock.');
  }
}
