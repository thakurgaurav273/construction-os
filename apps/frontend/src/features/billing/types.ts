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
}

export interface ContractBillSummary {
  id: string;
  code: string;
  sequence: number;
  status: RaBillStatus;
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
}

export interface ContractDetail extends ContractSummary {
  notes: string;
  items: ContractItem[];
  adjustments: (AdjustmentRule & { id: string })[];
  bills: ContractBillSummary[];
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
  adjustments: (AdjustmentRule & { id: string; amount: number })[];
  totals: { previousGross: number; claimedGross: number; grossAmount: number; upToDateGross: number; netAmount: number };
  events: { id: string; stage: string; actorName: string; note: string; createdAt: string }[];
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
