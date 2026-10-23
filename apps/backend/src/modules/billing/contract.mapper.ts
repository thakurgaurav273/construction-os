import {
  BillAdjustmentCalculation, BillAdjustmentEffect, ContractDirection, ContractStatus, Prisma, RaBillStatus,
} from '@prisma/client';
import { roundMoney } from './billing-math';
import { OPEN_BILL_STATUSES } from './billing.constants';
import type { RetentionView } from './retention.service';

export const CONTRACT_INCLUDE = {
  project: { select: { id: true, name: true } },
  client: { select: { id: true, name: true } },
  vendor: { select: { id: true, name: true } },
  items: { orderBy: [{ sortOrder: 'asc' }, { itemNo: 'asc' }] },
  adjustments: { orderBy: { sortOrder: 'asc' } },
  bills: {
    select: { id: true, sequence: true, status: true, grossAmount: true, netAmount: true, periodFrom: true, periodTo: true },
    orderBy: { sequence: 'asc' },
  },
} satisfies Prisma.ContractInclude;

export type LoadedContract = Prisma.ContractGetPayload<{ include: typeof CONTRACT_INCLUDE }>;

export interface ContractParty {
  kind: 'client' | 'vendor';
  id: string;
  name: string;
}

export interface AdjustmentRuleView {
  id: string;
  label: string;
  effect: BillAdjustmentEffect;
  calculation: BillAdjustmentCalculation;
  value: number;
  isRetention: boolean;
}

export interface ContractBillSummary {
  id: string;
  code: string;
  sequence: number;
  status: RaBillStatus;
  grossAmount: number;
  netAmount: number;
  periodFrom: Date;
  periodTo: Date;
}

export interface ContractSummaryView {
  id: string;
  code: string;
  direction: ContractDirection;
  reference: string | null;
  title: string;
  status: ContractStatus;
  project: { id: string; name: string };
  party: ContractParty | null;
  startDate: Date | null;
  endDate: Date | null;
  itemCount: number;
  /** BOQ value: Σ quantity × rate. */
  contractValue: number;
  /** Gross of all certified bills. */
  certifiedToDate: number;
  billCount: number;
  openBill: ContractBillSummary | null;
  createdAt: Date;
}

export interface ContractItemView {
  id: string;
  itemNo: string;
  rateCode: string | null;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
  isExtra: boolean;
  /** Certified across all certified bills. */
  certifiedQuantity: number;
  /** On any bill, so it can't be removed from the BOQ. */
  inUse: boolean;
}

export interface ContractDetailView extends ContractSummaryView {
  notes: string;
  paymentTermDays: number;
  items: ContractItemView[];
  adjustments: AdjustmentRuleView[];
  bills: ContractBillSummary[];
  retention: RetentionView;
}

export function billCode(sequence: number): string {
  return `RA-${String(sequence).padStart(2, '0')}`;
}

interface StoredAdjustment {
  id: string;
  label: string;
  effect: BillAdjustmentEffect;
  calculation: BillAdjustmentCalculation;
  value: Prisma.Decimal;
  isRetention: boolean;
}

export function toAdjustmentView(rule: StoredAdjustment): AdjustmentRuleView {
  return {
    id: rule.id, label: rule.label, effect: rule.effect, calculation: rule.calculation, value: rule.value.toNumber(), isRetention: rule.isRetention,
  };
}

function partyOf(contract: LoadedContract): ContractParty | null {
  if (contract.direction === 'CLIENT') return contract.client && { kind: 'client', ...contract.client };
  return contract.vendor && { kind: 'vendor', ...contract.vendor };
}

function toBillSummary(bill: LoadedContract['bills'][number]): ContractBillSummary {
  return {
    id: bill.id,
    code: billCode(bill.sequence),
    sequence: bill.sequence,
    status: bill.status,
    grossAmount: bill.grossAmount.toNumber(),
    netAmount: bill.netAmount.toNumber(),
    periodFrom: bill.periodFrom,
    periodTo: bill.periodTo,
  };
}

export function toContractSummary(contract: LoadedContract): ContractSummaryView {
  const certified = contract.bills.filter((bill) => bill.status === 'CERTIFIED');
  const openBill = contract.bills.find((bill) => OPEN_BILL_STATUSES.includes(bill.status));
  return {
    id: contract.id,
    code: contract.code,
    direction: contract.direction,
    reference: contract.reference,
    title: contract.title,
    status: contract.status,
    project: contract.project,
    party: partyOf(contract),
    startDate: contract.startDate,
    endDate: contract.endDate,
    itemCount: contract.items.length,
    contractValue: roundMoney(contract.items.reduce((sum, item) => sum + item.quantity.toNumber() * item.rate.toNumber(), 0)),
    certifiedToDate: roundMoney(certified.reduce((sum, bill) => sum + bill.grossAmount.toNumber(), 0)),
    billCount: contract.bills.filter((bill) => bill.status !== 'CANCELLED').length,
    openBill: openBill ? toBillSummary(openBill) : null,
    createdAt: contract.createdAt,
  };
}

export function toContractDetail(
  contract: LoadedContract,
  certifiedByItem: Map<string, number>,
  itemsInUse: Set<string>,
  retention: RetentionView,
): ContractDetailView {
  return {
    ...toContractSummary(contract),
    notes: contract.notes,
    paymentTermDays: contract.paymentTermDays,
    items: contract.items.map((item) => ({
      id: item.id,
      itemNo: item.itemNo,
      rateCode: item.rateCode,
      description: item.description,
      unit: item.unit,
      quantity: item.quantity.toNumber(),
      rate: item.rate.toNumber(),
      amount: roundMoney(item.quantity.toNumber() * item.rate.toNumber()),
      isExtra: item.isExtra,
      certifiedQuantity: certifiedByItem.get(item.id) ?? 0,
      inUse: itemsInUse.has(item.id),
    })),
    adjustments: contract.adjustments.map(toAdjustmentView),
    bills: contract.bills.map(toBillSummary),
    retention,
  };
}
