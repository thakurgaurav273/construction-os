import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DeliveryStatus, PoLineItem, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { normalizeOptionalText } from '../../common/utils/normalize-text';
import { ReceiptLine, StockLedgerService } from '../inventory/stock-ledger.service';
import { DELIVERY_INCLUDE, DeliveryView, toDeliveryView } from './delivery.mapper';
import { nextDocumentNumber, withDocumentNumberRetry } from './document-numbers';
import { DeliveryQueryDto, ReceiveGoodsDto, ReceivedItemDto, ScheduleDeliveryDto } from './dto/delivery.dto';
import { DOCUMENT_PREFIX, OPEN_DELIVERY_STATUSES, PO_EVENTS } from './procurement.constants';
import { formatDay, isFutureDay, toNumber } from './procurement-math';
import { PurchaseOrderHistoryService } from './purchase-order-history.service';
import { isFullyReceived } from './purchase-order.mapper';
import { PurchaseOrderWithItems, PurchaseOrdersService, assertMaterialLinks, parseFutureDate } from './purchase-orders.service';

/** Quantities carry three decimals; anything smaller is rounding noise. */
const QUANTITY_EPSILON = 0.0005;

@Injectable()
export class DeliveriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: PurchaseOrdersService,
    private readonly history: PurchaseOrderHistoryService,
    private readonly ledger: StockLedgerService,
  ) {}

  async findAll(organizationId: string, query: DeliveryQueryDto): Promise<DeliveryView[]> {
    const deliveries = await this.prisma.delivery.findMany({
      where: {
        organizationId,
        purchaseOrderId: query.purchaseOrderId,
        purchaseOrder: query.projectId ? { projectId: query.projectId } : undefined,
      },
      include: DELIVERY_INCLUDE,
      orderBy: [{ scheduledDate: 'desc' }, { createdAt: 'desc' }],
    });
    const today = new Date();
    return deliveries.map((delivery) => toDeliveryView(delivery, today));
  }

  async findOne(id: string, organizationId: string): Promise<DeliveryView> {
    const delivery = await this.prisma.delivery.findFirst({ where: { id, organizationId }, include: DELIVERY_INCLUDE });
    if (!delivery) throw new NotFoundException('Delivery not found.');
    return toDeliveryView(delivery, new Date());
  }

  async schedule(
    purchaseOrderId: string,
    organizationId: string,
    userId: string,
    dto: ScheduleDeliveryDto,
  ): Promise<DeliveryView> {
    const order = await this.orders.findOrderOrThrow(purchaseOrderId, organizationId);
    assertReceivable(order);
    const scheduledDate = parseFutureDate(dto.scheduledDate, 'Delivery date');
    const trackingId = normalizeOptionalText(dto.trackingId);

    const delivery = await this.prisma.$transaction(async (tx) => {
      const created = await tx.delivery.create({
        data: {
          purchaseOrderId,
          status: 'SCHEDULED',
          scheduledDate,
          trackingId,
          notes: normalizeOptionalText(dto.notes),
          organizationId,
        },
      });
      await this.history.record(tx, {
        order,
        actorId: userId,
        stage: PO_EVENTS.deliveryScheduled,
        note: `Expected ${formatDay(scheduledDate)}${trackingId ? ` · Tracking ${trackingId}` : ''}`,
      });
      return created;
    });
    return this.findOne(delivery.id, organizationId);
  }

  async markInTransit(id: string, organizationId: string, userId: string): Promise<DeliveryView> {
    return this.moveOpenDelivery(id, organizationId, userId, ['SCHEDULED'], 'IN_TRANSIT', PO_EVENTS.inTransit);
  }

  async cancel(id: string, organizationId: string, userId: string): Promise<DeliveryView> {
    return this.moveOpenDelivery(id, organizationId, userId, OPEN_DELIVERY_STATUSES, 'CANCELLED', PO_EVENTS.deliveryCancelled);
  }

  /**
   * Records a goods received note (GRN). Receives a scheduled delivery when `deliveryId` is given,
   * otherwise logs an unscheduled arrival. Partial receipts are allowed; over-receipts are not.
   */
  async receive(
    purchaseOrderId: string,
    organizationId: string,
    userId: string,
    dto: ReceiveGoodsDto,
  ): Promise<DeliveryView> {
    const order = await this.orders.findOrderOrThrow(purchaseOrderId, organizationId);
    assertReceivable(order);
    const receivedItems = validateReceivedItems(order, dto.items);
    const receivedAt = dto.receivedAt ? new Date(dto.receivedAt) : new Date();
    if (isFutureDay(receivedAt)) throw new BadRequestException("Received date can't be in the future.");
    if (dto.deliveryId) await this.findOpenDelivery(dto.deliveryId, purchaseOrderId, organizationId);

    const delivery = await withDocumentNumberRetry(() => this.prisma.$transaction(async (tx) => {
      // Lock the order so two GRNs recorded at once can't both claim the same outstanding quantity.
      await tx.$queryRaw`SELECT 1 FROM "purchase_orders" WHERE "id" = ${purchaseOrderId} FOR UPDATE`;
      const lines = await tx.poLineItem.findMany({ where: { purchaseOrderId } });
      const receivedByLine = new Map(receivedItems.map((item) => [item.poLineItemId, item.quantity]));
      assertWithinOutstanding(lines, receivedByLine);

      const grnNumber = await this.nextGrnNumber(tx, organizationId);
      const stockLines = await linkStockLines(tx, organizationId, lines, dto.items);
      const warehouseId = stockLines.length
        ? await resolveReceivingStore(tx, organizationId, order.projectId, dto.warehouseId)
        : null;
      const receipt = {
        warehouseId,
        status: 'RECEIVED' as const,
        grnNumber,
        receivedAt,
        receivedById: userId,
        notes: normalizeOptionalText(dto.notes),
      };
      const trackingId = normalizeOptionalText(dto.trackingId);
      const saved = dto.deliveryId
        ? await tx.delivery.update({ where: { id: dto.deliveryId }, data: { ...receipt, trackingId: trackingId ?? undefined } })
        : await tx.delivery.create({
          data: { ...receipt, trackingId, purchaseOrderId, scheduledDate: order.expectedDelivery, organizationId },
        });

      await tx.deliveryItem.createMany({
        data: receivedItems.map((item) => ({ deliveryId: saved.id, poLineItemId: item.poLineItemId, quantity: item.quantity })),
      });
      for (const item of receivedItems) {
        await tx.poLineItem.update({
          where: { id: item.poLineItemId },
          data: { receivedQuantity: { increment: item.quantity } },
        });
      }
      if (warehouseId) {
        await this.ledger.receive(tx, {
          organizationId,
          warehouseId,
          projectId: order.projectId,
          reference: grnNumber,
          note: `Received against ${order.poNumber}`,
          occurredAt: receivedAt,
          lines: stockLines,
        });
      }

      const isComplete = lines.every((line) =>
        toNumber(line.receivedQuantity) + (receivedByLine.get(line.id) ?? 0) >= toNumber(line.quantity) - QUANTITY_EPSILON);
      await this.history.record(tx, {
        order,
        actorId: userId,
        stage: PO_EVENTS.goodsReceived,
        note: `${grnNumber} · ${receivedItems.length} line${receivedItems.length === 1 ? '' : 's'}${isComplete ? ' · order fully delivered' : ''}`,
        activity: {
          type: 'update',
          title: 'Goods received',
          description: `${grnNumber} recorded against ${order.poNumber}${isComplete ? '; the order is now fully delivered.' : '.'}`,
        },
      });
      return saved;
    }));
    return this.findOne(delivery.id, organizationId);
  }

  private async moveOpenDelivery(
    id: string,
    organizationId: string,
    userId: string,
    from: DeliveryStatus[],
    to: DeliveryStatus,
    stage: string,
  ): Promise<DeliveryView> {
    const delivery = await this.prisma.delivery.findFirst({
      where: { id, organizationId },
      include: { purchaseOrder: true },
    });
    if (!delivery) throw new NotFoundException('Delivery not found.');

    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.delivery.updateMany({ where: { id, status: { in: from } }, data: { status: to } });
      if (count === 0) throw new ConflictException('This delivery has already been received or cancelled.');
      await this.history.record(tx, {
        order: delivery.purchaseOrder,
        actorId: userId,
        stage,
        note: `Scheduled for ${formatDay(delivery.scheduledDate)}`,
      });
    });
    return this.findOne(id, organizationId);
  }

  private async findOpenDelivery(id: string, purchaseOrderId: string, organizationId: string): Promise<void> {
    const delivery = await this.prisma.delivery.findFirst({ where: { id, purchaseOrderId, organizationId } });
    if (!delivery) throw new NotFoundException('Delivery not found on this purchase order.');
    if (!OPEN_DELIVERY_STATUSES.includes(delivery.status)) {
      throw new ConflictException('This delivery has already been received or cancelled.');
    }
  }

  private async nextGrnNumber(tx: Prisma.TransactionClient, organizationId: string): Promise<string> {
    const receipts = await tx.delivery.findMany({
      where: { organizationId, grnNumber: { startsWith: `${DOCUMENT_PREFIX.grn}-` } },
      select: { grnNumber: true },
    });
    return nextDocumentNumber(DOCUMENT_PREFIX.grn, receipts.map((receipt) => receipt.grnNumber));
  }
}

function assertReceivable(order: PurchaseOrderWithItems): void {
  if (order.status !== 'APPROVED') {
    throw new ConflictException('Deliveries can only be recorded against approved purchase orders.');
  }
  if (isFullyReceived(order.items)) throw new ConflictException('Every line on this order has already been received.');
}

function validateReceivedItems(order: PurchaseOrderWithItems, items: ReceivedItemDto[]): ReceivedItemDto[] {
  const lineIds = new Set(order.items.map((item) => item.id));
  const seen = new Set<string>();
  for (const item of items) {
    if (!lineIds.has(item.poLineItemId)) throw new BadRequestException("A received line doesn't belong to this order.");
    if (seen.has(item.poLineItemId)) throw new BadRequestException('Each order line can only appear once per receipt.');
    seen.add(item.poLineItemId);
  }
  const received = items.filter((item) => item.quantity > 0);
  if (received.length === 0) throw new BadRequestException('Enter the quantity received for at least one line.');
  return received;
}

function assertWithinOutstanding(
  lines: { id: string; description: string; unit: string; quantity: Prisma.Decimal; receivedQuantity: Prisma.Decimal }[],
  receivedByLine: Map<string, number>,
): void {
  for (const line of lines) {
    const incoming = receivedByLine.get(line.id) ?? 0;
    const outstanding = toNumber(line.quantity) - toNumber(line.receivedQuantity);
    if (incoming > outstanding + QUANTITY_EPSILON) {
      throw new BadRequestException(
        `Only ${Math.max(0, Number(outstanding.toFixed(3)))} ${line.unit} of ${line.description} is still outstanding.`,
      );
    }
  }
}

/**
 * Received lines that replenish stock. A line already linked to a material keeps its link; an unlinked line can be
 * linked on first receipt (saved on the PO line so later GRNs and the 3-way match see it). Unlinked lines with no
 * material chosen (services, hire, one-off items) are received without touching stock.
 */
async function linkStockLines(
  tx: Prisma.TransactionClient,
  organizationId: string,
  lines: PoLineItem[],
  received: ReceivedItemDto[],
): Promise<ReceiptLine[]> {
  const lineById = new Map(lines.map((line) => [line.id, line]));
  const newLinks = received.filter((item) => item.materialId && !lineById.get(item.poLineItemId)?.materialId);
  for (const item of received) {
    const line = lineById.get(item.poLineItemId);
    if (item.materialId && line?.materialId && line.materialId !== item.materialId) {
      throw new BadRequestException(`"${line.description}" is already linked to a different material.`);
    }
  }
  await assertMaterialLinks(tx, organizationId, newLinks.map((item) => {
    const line = lineById.get(item.poLineItemId);
    return { materialId: item.materialId, unit: line?.unit ?? '', description: line?.description ?? 'A line' };
  }));
  for (const item of newLinks) {
    await tx.poLineItem.update({ where: { id: item.poLineItemId }, data: { materialId: item.materialId } });
  }

  return received.flatMap((item) => {
    const line = lineById.get(item.poLineItemId);
    const materialId = line?.materialId ?? item.materialId;
    if (!line || !materialId || item.quantity <= 0) return [];
    // Stock is carried at the agreed rate after discount, before GST.
    return [{ materialId, quantity: item.quantity, unitCost: toNumber(line.rate) * (1 - line.discountPercent / 100) }];
  });
}

/** The chosen store, or the project's own site store when it has exactly one. */
async function resolveReceivingStore(
  tx: Prisma.TransactionClient,
  organizationId: string,
  projectId: string | null,
  warehouseId: string | undefined,
): Promise<string> {
  if (warehouseId) {
    const store = await tx.warehouse.findFirst({ where: { id: warehouseId, organizationId, deletedAt: null }, select: { id: true } });
    if (!store) throw new NotFoundException('Store not found.');
    return store.id;
  }
  const siteStores = projectId
    ? await tx.warehouse.findMany({ where: { organizationId, projectId, deletedAt: null }, select: { id: true } })
    : [];
  if (siteStores.length === 1) return siteStores[0].id;
  throw new BadRequestException('Choose the store receiving these goods.');
}
