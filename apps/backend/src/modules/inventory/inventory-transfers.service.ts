import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StockTransferStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { nextDocumentNumber, withDocumentNumberRetry } from '../procurement/document-numbers';
import { normalizeOptionalText } from '../../common/utils/normalize-text';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { TransferQueryDto } from './dto/inventory-query.dto';
import { availableStock, num, Paginated } from './inventory.helpers';
import {
  TRANSFER_DETAIL_INCLUDE, TRANSFER_LIST_INCLUDE, TransferDetailView, TransferListView,
  toTransferDetailView, toTransferListView,
} from './transfer.mapper';

const TRANSFER_PREFIX = 'TRF';

@Injectable()
export class InventoryTransfersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, query: TransferQueryDto): Promise<Paginated<TransferListView>> {
    const where: Prisma.StockTransferWhereInput = { organizationId };
    if (query.status) where.status = query.status as StockTransferStatus;
    if (query.warehouseId) {
      where.OR = [{ fromWarehouseId: query.warehouseId }, { toWarehouseId: query.warehouseId }];
    }
    if (query.search) where.code = { contains: query.search, mode: 'insensitive' };

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [rows, total] = await Promise.all([
      this.prisma.stockTransfer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: TRANSFER_LIST_INCLUDE,
      }),
      this.prisma.stockTransfer.count({ where }),
    ]);

    return { items: rows.map(toTransferListView), total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }

  async findOne(id: string, organizationId: string): Promise<TransferDetailView> {
    const transfer = await this.prisma.stockTransfer.findFirst({
      where: { id, organizationId },
      include: TRANSFER_DETAIL_INCLUDE,
    });
    if (!transfer) throw new NotFoundException('Transfer not found');
    return toTransferDetailView(transfer);
  }

  /**
   * Raises a transfer request. Stock doesn't move until it is approved by someone else and received,
   * but a request the origin store can't fill today is refused up front.
   */
  async create(organizationId: string, userId: string, dto: CreateTransferDto): Promise<TransferDetailView> {
    if (dto.fromWarehouseId === dto.toWarehouseId) {
      throw new BadRequestException('Choose different stores to transfer from and to.');
    }
    const materialIds = dto.items.map((item) => item.materialId);
    if (new Set(materialIds).size !== materialIds.length) {
      throw new BadRequestException('Each material can appear only once in a transfer.');
    }

    const warehouses = await this.prisma.warehouse.findMany({
      where: { id: { in: [dto.fromWarehouseId, dto.toWarehouseId] }, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (warehouses.length !== 2) throw new NotFoundException('Store not found.');

    const originStock = await this.prisma.inventoryItem.findMany({
      where: { warehouseId: dto.fromWarehouseId, organizationId, materialId: { in: materialIds }, material: { deletedAt: null } },
      include: { material: { select: { name: true, unit: true } } },
    });
    for (const line of dto.items) {
      const stock = originStock.find((item) => item.materialId === line.materialId);
      if (!stock) throw new BadRequestException('The origin store holds no stock of one of the materials.');
      const available = availableStock(num(stock.quantity), num(stock.reserved));
      if (line.quantity > available) {
        throw new BadRequestException(`Only ${available} ${stock.material.unit} of ${stock.material.name} available at the origin store.`);
      }
    }

    const transfer = await withDocumentNumberRetry(async () => {
      const existing = await this.prisma.stockTransfer.findMany({
        where: { organizationId, code: { startsWith: `${TRANSFER_PREFIX}-` } },
        select: { code: true },
      });
      return this.prisma.stockTransfer.create({
        data: {
          code: nextDocumentNumber(TRANSFER_PREFIX, existing.map((row) => row.code)),
          status: 'PENDING',
          fromWarehouseId: dto.fromWarehouseId,
          toWarehouseId: dto.toWarehouseId,
          note: normalizeOptionalText(dto.note) ?? null,
          requestedById: userId,
          organizationId,
          items: { create: dto.items.map((item) => ({ materialId: item.materialId, quantity: item.quantity, organizationId })) },
        },
        select: { id: true },
      });
    });
    return this.findOne(transfer.id, organizationId);
  }
}
