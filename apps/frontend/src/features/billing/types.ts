/** Mirrors the backend billing module (contract.mapper.ts, ra-bill.mapper.ts). Dates arrive as ISO strings. */

export type ContractDirection = 'CLIENT' | 'SUBCONTRACT';
export type ContractStatus = 'ACTIVE' | 'CLOSED';
export type RaBillStatus = 'DRAFT' | 'SUBMITTED' | 'CHANGES_REQUESTED' | 'CERTIFIED' | 'CANCELLED';
export type AdjustmentEffect = 'ADD' | 'DEDUCT';
export type AdjustmentCalculation = 'PERCENT' | 'FIXED';
export type MeasurementType = 'DIMENSIONS' | 'STEEL' | 'DIRECT';

export interface Client {
  id: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  gstNumber: string | null;
  address: string | null;
  contractCount: number;
  createdAt: string;
}

export interface ClientInput {
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  gstNumber: string | null;
  address: string | null;
}

export interface AdjustmentRule {
  label: string;
  effect: AdjustmentEffect;
  calculation: AdjustmentCalculation;
  value: number;
  /** Held back and released later (security deposit, retention), not a final deduction. */
  isRetention: boolean;
}

export interface ContractBillSummary {
  id: string;
  code: string;
  sequence: number;
  status: RaBillStatus;
  isOpeningBalance: boolean;
  grossAmount: number;
  netAmount: number;
  periodFrom: string;
  periodTo: string;
}

export interface ContractSummary {
  id: string;
  code: string;
  direction: ContractDirection;
  reference: string | null;
  title: string;
  status: ContractStatus;
  project: { id: string; name: string };
  party: { kind: 'client' | 'vendor'; id: string; name: string } | null;
  startDate: string | null;
  endDate: string | null;
  itemCount: number;
  contractValue: number;
  certifiedToDate: number;
  billCount: number;
  openBill: ContractBillSummary | null;
  createdAt: string;
}

export interface ContractItem {
  id: string;
  itemNo: string;
  rateCode: string | null;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
  isExtra: boolean;
  certifiedQuantity: number;
  inUse: boolean;
  /** On a subcontract: the client BOQ line this delivers. */
  clientItemId: string | null;
}

export interface RetentionRelease {
  id: string;
  amount: number;
  releasedOn: string;
  reference: string;
  note: string;
  /** The vendor bill raised to pay it (subcontracts). */
  invoiceId: string | null;
  createdAt: string;
}

export interface Retention {
  held: number;
  released: number;
  balance: number;
  byBill: { billId: string; code: string; amount: number }[];
  releases: RetentionRelease[];
}

export interface ContractDetail extends ContractSummary {
  notes: string;
  paymentTermDays: number;
  items: ContractItem[];
  adjustments: (AdjustmentRule & { id: string })[];
  bills: ContractBillSummary[];
  retention: Retention;
  /** Material issued to the subcontractor (subcontracts only). */
  materials: { issuedValue: number; recoveredValue: number; pendingValue: number } | null;
}

export interface ContractInput {
  direction: ContractDirection;
  projectId: string;
  clientId: string | null;
  vendorId: string | null;
  reference: string | null;
  title: string;
  startDate: string | null;
  endDate: string | null;
  notes: string;
  paymentTermDays: number;
  adjustments: AdjustmentRule[];
}

export interface ContractItemInput {
  id?: string;
  itemNo: string;
  rateCode: string | null;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  isExtra: boolean;
}

export interface RaBillSummary {
  id: string;
  code: string;
  sequence: number;
  status: RaBillStatus;
  /** Quantities certified before SitePilot, imported with the BOQ. */
  isOpeningBalance: boolean;
  reference: string | null;
  periodFrom: string;
  periodTo: string;
  grossAmount: number;
  netAmount: number;
  contract: { id: string; code: string; title: string; direction: ContractDirection; reference: string | null };
  project: { id: string; name: string };
  partyName: string | null;
  preparedBy: { id: string; name: string } | null;
  certifiedBy: { id: string; name: string } | null;
  submittedAt: string | null;
  certifiedAt: string | null;
  dueDate: string | null;
  createdAt: string;
}

export interface Measurement {
  id: string;
  description: string;
  type: MeasurementType;
  nos: number | null;
  length: number | null;
  breadth: number | null;
  height: number | null;
  unitWeight: number | null;
  quantity: number;
  isDeduction: boolean;
}

export type MeasurementInput = Omit<Measurement, 'id' | 'quantity'> & { quantity: number | null };

export interface RaBillLine {
  contractItemId: string;
  itemNo: string;
  rateCode: string | null;
  description: string;
  unit: string;
  isExtra: boolean;
  boqQuantity: number;
  rate: number;
  previousQuantity: number;
  previousAmount: number;
  claimedQuantity: number;
  claimedAmount: number;
  certifiedQuantity: number | null;
  certificationNote: string | null;
  thisQuantity: number;
  thisAmount: number;
  upToDateQuantity: number;
  upToDateAmount: number;
  exceedsBoq: boolean;
  measurements: Measurement[];
}

export interface RaBillDetail extends RaBillSummary {
  notes: string;
  reviewNote: string | null;
  contractStatus: ContractStatus;
  lines: RaBillLine[];
  adjustments: (AdjustmentRule & { id: string; amount: number; kind: 'MANUAL' | 'MATERIAL_RECOVERY' })[];
  totals: { previousGross: number; claimedGross: number; grossAmount: number; upToDateGross: number; netAmount: number };
  events: { id: string; stage: string; actorName: string; note: string; createdAt: string }[];
  settlement: Settlement | null;
}

export interface Receipt {
  id: string;
  amount: number;
  receivedDate: string;
  method: string;
  reference: string;
  notes: string;
  voided: boolean;
  voidNote: string | null;
}

/** Where the money stands once a bill is certified. */
export type Settlement =
  | {
    kind: 'payable';
    dueDate: string | null;
    invoice: { id: string; invoiceNumber: string; status: string; totalAmount: number; paidAmount: number; balanceDue: number } | null;
  }
  | {
    kind: 'receivable';
    dueDate: string | null;
    invoiceNumber: string | null;
    received: number;
    outstanding: number;
    daysOverdue: number;
    receipts: Receipt[];
  };

export interface ReceiptInput {
  amount: number;
  receivedDate: string;
  method: string;
  reference: string;
  notes: string;
}

export interface RetentionReleaseInput {
  amount: number;
  releasedOn: string;
  reference: string;
  note: string;
}

export interface Receivable extends RaBillSummary {
  invoiceNumber: string | null;
  received: number;
  outstanding: number;
  daysOverdue: number;
}

export interface AgeingBuckets {
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  over90: number;
}

export interface Receivables {
  items: Receivable[];
  totals: { outstanding: number; overdue: number; ageing: AgeingBuckets };
}

export interface RaBillInput {
  periodFrom: string;
  periodTo: string;
  reference: string | null;
  notes: string;
}

export interface CertifiedLineInput {
  contractItemId: string;
  certifiedQuantity: number;
  note: string | null;
}
