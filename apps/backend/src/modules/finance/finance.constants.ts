import { InvoiceStatus, PaymentStatus } from '@prisma/client';

export const PAYMENT_PREFIX = 'PAY';
export const MAX_INVOICE_LINES = 100;
export const DEFAULT_PAYMENT_TERM_DAYS = 30;

/** An invoiced rate this far above the PO's effective rate is flagged in the 3-way match. */
export const RATE_TOLERANCE_PERCENT = 1;
/** Payables falling due within this many days count as "due this week". */
export const DUE_SOON_DAYS = 7;
export const ATTENTION_LIMIT = 3;

export const PAYMENT_METHODS = ['bank_transfer', 'cheque', 'upi', 'cash'] as const;

export const EDITABLE_INVOICE_STATUSES: InvoiceStatus[] = ['DRAFT'];
export const CANCELLABLE_INVOICE_STATUSES: InvoiceStatus[] = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED'];
/** Approved bills that still owe the vendor money. */
export const PAYABLE_INVOICE_STATUSES: InvoiceStatus[] = ['APPROVED', 'PARTIALLY_PAID'];
/** Bills whose lines count as "already billed" against a PO line. */
export const ACTIVE_INVOICE_STATUSES: InvoiceStatus[] = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PARTIALLY_PAID', 'PAID'];

/** Payments that reserve part of an invoice's balance, so two requests can't both pay the same amount. */
export const COMMITTED_PAYMENT_STATUSES: PaymentStatus[] = ['PENDING', 'APPROVED', 'PAID'];
export const CANCELLABLE_PAYMENT_STATUSES: PaymentStatus[] = ['PENDING', 'APPROVED'];
