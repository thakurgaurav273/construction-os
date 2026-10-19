import type { Permission } from '@sitepilot/types';
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
  canDuplicate: boolean;
}

/** Combines the order's status with what the member's role allows. */
export function getOrderPermissions(
  order: PurchaseOrder,
  currentUserId: string | undefined,
  can: (permission: Permission) => boolean,
): OrderPermissions {
  const hasReceipts = order.items.some((item) => item.receivedQuantity > 0);
  const isOwnOrder = !!currentUserId && order.requestedBy?.id === currentUserId;
  // Requesters withdraw their own open orders; anyone else's, or an approved commitment, needs approver rights.
  const canWithdraw = can('po.approve') || (isOwnOrder && order.status !== 'APPROVED' && can('po.create'));

  return {
    canEdit: EDITABLE.includes(order.status) && can('po.create'),
    canSubmit: EDITABLE.includes(order.status) && can('po.create'),
    canReview: order.status === 'PENDING' && !isOwnOrder && can('po.approve'),
    isOwnOrder,
    canCancel: CANCELLABLE.includes(order.status) && !hasReceipts && canWithdraw,
    canRecordDelivery: order.status === 'APPROVED' && order.deliveryStatus !== 'DELIVERED' && can('delivery.receive'),
    canDuplicate: can('po.create'),
  };
}

export function outstandingQuantity(item: { quantity: number; receivedQuantity: number }): number {
  return Math.max(0, Math.round((item.quantity - item.receivedQuantity) * 1000) / 1000);
}
