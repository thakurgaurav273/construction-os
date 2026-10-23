/** Mirrors the finance views returned by the backend (apps/backend/src/modules/finance/*.mapper.ts). */
import type { NamedRef } from '@/features/procurement/types';

export type InvoiceStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'PARTIALLY_PAID' | 'PAID' | 'REJECTED' | 'CANCELLED';
export type PaymentStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED' | 'CANCELLED';
export type MatchStatus = 'MATCHED' | 'VARIANCE' | 'NO_PO';
export type MatchIssue = 'QTY_EXCEEDS_RECEIVED' | 'RATE_ABOVE_PO' | 'TAX_MISMATCH' | 'NOT_ON_PO';
export type PaymentMethod = 'bank_transfer' | 'cheque' | 'upi' | 'cash';

export interface Invoice {
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
  balanceDue: number;
  /** The most a new payment against this invoice can be. */
  unscheduledAmount: number;
  status: InvoiceStatus;
  isOverdue: boolean;
  daysOverdue: number;
  issuedDate: string;
  dueDate: string;
  paidDate: string | null;
  submittedAt: string | null;
  createdBy: NamedRef | null;
  matchStatus: MatchStatus;
  lineCount: number;
  /** Set when Billing raised the bill (a certified subcontract RA bill or a retention release). */
  source: { kind: 'ra_bill' | 'retention_release'; label: string; contractId: string; raBillId: string | null } | null;
}

export interface InvoiceLine {
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

export interface MatchLine {
  invoiceItemId: string;
  poLineItemId: string | null;
  orderedQuantity: number | null;
  receivedQuantity: number | null;
  billedElsewhere: number | null;
  billableQuantity: number | null;
  invoicedQuantity: number;
  poRate: number | null;
  invoicedRate: number;
  poTaxPercent: number | null;
  invoicedTaxPercent: number;
  issues: MatchIssue[];
}

export interface Payment {
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
  dueDate: string;
  paidDate: string | null;
  notes: string;
  requestedBy: NamedRef | null;
  reviewedBy: NamedRef | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
  isOverdue: boolean;
}

export interface InvoiceDetail extends Invoice {
  notes: string;
  reviewedBy: NamedRef | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  items: InvoiceLine[];
  match: { status: MatchStatus; lines: MatchLine[] };
  payments: Payment[];
  timeline: { id: string; title: string; description: string | null; actor: string; date: string }[];
}

export interface BillableLine {
  poLineItemId: string;
  description: string;
  unit: string;
  orderedQuantity: number;
  receivedQuantity: number;
  billedQuantity: number;
  billableQuantity: number;
  rate: number;
  taxPercent: number;
}

export interface FinanceSummary {
  budget: { allocated: number; spent: number; committed: number; remaining: number; utilizationPercent: number };
  payables: { outstanding: number; overdueAmount: number; overdueCount: number; dueSoonAmount: number; dueSoonCount: number };
  approvals: {
    invoicesPending: number;
    invoicesPendingValue: number;
    invoicesWithVariance: number;
    paymentsPending: number;
    paymentsPendingValue: number;
    paymentsToRelease: number;
    paymentsToReleaseValue: number;
  };
  paidThisMonth: number;
  paidLastMonth: number;
  netCashFlow: number;
  attention: {
    overdueInvoices: { id: string; invoiceNumber: string; vendorName: string; balanceDue: number; daysOverdue: number }[];
    varianceInvoices: { id: string; invoiceNumber: string; vendorName: string; totalAmount: number }[];
    budgetRisks: { projectName: string; category: string; utilizationPercent: number }[];
  };
}

export interface BudgetLine {
  id: string;
  projectId: string;
  projectName: string;
  category: string;
  allocated: number;
  spent: number;
  committed: number;
  remaining: number;
  variance: number;
  utilizationPercent: number;
}

export interface CashFlowEntry {
  id: string;
  month: number;
  year: number;
  inflow: number;
  outflow: number;
  net: number;
  forecastInflow: number;
  forecastOutflow: number;
  forecastNet: number;
}

/* ---------- Request payloads (match the backend DTOs) ---------- */

export interface InvoiceItemInput {
  poLineItemId?: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  taxPercent: number;
}

export interface InvoiceInput {
  invoiceNumber: string;
  vendorId: string;
  projectId?: string;
  purchaseOrderId?: string;
  category?: string;
  issuedDate: string;
  dueDate: string;
  description: string;
  notes: string;
  items: InvoiceItemInput[];
}

export interface PaymentInput {
  invoiceId: string;
  amount: number;
  dueDate?: string;
  method: PaymentMethod;
  notes?: string;
}

export interface MarkPaidInput {
  paidDate: string;
  reference: string;
  method: PaymentMethod;
}

export interface BudgetHead {
  id: string;
  projectId: string;
  category: string;
  allocated: number;
  committed: number;
  spent: number;
  remaining: number;
  /** Committed plus spent, as a share of the allocation. */
  utilizationPercent: number;
}

export interface ProjectBudget {
  projectId: string;
  projectBudget: number | null;
  heads: BudgetHead[];
  /** Orders and bills in categories that match no head. */
  unbudgeted: { committed: number; spent: number };
  totals: { allocated: number; committed: number; spent: number; remaining: number };
}

export interface BudgetHeadInput {
  category: string;
  allocated: number;
}
