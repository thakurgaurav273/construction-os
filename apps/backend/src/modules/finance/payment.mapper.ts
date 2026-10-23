import { PaymentStatus, Prisma } from '@prisma/client';
import { NAME_REF, NamedRef } from '../procurement/delivery.mapper';
import { toNumber, wholeDaysBetween } from '../procurement/procurement-math';

export const PAYMENT_INCLUDE = {
  invoice: { select: { id: true, invoiceNumber: true } },
  vendor: NAME_REF,
  project: NAME_REF,
  requestedBy: NAME_REF,
  reviewedBy: NAME_REF,
} satisfies Prisma.PaymentInclude;

type PaymentRecord = Prisma.PaymentGetPayload<{ include: typeof PAYMENT_INCLUDE }>;

export interface PaymentView {
  id: string;
  paymentNumber: string;
  invoice: { id: string; invoiceNumber: string } | null;
  vendorName: string;
  vendor: NamedRef | null;
  project: NamedRef | null;
  category: string;
  amount: number;
  status: PaymentStatus;
  method: string;
  reference: string;
  dueDate: Date;
  paidDate: Date | null;
  notes: string;
  requestedBy: NamedRef | null;
  reviewedBy: NamedRef | null;
  reviewedAt: Date | null;
  reviewNote: string | null;
  createdAt: Date;
  /** Not yet paid and past its planned payment date. */
  isOverdue: boolean;
}

export function toPaymentView(payment: PaymentRecord, today: Date): PaymentView {
  const isOpen = payment.status === 'PENDING' || payment.status === 'APPROVED';
  return {
    id: payment.id,
    paymentNumber: payment.paymentNumber,
    invoice: payment.invoice,
    vendorName: payment.vendorName,
    vendor: payment.vendor,
    project: payment.project,
    category: payment.category,
    amount: toNumber(payment.amount),
    status: payment.status,
    method: payment.method,
    reference: payment.reference,
    dueDate: payment.dueDate,
    paidDate: payment.paidDate,
    notes: payment.notes,
    requestedBy: payment.requestedBy,
    reviewedBy: payment.reviewedBy,
    reviewedAt: payment.reviewedAt,
    reviewNote: payment.reviewNote,
    createdAt: payment.createdAt,
    isOverdue: isOpen && wholeDaysBetween(payment.dueDate, today) > 0,
  };
}
