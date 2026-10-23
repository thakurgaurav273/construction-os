import type { InvoiceStatus, MatchIssue, PaymentMethod, PaymentStatus } from './types';

export const INVOICE_STATUS_OPTIONS: { value: InvoiceStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING_APPROVAL', label: 'Awaiting approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'PARTIALLY_PAID', label: 'Partially paid' },
  { value: 'PAID', label: 'Paid' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export const PAYMENT_STATUS_OPTIONS: { value: PaymentStatus; label: string }[] = [
  { value: 'PENDING', label: 'Awaiting approval' },
  { value: 'APPROVED', label: 'Ready to pay' },
  { value: 'PAID', label: 'Paid' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'bank_transfer', label: 'Bank transfer (NEFT/RTGS)' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'upi', label: 'UPI' },
  { value: 'cash', label: 'Cash' },
];

export const MATCH_ISSUE_LABELS: Record<MatchIssue, string> = {
  QTY_EXCEEDS_RECEIVED: 'Billed more than received',
  RATE_ABOVE_PO: 'Rate above PO',
  TAX_MISMATCH: 'GST differs from PO',
  NOT_ON_PO: 'Not on the PO',
};

export const DEFAULT_PAYMENT_TERM_DAYS = 30;
export const MAX_INVOICE_LINES = 100;
