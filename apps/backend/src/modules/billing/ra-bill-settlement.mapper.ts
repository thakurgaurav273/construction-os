import { InvoiceStatus, Prisma } from '@prisma/client';
import { wholeDaysBetween } from '../procurement/procurement-math';
import { roundMoney } from './billing-math';

/** Loaded with a bill so its detail view can show where the money stands. */
export const SETTLEMENT_INCLUDE = {
  receipts: { orderBy: { receivedDate: 'asc' } },
  invoice: { select: { id: true, invoiceNumber: true, status: true, totalAmount: true, payments: { select: { amount: true, status: true } } } },
} satisfies Prisma.RaBillInclude;

type SettlementRecord = Prisma.RaBillGetPayload<{ include: typeof SETTLEMENT_INCLUDE }> & {
  contract: { direction: 'CLIENT' | 'SUBCONTRACT' };
};

export interface ReceiptView {
  id: string;
  amount: number;
  receivedDate: Date;
  method: string;
  reference: string;
  notes: string;
  voided: boolean;
  voidNote: string | null;
}

export type SettlementView =
  | {
    kind: 'payable';
    dueDate: Date | null;
    /** The vendor bill in Finance; null when nothing was owed. */
    invoice: { id: string; invoiceNumber: string; status: InvoiceStatus; totalAmount: number; paidAmount: number; balanceDue: number } | null;
  }
  | {
    kind: 'receivable';
    dueDate: Date | null;
    invoiceNumber: string | null;
    received: number;
    outstanding: number;
    daysOverdue: number;
    receipts: ReceiptView[];
  };

/** Null until the bill is certified: before that nothing is owed either way. */
export function toSettlementView(bill: SettlementRecord, today: Date): SettlementView | null {
  // An opening balance was settled before SitePilot.
  if (bill.status !== 'CERTIFIED' || bill.isOpeningBalance) return null;

  if (bill.contract.direction === 'SUBCONTRACT') {
    const invoice = bill.invoice;
    if (!invoice) return { kind: 'payable', dueDate: bill.dueDate, invoice: null };
    const totalAmount = invoice.totalAmount.toNumber();
    const paidAmount = roundMoney(invoice.payments.filter((payment) => payment.status === 'PAID').reduce((sum, payment) => sum + payment.amount.toNumber(), 0));
    return {
      kind: 'payable',
      dueDate: bill.dueDate,
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        totalAmount,
        paidAmount,
        balanceDue: invoice.status === 'CANCELLED' ? 0 : roundMoney(Math.max(0, totalAmount - paidAmount)),
      },
    };
  }

  const received = roundMoney(bill.receipts.filter((receipt) => !receipt.voidedAt).reduce((sum, receipt) => sum + receipt.amount.toNumber(), 0));
  const outstanding = roundMoney(Math.max(0, bill.netAmount.toNumber() - received));
  return {
    kind: 'receivable',
    dueDate: bill.dueDate,
    invoiceNumber: bill.invoiceNumber,
    received,
    outstanding,
    daysOverdue: outstanding > 0 && bill.dueDate ? Math.max(0, wholeDaysBetween(bill.dueDate, today)) : 0,
    receipts: bill.receipts.map((receipt) => ({
      id: receipt.id,
      amount: receipt.amount.toNumber(),
      receivedDate: receipt.receivedDate,
      method: receipt.method,
      reference: receipt.reference,
      notes: receipt.notes,
      voided: receipt.voidedAt !== null,
      voidNote: receipt.voidNote,
    })),
  };
}
