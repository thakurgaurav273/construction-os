import { DeliveryStatus, Prisma } from '@prisma/client';
import { OPEN_DELIVERY_STATUSES } from './procurement.constants';
import { toNumber, wholeDaysBetween } from './procurement-math';

export const NAME_REF = { select: { id: true, name: true } } as const;

export const DELIVERY_INCLUDE = {
  purchaseOrder: {
    select: { id: true, poNumber: true, category: true, vendor: NAME_REF, project: NAME_REF },
  },
  receivedBy: NAME_REF,
  items: {
    include: { poLineItem: { select: { id: true, description: true, unit: true, sortOrder: true } } },
  },
} satisfies Prisma.DeliveryInclude;

type DeliveryRecord = Prisma.DeliveryGetPayload<{ include: typeof DELIVERY_INCLUDE }>;

export interface NamedRef {
  id: string;
  name: string;
}

export interface ReceivedItemView {
  poLineItemId: string;
  description: string;
  unit: string;
  quantity: number;
}

export interface DeliveryView {
  id: string;
  grnNumber: string | null;
  status: DeliveryStatus;
  scheduledDate: Date;
  receivedAt: Date | null;
  trackingId: string | null;
  notes: string | null;
  /** Days past the scheduled date: still waiting for open deliveries, arrival lateness for received ones. */
  delayDays: number;
  isDelayed: boolean;
  purchaseOrder: { id: string; poNumber: string; category: string };
  vendor: NamedRef | null;
  project: NamedRef | null;
  receivedBy: NamedRef | null;
  items: ReceivedItemView[];
}

export function toDeliveryView(delivery: DeliveryRecord, today: Date): DeliveryView {
  const isOpen = OPEN_DELIVERY_STATUSES.includes(delivery.status);
  const comparedTo = delivery.receivedAt ?? (isOpen ? today : delivery.scheduledDate);
  const delayDays = Math.max(0, wholeDaysBetween(delivery.scheduledDate, comparedTo));
  const { purchaseOrder } = delivery;

  return {
    id: delivery.id,
    grnNumber: delivery.grnNumber,
    status: delivery.status,
    scheduledDate: delivery.scheduledDate,
    receivedAt: delivery.receivedAt,
    trackingId: delivery.trackingId,
    notes: delivery.notes,
    delayDays,
    isDelayed: isOpen && delayDays > 0,
    purchaseOrder: { id: purchaseOrder.id, poNumber: purchaseOrder.poNumber, category: purchaseOrder.category },
    vendor: purchaseOrder.vendor,
    project: purchaseOrder.project,
    receivedBy: delivery.receivedBy,
    items: [...delivery.items]
      .sort((a, b) => a.poLineItem.sortOrder - b.poLineItem.sortOrder)
      .map((item) => ({
        poLineItemId: item.poLineItem.id,
        description: item.poLineItem.description,
        unit: item.poLineItem.unit,
        quantity: toNumber(item.quantity),
      })),
  };
}
