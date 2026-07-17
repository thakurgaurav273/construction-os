import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InventoryTransactionType, Prisma, StockTransferStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { TransferQueryDto } from './dto/inventory-query.dto';
import { UpdateTransferDto } from './dto/update-transfer.dto';
import { buildCode, num, round2 } from './inventory.helpers';

const LIST_INCLUDE = {
  fromWarehouse: { select: { id: true, name: true, type: true } },
  toWarehouse: { select: { id: true, name: true, type: true } },
  items: { select: { quantity: true } },
} satisfies Prisma.StockTransferInclude;

type TransferWithRels = Prisma.StockTransferGetPayload<{ include: typeof LIST_INCLUDE }>;

@Injectable()
export class InventoryTransfersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, query: TransferQueryDto) {
    const where: Prisma.StockTransferWhereInput = { organizationId };
    if (query.status) where.status = query.status as StockTransferStatus;
    if (query.warehouseId) {
      where.OR = [{ fromWarehouseId: query.warehouseId }, { toWarehouseId: query.warehouseId }];
    }
    if (query.search) {
      where.code = { contains: query.search, mode: 'insensitive' };
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [rows, total] = await Promise.all([
      this.prisma.stockTransfer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: LIST_INCLUDE,
      }),
      this.prisma.stockTransfer.count({ where }),
    ]);

    return {
      items: rows.map((t) => this.mapList(t)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  private mapList(t: TransferWithRels) {
    const totalQuantity = t.items.reduce((sum, i) => sum + num(i.quantity), 0);
    return {
      id: t.id,
      code: t.code,
      status: t.status,
      fromWarehouseId: t.fromWarehouseId,
      fromWarehouseName: t.fromWarehouse.name,
      toWarehouseId: t.toWarehouseId,
      toWarehouseName: t.toWarehouse.name,
      itemCount: t.items.length,
      totalQuantity: round2(totalQuantity),
      note: t.note,
      requestedBy: t.requestedBy,
      approvedBy: t.approvedBy,
      createdAt: t.createdAt,
      approvedAt: t.approvedAt,
      completedAt: t.completedAt,
    };
  }

  async findOne(id: string, organizationId: string) {
    const transfer = await this.prisma.stockTransfer.findFirst({
      where: { id, organizationId },
      include: {
        fromWarehouse: { select: { id: true, name: true, type: true, city: true } },
        toWarehouse: { select: { id: true, name: true, type: true, city: true } },
        items: { include: { material: { select: { id: true, name: true, sku: true, unit: true } } } },
        transactions: {
          orderBy: { occurredAt: 'desc' },
          include: { warehouse: { select: { id: true, name: true } } },
        },
      },
    });
    if (!transfer) throw new NotFoundException('Transfer not found');

    return {
      id: transfer.id,
      code: transfer.code,
      status: transfer.status,
      fromWarehouse: transfer.fromWarehouse,
      toWarehouse: transfer.toWarehouse,
      note: transfer.note,
      requestedBy: transfer.requestedBy,
      approvedBy: transfer.approvedBy,
      createdAt: transfer.createdAt,
      approvedAt: transfer.approvedAt,
      completedAt: transfer.completedAt,
      items: transfer.items.map((i) => ({
        id: i.id,
        materialId: i.materialId,
        materialName: i.material.name,
        sku: i.material.sku,
        unit: i.material.unit,
        quantity: num(i.quantity),
      })),
      transactions: transfer.transactions.map((t) => ({
        id: t.id,
        type: t.type,
        warehouseName: t.warehouse.name,
        quantity: num(t.quantity),
        occurredAt: t.occurredAt,
      })),
      timeline: this.buildTimeline(transfer),
    };
  }

  private buildTimeline(transfer: {
    createdAt: Date;
    approvedAt: Date | null;
    completedAt: Date | null;
    status: StockTransferStatus;
  }) {
    const steps: { stage: string; date: Date | null; done: boolean }[] = [
      { stage: 'Requested', date: transfer.createdAt, done: true },
      { stage: 'Approved', date: transfer.approvedAt, done: transfer.approvedAt != null },
      { stage: 'Completed', date: transfer.completedAt, done: transfer.completedAt != null },
    ];
    if (transfer.status === 'REJECTED' || transfer.status === 'CANCELLED') {
      steps[2] = { stage: transfer.status === 'REJECTED' ? 'Rejected' : 'Cancelled', date: null, done: true };
    }
    return steps;
  }

  async create(organizationId: string, dto: CreateTransferDto) {
    if (dto.fromWarehouseId === dto.toWarehouseId) {
      throw new BadRequestException('Origin and destination warehouses must differ');
    }
    const warehouses = await this.prisma.warehouse.findMany({
      where: { id: { in: [dto.fromWarehouseId, dto.toWarehouseId] }, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (warehouses.length !== 2) throw new NotFoundException('Origin or destination warehouse not found');

    const materialIds = dto.items.map((i) => i.materialId);
    const materials = await this.prisma.material.findMany({
      where: { id: { in: materialIds }, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (materials.length !== new Set(materialIds).size) {
      throw new BadRequestException('One or more materials were not found');
    }

    const count = await this.prisma.stockTransfer.count({ where: { organizationId } });
    const code = buildCode('TRF', count);

    const transfer = await this.prisma.stockTransfer.create({
      data: {
        code,
        status: 'PENDING',
        fromWarehouseId: dto.fromWarehouseId,
        toWarehouseId: dto.toWarehouseId,
        note: dto.note ?? null,
        requestedBy: dto.requestedBy ?? null,
        organizationId,
        items: {
          create: dto.items.map((i) => ({
            materialId: i.materialId,
            quantity: i.quantity,
            organizationId,
          })),
        },
      },
      include: LIST_INCLUDE,
    });
    return this.mapList(transfer);
  }

  async updateStatus(id: string, organizationId: string, dto: UpdateTransferDto) {
    const transfer = await this.prisma.stockTransfer.findFirst({
      where: { id, organizationId },
      include: { items: true },
    });
    if (!transfer) throw new NotFoundException('Transfer not found');

    switch (dto.action) {
      case 'approve':
        return this.approve(transfer, dto);
      case 'reject':
        return this.reject(transfer, dto);
      case 'cancel':
        return this.cancel(transfer);
      case 'complete':
        return this.complete(transfer, organizationId, dto);
      default:
        throw new BadRequestException('Unsupported transfer action');
    }
  }

  private async approve(
    transfer: Prisma.StockTransferGetPayload<{ include: { items: true } }>,
    dto: UpdateTransferDto,
  ) {
    if (transfer.status !== 'PENDING') {
      throw new BadRequestException(`Only pending transfers can be approved (current: ${transfer.status})`);
    }
    const updated = await this.prisma.stockTransfer.update({
      where: { id: transfer.id },
      data: { status: 'APPROVED', approvedAt: new Date(), approvedBy: dto.actor ?? null },
      include: LIST_INCLUDE,
    });
    return this.mapList(updated);
  }

  private async reject(
    transfer: Prisma.StockTransferGetPayload<{ include: { items: true } }>,
    dto: UpdateTransferDto,
  ) {
    if (transfer.status !== 'PENDING' && transfer.status !== 'APPROVED') {
      throw new BadRequestException(`Cannot reject a ${transfer.status} transfer`);
    }
    const updated = await this.prisma.stockTransfer.update({
      where: { id: transfer.id },
      data: { status: 'REJECTED', note: dto.note ?? transfer.note },
      include: LIST_INCLUDE,
    });
    return this.mapList(updated);
  }

  private async cancel(transfer: Prisma.StockTransferGetPayload<{ include: { items: true } }>) {
    if (transfer.status === 'COMPLETED') {
      throw new BadRequestException('Completed transfers cannot be cancelled');
    }
    const updated = await this.prisma.stockTransfer.update({
      where: { id: transfer.id },
      data: { status: 'CANCELLED' },
      include: LIST_INCLUDE,
    });
    return this.mapList(updated);
  }

  /**
   * Move stock atomically: decrement origin, increment destination, and record a
   * TRANSFER_OUT + TRANSFER_IN transaction pair per line item.
   */
  private async complete(
    transfer: Prisma.StockTransferGetPayload<{ include: { items: true } }>,
    organizationId: string,
    dto: UpdateTransferDto,
  ) {
    if (transfer.status !== 'APPROVED' && transfer.status !== 'IN_TRANSIT' && transfer.status !== 'PENDING') {
      throw new BadRequestException(`Cannot complete a ${transfer.status} transfer`);
    }

    const materialIds = transfer.items.map((i) => i.materialId);
    const materials = await this.prisma.material.findMany({
      where: { id: { in: materialIds } },
      select: { id: true, unitCost: true },
    });
    const unitCostById = new Map(materials.map((m) => [m.id, m.unitCost]));

    const originItems = await this.prisma.inventoryItem.findMany({
      where: { warehouseId: transfer.fromWarehouseId, materialId: { in: materialIds } },
    });
    const originByMaterial = new Map(originItems.map((i) => [i.materialId, i]));

    for (const line of transfer.items) {
      const origin = originByMaterial.get(line.materialId);
      const available = origin ? num(origin.quantity) : 0;
      if (available < num(line.quantity)) {
        throw new BadRequestException('Insufficient stock at the origin warehouse to complete this transfer');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      for (const line of transfer.items) {
        const origin = originByMaterial.get(line.materialId)!;
        const qty = num(line.quantity);
        const unitCost = unitCostById.get(line.materialId) ?? new Prisma.Decimal(0);

        await tx.inventoryItem.update({
          where: { id: origin.id },
          data: { quantity: { decrement: qty } },
        });

        const destination = await tx.inventoryItem.upsert({
          where: {
            materialId_warehouseId: { materialId: line.materialId, warehouseId: transfer.toWarehouseId },
          },
          create: {
            materialId: line.materialId,
            warehouseId: transfer.toWarehouseId,
            organizationId,
            quantity: qty,
            reorderLevel: num(origin.reorderLevel),
          },
          update: { quantity: { increment: qty } },
        });

        await tx.inventoryTransaction.createMany({
          data: [
            {
              type: InventoryTransactionType.TRANSFER_OUT,
              quantity: qty,
              unitCost,
              reference: transfer.code,
              note: `Transfer ${transfer.code} out`,
              inventoryItemId: origin.id,
              materialId: line.materialId,
              warehouseId: transfer.fromWarehouseId,
              transferId: transfer.id,
              organizationId,
            },
            {
              type: InventoryTransactionType.TRANSFER_IN,
              quantity: qty,
              unitCost,
              reference: transfer.code,
              note: `Transfer ${transfer.code} in`,
              inventoryItemId: destination.id,
              materialId: line.materialId,
              warehouseId: transfer.toWarehouseId,
              transferId: transfer.id,
              organizationId,
            },
          ],
        });
      }

      const updated = await tx.stockTransfer.update({
        where: { id: transfer.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          approvedAt: transfer.approvedAt ?? new Date(),
          approvedBy: transfer.approvedBy ?? dto.actor ?? null,
        },
        include: LIST_INCLUDE,
      });
      return this.mapList(updated);
    });
  }
}
