import { InvoiceStatus, Prisma } from '@prisma/client';
import { NAME_REF, NamedRef } from '../procurement/delivery.mapper';
import { roundMoney, toNumber, wholeDaysBetween } from '../procurement/procurement-math';
import { COMMITTED_PAYMENT_STATUSES, PAYABLE_INVOICE_STATUSES } from './finance.constants';
import { InvoiceMatch, MatchStatus } from './invoice-match.service';
import { PAYMENT_INCLUDE, PaymentView, toPaymentView } from './payment.mapper';

export const INVOICE_LIST_INCLUDE = {
  vendor: NAME_REF,
  project: NAME_REF,
  purchaseOrder: { select: { id: true, poNumber: true } },
  createdBy: NAME_REF,
  items: { orderBy: { sortOrder: 'asc' } },
  payments: { select: { amount: true, status: true } },
  raBill: { select: { id: true, sequence: true, contract: { select: { id: true, code: true } } } },
  retentionRelease: { select: { contract: { select: { id: true, code: true } } } },
} satisfies Prisma.InvoiceInclude;

/** Where a bill came from when Billing raised it, e.g. "RA-02 on CT-0003". */
export interface InvoiceSource {
  kind: 'ra_bill' | 'retention_release';
  label: string;
  contractId: string;
  raBillId: string | null;
}

function invoiceSource(invoice: InvoiceListRecord): InvoiceSource | null {
  if (invoice.raBill) {
    const { id, sequence, contract } = invoice.raBill;
    return { kind: 'ra_bill', label: `RA-${String(sequence).padStart(2, '0')} on ${contract.code}`, contractId: contract.id, raBillId: id };
  }
  if (invoice.retentionRelease) {
    const { contract } = invoice.retentionRelease;
    return { kind: 'retention_release', label: `Retention release on ${contract.code}`, contractId: contract.id, raBillId: null };
  }
  return null;
}

export const INVOICE_DETAIL_INCLUDE = {
  ...INVOICE_LIST_INCLUDE,
  reviewedBy: NAME_REF,
  payments: { include: PAYMENT_INCLUDE, orderBy: { createdAt: 'asc' } },
} satisfies Prisma.InvoiceInclude;

type InvoiceListRecord = Prisma.InvoiceGetPayload<{ include: typeof INVOICE_LIST_INCLUDE }>;
type InvoiceDetailRecord = Prisma.InvoiceGetPayload<{ include: typeof INVOICE_DETAIL_INCLUDE }>;

export interface InvoiceView {
  id: string;
  invoiceNumber: string;
  vendorName: string;
  vendor: NamedRef | null;
  project: NamedRef | null;
  purchaseOrder: { id: string; poNumber: string } | null;
  category: string;
  description: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  /** Still owed to the vendor once the bill is approved. */
  balanceDue: number;
  /** Balance not yet covered by a pending, approved or paid payment; the most a new payment can be. */
  unscheduledAmount: number;
  status: InvoiceStatus;
  isOverdue: boolean;
  daysOverdue: number;
  issuedDate: Date;
  dueDate: Date;
  paidDate: Date | null;
  submittedAt: Date | null;
  createdBy: NamedRef | null;
  matchStatus: MatchStatus;
  lineCount: number;
  source: InvoiceSource | null;
}

export interface InvoiceLineView {
  id: string;
  poLineItemId: string | null;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  taxPercent: number;
  amount: number;
  taxAmount: number;
  total: number;
}

export interface InvoiceTimelineEvent {
  id: string;
  title: string;
  description: string | null;
  actor: string;
  date: Date;
}

export interface InvoiceDetailView extends InvoiceView {
  notes: string;
  reviewedBy: NamedRef | null;
  reviewedAt: Date | null;
  reviewNote: string | null;
  items: InvoiceLineView[];
  match: InvoiceMatch;
  payments: PaymentView[];
  timeline: InvoiceTimelineEvent[];
}

interface PaymentAmount {
  amount: Prisma.Decimal | number;
  status: string;
}

function sumPayments(payments: PaymentAmount[], statuses: string[]): number {
  return roundMoney(payments.filter((payment) => statuses.includes(payment.status)).reduce((sum, payment) => sum + toNumber(payment.amount), 0));
}

export function toInvoiceView(invoice: InvoiceListRecord | InvoiceDetailRecord, matchStatus: MatchStatus, today: Date): InvoiceView {
  const totalAmount = toNumber(invoice.totalAmount);
  const paidAmount = sumPayments(invoice.payments, ['PAID']);
  const committed = sumPayments(invoice.payments, COMMITTED_PAYMENT_STATUSES);
  const isPayable = PAYABLE_INVOICE_STATUSES.includes(invoice.status);
  const daysPastDue = wholeDaysBetween(invoice.dueDate, today);
  const isOverdue = isPayable && daysPastDue > 0;

  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    vendorName: invoice.vendorName,
    vendor: invoice.vendor,
    project: invoice.project,
    purchaseOrder: invoice.purchaseOrder,
    category: invoice.category,
    description: invoice.description,
    amount: toNumber(invoice.amount),
    taxAmount: toNumber(invoice.taxAmount),
    totalAmount,
    paidAmount,
    balanceDue: isPayable ? roundMoney(Math.max(0, totalAmount - paidAmount)) : 0,
    unscheduledAmount: isPayable ? roundMoney(Math.max(0, totalAmount - committed)) : 0,
    status: invoice.status,
    isOverdue,
    daysOverdue: isOverdue ? daysPastDue : 0,
    issuedDate: invoice.issuedDate,
    dueDate: invoice.dueDate,
    paidDate: invoice.paidDate,
    submittedAt: invoice.submittedAt,
    createdBy: invoice.createdBy,
    matchStatus,
    lineCount: invoice.items.length,
    source: invoiceSource(invoice),
  };
}

export function toInvoiceLineView(item: InvoiceListRecord['items'][number]): InvoiceLineView {
  const quantity = toNumber(item.quantity);
  const rate = toNumber(item.rate);
  const amount = roundMoney(quantity * rate);
  const taxAmount = roundMoney(amount * (item.taxPercent / 100));
  return {
    id: item.id,
    poLineItemId: item.poLineItemId,
    description: item.description,
    unit: item.unit,
    quantity,
    rate,
    taxPercent: item.taxPercent,
    amount,
    taxAmount,
    total: roundMoney(amount + taxAmount),
  };
}

export function toInvoiceDetailView(
  invoice: InvoiceDetailRecord,
  match: InvoiceMatch,
  timeline: InvoiceTimelineEvent[],
  today: Date,
): InvoiceDetailView {
  return {
    ...toInvoiceView(invoice, match.status, today),
    notes: invoice.notes,
    reviewedBy: invoice.reviewedBy,
    reviewedAt: invoice.reviewedAt,
    reviewNote: invoice.reviewNote,
    items: invoice.items.map(toInvoiceLineView),
    match,
    payments: invoice.payments.map((payment) => toPaymentView(payment, today)),
    timeline,
  };
}

/** Header totals are stored (reports read them) but always derived from the lines on write. */
export function invoiceTotals(items: { quantity: number; rate: number; taxPercent: number }[]): {
  amount: number; taxAmount: number; totalAmount: number;
} {
  const amount = roundMoney(items.reduce((sum, item) => sum + roundMoney(item.quantity * item.rate), 0));
  const taxAmount = roundMoney(items.reduce(
    (sum, item) => sum + roundMoney(roundMoney(item.quantity * item.rate) * (item.taxPercent / 100)),
    0,
  ));
  return { amount, taxAmount, totalAmount: roundMoney(amount + taxAmount) };
}
