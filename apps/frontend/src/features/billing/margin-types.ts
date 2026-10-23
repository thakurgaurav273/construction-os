/** Mirrors billing/margin and billing/recovery on the backend. */

export interface RecoverableMaterial {
  materialId: string;
  name: string;
  unit: string;
  issued: number;
  returned: number;
  quantity: number;
  amount: number;
  notes: string[];
}

export interface MaterialRecovery {
  pending: RecoverableMaterial[];
  onBill: { adjustmentId: string; label: string; amount: number; codes: string[] }[];
}

export interface ClientItemOption {
  id: string;
  itemNo: string;
  rateCode: string | null;
  description: string;
  unit: string;
  rate: number;
}

export interface ItemLinkOptions {
  clientContracts: { id: string; code: string; title: string; partyName: string | null; items: ClientItemOption[] }[];
  suggestions: Record<string, string>;
}

export interface MarginSubcontractLine {
  contractId: string;
  contractCode: string;
  vendorName: string | null;
  itemId: string;
  itemNo: string;
  unit: string;
  rate: number;
  certifiedQuantity: number;
  cost: number;
}

export interface MarginRow {
  clientItemId: string;
  contract: { id: string; code: string; partyName: string | null };
  itemNo: string;
  description: string;
  unit: string;
  rate: number;
  certifiedQuantity: number;
  billed: number;
  subcontracts: MarginSubcontractLine[];
  cost: number;
  margin: number;
  marginPercent: number | null;
  rateMargin: number | null;
}

export interface Margin {
  project: { id: string; name: string };
  rows: MarginRow[];
  unlinked: MarginSubcontractLine[];
  totals: { billed: number; subcontractCost: number; unlinkedCost: number; margin: number; marginPercent: number | null; materialRecovered: number };
}
