import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PoLineItem, Prisma, ProcurementPriority, PurchaseOrder } from '@prisma/client';
import { findOpenProject } from '../projects/project-guards';
import { PrismaService } from '../../database/prisma.service';
import { sameUnit } from '../inventory/units';
import { nextDocumentNumber, withDocumentNumberRetry } from './document-numbers';
import {
  CreatePurchaseOrderDto, PurchaseOrderItemDto, PurchaseOrderQueryDto, UpdatePurchaseOrderDto,
} from './dto/purchase-order.dto';
import { DOCUMENT_PREFIX, EDITABLE_PO_STATUSES, PO_EVENTS } from './procurement.constants';
import { orderTotal, startOfUtcDay, wholeDaysBetween } from './procurement-math';
import { PurchaseOrderHistoryService } from './purchase-order-history.service';
import {
  PO_DETAIL_INCLUDE, PO_LIST_INCLUDE, PurchaseOrderDetailView, PurchaseOrderView,
  toPurchaseOrderDetailView, toPurchaseOrderView,
} from './purchase-order.mapper';
import { VendorsService } from './vendors.service';

export interface DraftLineItem {
  materialId?: string | null;
  description: string;
  category: string;
  unit: string;
  quantity: number;
  rate: number;
  taxPercent: number;
  discountPercent: number;
}

export interface DraftOrderInput {
  organizationId: string;
  requesterId: string;
  projectId: string;
  vendorId: string;
  category: string;
  priority: ProcurementPriority;
  expectedDelivery: Date;
  deliveryAddress: string;
  notes: string;
  items: DraftLineItem[];
  /** The organization's own order number, when the order came from their spreadsheet. */
  externalReference?: string | null;
  /** Timeline entry describing how the order came to exist. */
  origin: { stage: string; note: string };
}

export type PurchaseOrderWithItems = PurchaseOrder & { items: PoLineItem[] };

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vendors: VendorsService,
    private readonly history: PurchaseOrderHistoryService,
  ) {}

  async findAll(organizationId: string, query: PurchaseOrderQueryDto): Promise<PurchaseOrderView[]> {
    const orders = await this.prisma.purchaseOrder.findMany({
      where: { organizationId, projectId: query.projectId, vendorId: query.vendorId, status: query.status },
      include: PO_LIST_INCLUDE,
      orderBy: [{ requestedDate: 'desc' }, { poNumber: 'desc' }],
    });
    const today = new Date();
    return orders.map((order) => toPurchaseOrderView(order, today));
  }

  async findOne(id: string, organizationId: string): Promise<PurchaseOrderDetailView> {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id, organizationId },
      include: PO_DETAIL_INCLUDE,
    });
    if (!order) throw new NotFoundException('Purchase order not found.');
    return toPurchaseOrderDetailView(order, new Date());
  }

  async create(
    organizationId: string,
    userId: string,
    dto: CreatePurchaseOrderDto,
    options: { externalReference?: string } = {},
  ): Promise<PurchaseOrderDetailView> {
    await findOpenProject(this.prisma, dto.projectId, organizationId, 'order for it');
    await this.vendors.findActiveVendor(dto.vendorId, organizationId);
    await assertMaterialLinks(this.prisma, organizationId, dto.items);
    const category = dto.category.trim();

    const order = await withDocumentNumberRetry(() => this.prisma.$transaction((tx) => this.createDraft(tx, {
      organizationId,
      requesterId: userId,
      projectId: dto.projectId,
      vendorId: dto.vendorId,
      category,
      priority: dto.priority ?? 'MEDIUM',
      expectedDelivery: parseFutureDate(dto.expectedDelivery),
      deliveryAddress: dto.deliveryAddress?.trim() ?? '',
      notes: dto.notes?.trim() ?? '',
      items: toDraftLineItems(dto.items, category),
      externalReference: options.externalReference ?? null,
      origin: {
        stage: PO_EVENTS.created,
        note: options.externalReference ? `Imported from spreadsheet (order ${options.externalReference})` : '',
      },
    })));
    return this.findOne(order.id, organizationId);
  }

  async update(id: string, organizationId: string, dto: UpdatePurchaseOrderDto): Promise<PurchaseOrderDetailView> {
    const existing = await this.findOrderOrThrow(id, organizationId);
    assertEditable(existing);
    const projectId = dto.projectId ?? existing.projectId;
    if (projectId) await findOpenProject(this.prisma, projectId, organizationId, 'order for it');
    if (dto.vendorId) await this.vendors.findActiveVendor(dto.vendorId, organizationId);
    if (dto.items) await assertMaterialLinks(this.prisma, organizationId, dto.items);
    const category = dto.category?.trim() ?? existing.category;

    await this.prisma.$transaction(async (tx) => {
      const items = dto.items ? toDraftLineItems(dto.items, category) : undefined;
      // Guarding on status inside the write keeps a concurrent submit from slipping between check and update.
      const { count } = await tx.purchaseOrder.updateMany({
        where: { id, organizationId, status: { in: EDITABLE_PO_STATUSES } },
        data: {
          projectId: dto.projectId,
          vendorId: dto.vendorId,
          category,
          priority: dto.priority,
          expectedDelivery: dto.expectedDelivery ? parseFutureDate(dto.expectedDelivery) : undefined,
          deliveryAddress: dto.deliveryAddress?.trim(),
          notes: dto.notes?.trim(),
          amount: items ? orderTotal(items) : undefined,
        },
      });
      if (count === 0) throw new ConflictException('This purchase order changed while you were editing. Refresh to see the latest version.');
      if (!items) return;

      await tx.poLineItem.deleteMany({ where: { purchaseOrderId: id } });
      await tx.poLineItem.createMany({
        data: items.map((item, index) => ({ ...item, purchaseOrderId: id, sortOrder: index })),
      });
    });
    return this.findOne(id, organizationId);
  }

  async duplicate(id: string, organizationId: string, userId: string): Promise<PurchaseOrderDetailView> {
    const source = await this.findOrderOrThrow(id, organizationId);
    if (!source.projectId || !source.vendorId) {
      throw new BadRequestException('This order has no project or vendor to copy.');
    }
    const today = startOfUtcDay(new Date());
    const { projectId, vendorId } = source;

    const copy = await withDocumentNumberRetry(() => this.prisma.$transaction((tx) => this.createDraft(tx, {
      organizationId,
      requesterId: userId,
      projectId,
      vendorId,
      category: source.category,
      priority: source.priority,
      expectedDelivery: source.expectedDelivery > today ? source.expectedDelivery : today,
      deliveryAddress: source.deliveryAddress,
      notes: source.notes,
      items: source.items.map((item) => ({
        materialId: item.materialId,
        description: item.description,
        category: item.category,
        unit: item.unit,
        quantity: item.quantity.toNumber(),
        rate: item.rate.toNumber(),
        taxPercent: item.taxPercent,
        discountPercent: item.discountPercent,
      })),
      origin: { stage: PO_EVENTS.created, note: `Duplicated from ${source.poNumber}` },
    })));
    return this.findOne(copy.id, organizationId);
  }

  /** Creates a DRAFT order inside the caller's transaction. Callers retry the transaction on a number clash. */
  async createDraft(tx: Prisma.TransactionClient, input: DraftOrderInput): Promise<PurchaseOrder> {
    const order = await tx.purchaseOrder.create({
      data: {
        poNumber: await this.nextPoNumber(tx, input.organizationId),
        status: 'DRAFT',
        category: input.category,
        priority: input.priority,
        expectedDelivery: input.expectedDelivery,
        deliveryAddress: input.deliveryAddress,
        notes: input.notes,
        externalReference: input.externalReference ?? null,
        amount: orderTotal(input.items),
        requestedById: input.requesterId,
        projectId: input.projectId,
        vendorId: input.vendorId,
        organizationId: input.organizationId,
        items: { create: input.items.map((item, index) => ({ ...item, sortOrder: index })) },
      },
    });
    await this.history.record(tx, {
      order,
      actorId: input.requesterId,
      stage: input.origin.stage,
      note: input.origin.note,
    });
    return order;
  }

  async findOrderOrThrow(id: string, organizationId: string): Promise<PurchaseOrderWithItems> {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id, organizationId },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!order) throw new NotFoundException('Purchase order not found.');
    return order;
  }


  private async nextPoNumber(tx: Prisma.TransactionClient, organizationId: string): Promise<string> {
    const orders = await tx.purchaseOrder.findMany({
      where: { organizationId, poNumber: { startsWith: `${DOCUMENT_PREFIX.purchaseOrder}-` } },
      select: { poNumber: true },
    });
    return nextDocumentNumber(DOCUMENT_PREFIX.purchaseOrder, orders.map((order) => order.poNumber));
  }
}

function assertEditable(order: PurchaseOrder): void {
  if (!EDITABLE_PO_STATUSES.includes(order.status)) {
    throw new ConflictException('Only drafts and orders sent back for changes can be edited.');
  }
}

/** Parses a calendar date that must be today or later. */
export function parseFutureDate(value: string, label = 'Expected delivery'): Date {
  const date = startOfUtcDay(new Date(value));
  if (wholeDaysBetween(new Date(), date) < 0) throw new BadRequestException(`${label} can't be in the past.`);
  return date;
}

function toDraftLineItems(items: PurchaseOrderItemDto[], category: string): DraftLineItem[] {
  return items.map((item) => ({
    materialId: item.materialId ?? null,
    description: item.description.trim(),
    category: item.category?.trim() || category,
    unit: item.unit.trim(),
    quantity: item.quantity,
    rate: item.rate,
    taxPercent: item.taxPercent ?? 0,
    discountPercent: item.discountPercent ?? 0,
  }));
}

interface MaterialLink {
  materialId?: string | null;
  unit: string;
  description: string;
}

/**
 * A line may only point at a catalogue material in the same organization, bought in the unit the material is
 * stocked in. Otherwise receipts would post e.g. 2 MT of steel as 2 kg.
 */
export async function assertMaterialLinks(
  db: PrismaService | Prisma.TransactionClient,
  organizationId: string,
  lines: MaterialLink[],
): Promise<void> {
  const ids = [...new Set(lines.map((line) => line.materialId).filter((id): id is string => !!id))];
  if (ids.length === 0) return;
  const materials = await db.material.findMany({
    where: { id: { in: ids }, organizationId, deletedAt: null },
    select: { id: true, name: true, unit: true },
  });
  const byId = new Map(materials.map((material) => [material.id, material]));
  for (const line of lines) {
    if (!line.materialId) continue;
    const material = byId.get(line.materialId);
    if (!material) throw new BadRequestException(`"${line.description}" is linked to a material that doesn't exist.`);
    if (!sameUnit(material.unit, line.unit)) {
      throw new BadRequestException(
        `${material.name} is stocked in ${material.unit}, but "${line.description}" is ordered in ${line.unit}. Use the same unit or pick another material.`,
      );
    }
  }
}
