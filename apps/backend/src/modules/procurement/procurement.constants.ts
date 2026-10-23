import { DeliveryStatus, PurchaseOrderStatus, RfqStatus } from '@prisma/client';

export const MAX_LINE_ITEMS = 100;
export const MAX_RFQ_VENDORS = 25;
export const MAX_NOTE_LENGTH = 1000;

/** An open RFQ closing within this many days is flagged as closing soon. */
export const RFQ_CLOSING_SOON_DAYS = 3;
/** A pending order waiting longer than this is called out as an approval bottleneck. */
export const STALE_APPROVAL_DAYS = 3;

export const ANALYTICS_MONTHS = 6;
export const ANALYTICS_WEEKS = 8;
export const TOP_SPEND_ROWS = 6;

export const DOCUMENT_PREFIX = {
  purchaseOrder: 'PO',
  rfq: 'RFQ',
  grn: 'GRN',
  vendor: 'VN',
} as const;

/** Orders whose contents can still change: never submitted, or sent back by the reviewer. */
export const EDITABLE_PO_STATUSES: PurchaseOrderStatus[] = ['DRAFT', 'CHANGES_REQUESTED'];
export const CANCELLABLE_PO_STATUSES: PurchaseOrderStatus[] = ['DRAFT', 'PENDING', 'CHANGES_REQUESTED', 'APPROVED'];
export const OPEN_RFQ_STATUSES: RfqStatus[] = ['OPEN', 'EVALUATING'];
export const OPEN_DELIVERY_STATUSES: DeliveryStatus[] = ['SCHEDULED', 'IN_TRANSIT'];

/** Purchase order timeline labels. Stored as text so past history keeps reading the same. */
export const PO_EVENTS = {
  created: 'Created',
  awarded: 'Created from RFQ',
  submitted: 'Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
  changesRequested: 'Changes Requested',
  cancelled: 'Cancelled',
  deliveryScheduled: 'Delivery Scheduled',
  inTransit: 'In Transit',
  deliveryCancelled: 'Delivery Cancelled',
  goodsReceived: 'Goods Received',
} as const;
