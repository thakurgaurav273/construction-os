import type { PurchaseOrder, PurchaseOrderStatus } from '../types';

/**
 * UI mirror of the backend workflow rules (purchase-order-workflow.service.ts, deliveries.service.ts).
 * The server stays authoritative; these only decide which actions are offered.
 */
const EDITABLE: PurchaseOrderStatus[] = ['DRAFT', 'CHANGES_REQUESTED'];
const CANCELLABLE: PurchaseOrderStatus[] = ['DRAFT', 'PENDING', 'CHANGES_REQUESTED', 'APPROVED'];

export interface OrderPermissions {
  canEdit: boolean;
  canSubmit: boolean;
  canReview: boolean;
  /** The requester can't approve their own order; shown as a hint instead of buttons. */
  isOwnOrder: boolean;
  canCancel: boolean;
  canRecordDelivery: boolean;
}

export function getOrderPermissions(order: PurchaseOrder, currentUserId: string | undefined): OrderPermissions {
  const hasReceipts = order.items.some((item) => item.receivedQuantity > 0);
  const isOwnOrder = !!currentUserId && order.requestedBy?.id === currentUserId;

  return {
    canEdit: EDITABLE.includes(order.status),
    canSubmit: EDITABLE.includes(order.status),
    canReview: order.status === 'PENDING' && !isOwnOrder,
    isOwnOrder,
    canCancel: CANCELLABLE.includes(order.status) && !hasReceipts,
    canRecordDelivery: order.status === 'APPROVED' && order.deliveryStatus !== 'DELIVERED',
  };
}

export function outstandingQuantity(item: { quantity: number; receivedQuantity: number }): number {
  return Math.max(0, Math.round((item.quantity - item.receivedQuantity) * 1000) / 1000);
}
