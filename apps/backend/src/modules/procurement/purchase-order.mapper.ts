import { DeliveryStatus, Prisma, ProcurementPriority, PurchaseOrderStatus } from '@prisma/client';
import { DELIVERY_INCLUDE, DeliveryView, NAME_REF, NamedRef, toDeliveryView } from './delivery.mapper';
import { lineItemTotal, toNumber, wholeDaysBetween } from './procurement-math';

export type PoDeliveryStatus = 'NOT_STARTED' | 'SCHEDULED' | 'IN_TRANSIT' | 'PARTIAL' | 'DELIVERED';

export const PO_LIST_INCLUDE = {
  project: NAME_REF,
  vendor: NAME_REF,
  requestedBy: NAME_REF,
  items: { orderBy: { sortOrder: 'asc' } },
  deliveries: { select: { status: true } },
} satisfies Prisma.PurchaseOrderInclude;

export const PO_DETAIL_INCLUDE = {
  ...PO_LIST_INCLUDE,
  reviewedBy: NAME_REF,
  timeline: { orderBy: [{ date: 'asc' }, { sortOrder: 'asc' }] },
  deliveries: { include: DELIVERY_INCLUDE, orderBy: { scheduledDate: 'asc' } },
  sourceRfq: { select: { id: true, rfqNumber: true } },
} satisfies Prisma.PurchaseOrderInclude;

type PurchaseOrderListRecord = Prisma.PurchaseOrderGetPayload<{ include: typeof PO_LIST_INCLUDE }>;
type PurchaseOrderDetailRecord = Prisma.PurchaseOrderGetPayload<{ include: typeof PO_DETAIL_INCLUDE }>;
type LineItemRecord = PurchaseOrderListRecord['items'][number];

export interface PoLineItemView {
  id: string;
  description: string;
  category: string;
  unit: string;
  quantity: number;
  rate: number;
  taxPercent: number;
  discountPercent: number;
  total: number;
  receivedQuantity: number;
}

export interface PurchaseOrderView {
  id: string;
  poNumber: string;
  category: string;
  status: PurchaseOrderStatus;
  priority: ProcurementPriority;
  project: NamedRef | null;
  vendor: NamedRef | null;
  requestedBy: NamedRef | null;
  requestedDate: Date;
  expectedDelivery: Date;
  submittedAt: Date | null;
  amount: number;
  deliveryAddress: string;
  notes: string;
  deliveryStatus: PoDeliveryStatus;
  /** Share of the order value received so far, 0-100. */
  receivedPercent: number;
  /** Approved, not fully delivered, and past its expected delivery date. */
  isOverdue: boolean;
  items: PoLineItemView[];
}

export interface PoTimelineEvent {
  id: string;
  stage: string;
  actor: string;
  date: Date;
  note: string;
}

export interface PurchaseOrderDetailView extends PurchaseOrderView {
  reviewedBy: NamedRef | null;
  reviewedAt: Date | null;
  reviewNote: string | null;
  sourceRfq: { id: string; rfqNumber: string } | null;
  timeline: PoTimelineEvent[];
  deliveries: DeliveryView[];
}

export interface ReceiptProgress {
  quantity: Prisma.Decimal | number;
  receivedQuantity: Prisma.Decimal | number;
}

export function isFullyReceived(items: ReceiptProgress[]): boolean {
  return items.length > 0 && items.every((item) => toNumber(item.receivedQuantity) >= toNumber(item.quantity));
}

export function isOrderOverdue(
  order: { status: PurchaseOrderStatus; expectedDelivery: Date; items: ReceiptProgress[] },
  today: Date,
): boolean {
  return order.status === 'APPROVED'
    && !isFullyReceived(order.items)
    && wholeDaysBetween(order.expectedDelivery, today) > 0;
}

export function deriveDeliveryStatus(items: ReceiptProgress[], deliveryStatuses: DeliveryStatus[]): PoDeliveryStatus {
  if (isFullyReceived(items)) return 'DELIVERED';
  if (deliveryStatuses.includes('IN_TRANSIT')) return 'IN_TRANSIT';
  if (items.some((item) => toNumber(item.receivedQuantity) > 0)) return 'PARTIAL';
  if (deliveryStatuses.includes('SCHEDULED')) return 'SCHEDULED';
  return 'NOT_STARTED';
}

function toLineItemView(item: LineItemRecord): PoLineItemView {
  const line = {
    quantity: toNumber(item.quantity),
    rate: toNumber(item.rate),
    taxPercent: item.taxPercent,
    discountPercent: item.discountPercent,
  };
  return {
    id: item.id,
    description: item.description,
    category: item.category,
    unit: item.unit,
    ...line,
    total: lineItemTotal(line),
    receivedQuantity: toNumber(item.receivedQuantity),
  };
}

/** Value-weighted so a fully received ₹10L line counts for more than a ₹500 one. */
function receivedPercent(items: PoLineItemView[]): number {
  const orderedValue = items.reduce((sum, item) => sum + item.total, 0);
  if (orderedValue === 0) return 0;
  const receivedValue = items.reduce(
    (sum, item) => sum + item.total * Math.min(1, item.receivedQuantity / item.quantity),
    0,
  );
  return Math.round((receivedValue / orderedValue) * 100);
}

export function toPurchaseOrderView(order: PurchaseOrderListRecord, today: Date): PurchaseOrderView {
  const items = order.items.map(toLineItemView);
  return {
    id: order.id,
    poNumber: order.poNumber,
    category: order.category,
    status: order.status,
    priority: order.priority,
    project: order.project,
    vendor: order.vendor,
    requestedBy: order.requestedBy,
    requestedDate: order.requestedDate,
    expectedDelivery: order.expectedDelivery,
    submittedAt: order.submittedAt,
    amount: toNumber(order.amount),
    deliveryAddress: order.deliveryAddress,
    notes: order.notes,
    deliveryStatus: deriveDeliveryStatus(order.items, order.deliveries.map((delivery) => delivery.status)),
    receivedPercent: receivedPercent(items),
    isOverdue: isOrderOverdue(order, today),
    items,
  };
}

export function toPurchaseOrderDetailView(order: PurchaseOrderDetailRecord, today: Date): PurchaseOrderDetailView {
  return {
    ...toPurchaseOrderView(order, today),
    reviewedBy: order.reviewedBy,
    reviewedAt: order.reviewedAt,
    reviewNote: order.reviewNote,
    sourceRfq: order.sourceRfq,
    timeline: order.timeline.map((step) => ({
      id: step.id,
      stage: step.stage,
      actor: step.actor,
      date: step.date,
      note: step.note,
    })),
    deliveries: order.deliveries.map((delivery) => toDeliveryView(delivery, today)),
  };
}
