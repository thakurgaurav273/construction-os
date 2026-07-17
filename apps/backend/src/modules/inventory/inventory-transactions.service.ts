import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { TransactionQueryDto } from './dto/inventory-query.dto';
import { num, round2 } from './inventory.helpers';

@Injectable()
export class InventoryTransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, query: TransactionQueryDto) {
    const where: Prisma.InventoryTransactionWhereInput = { organizationId };
    if (query.warehouseId) where.warehouseId = query.warehouseId;
    if (query.materialId) where.materialId = query.materialId;
    if (query.projectId) where.projectId = query.projectId;
    if (query.type) where.type = query.type as Prisma.InventoryTransactionWhereInput['type'];
    if (query.dateFrom || query.dateTo) {
      const range: Prisma.DateTimeFilter = {};
      if (query.dateFrom) range.gte = new Date(query.dateFrom);
      if (query.dateTo) range.lte = new Date(query.dateTo);
      where.occurredAt = range;
    }
    if (query.search) {
      where.OR = [
        { reference: { contains: query.search, mode: 'insensitive' } },
        { note: { contains: query.search, mode: 'insensitive' } },
        { material: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [rows, total] = await Promise.all([
      this.prisma.inventoryTransaction.findMany({
        where,
        orderBy: { occurredAt: query.order === 'asc' ? 'asc' : 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          material: { select: { id: true, name: true, unit: true } },
          warehouse: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
        },
      }),
      this.prisma.inventoryTransaction.count({ where }),
    ]);

    const items = rows.map((t) => {
      const quantity = num(t.quantity);
      const unitCost = num(t.unitCost);
      return {
        id: t.id,
        type: t.type,
        quantity,
        unitCost,
        value: round2(quantity * unitCost),
        reference: t.reference,
        note: t.note,
        materialId: t.materialId,
        materialName: t.material.name,
        unit: t.material.unit,
        warehouseId: t.warehouseId,
        warehouseName: t.warehouse.name,
        projectId: t.projectId,
        projectName: t.project?.name ?? null,
        occurredAt: t.occurredAt,
      };
    });

    return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }
}
