import { ContractDirection, MeasurementType, Prisma, RaBillStatus } from '@prisma/client';
import { adjustmentAmount, roundMoney, roundQuantity } from './billing-math';
import { AdjustmentRuleView, billCode, toAdjustmentView } from './contract.mapper';

const PARTY = { select: { id: true, name: true } } as const;

export const RA_BILL_SUMMARY_INCLUDE = {
  contract: { select: { id: true, code: true, title: true, direction: true, reference: true, client: PARTY, vendor: PARTY } },
  project: PARTY,
  preparedBy: PARTY,
  certifiedBy: PARTY,
} satisfies Prisma.RaBillInclude;

export const RA_BILL_DETAIL_INCLUDE = {
  ...RA_BILL_SUMMARY_INCLUDE,
  contract: {
    select: {
      ...RA_BILL_SUMMARY_INCLUDE.contract.select,
      status: true,
      items: { orderBy: [{ sortOrder: 'asc' }, { itemNo: 'asc' }] },
    },
  },
  lines: true,
  measurements: { orderBy: { sortOrder: 'asc' } },
  adjustments: { orderBy: { sortOrder: 'asc' } },
  events: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.RaBillInclude;

export type SummaryBill = Prisma.RaBillGetPayload<{ include: typeof RA_BILL_SUMMARY_INCLUDE }>;
export type DetailBill = Prisma.RaBillGetPayload<{ include: typeof RA_BILL_DETAIL_INCLUDE }>;

/** Certified quantities of one BOQ line on the contract's earlier certified bills. */
export interface PreviousLine {
  contractItemId: string;
  certifiedQuantity: Prisma.Decimal | null;
  rate: Prisma.Decimal | null;
}

export interface RaBillSummaryView {
  id: string;
  code: string;
  sequence: number;
  status: RaBillStatus;
  reference: string | null;
  periodFrom: Date;
  periodTo: Date;
  grossAmount: number;
  netAmount: number;
  contract: { id: string; code: string; title: string; direction: ContractDirection; reference: string | null };
  project: { id: string; name: string };
  partyName: string | null;
  preparedBy: { id: string; name: string } | null;
  certifiedBy: { id: string; name: string } | null;
  submittedAt: Date | null;
  certifiedAt: Date | null;
  createdAt: Date;
}

export interface MeasurementView {
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

export interface RaBillLineView {
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
  /** Certified when certified, otherwise claimed. */
  thisQuantity: number;
  thisAmount: number;
  upToDateQuantity: number;
  upToDateAmount: number;
  /** Billed to date beyond the BOQ quantity: allowed, but worth a second look. */
  exceedsBoq: boolean;
  measurements: MeasurementView[];
}

export interface BillAdjustmentView extends AdjustmentRuleView {
  amount: number;
}

export interface RaBillDetailView extends RaBillSummaryView {
  notes: string;
  reviewNote: string | null;
  contractStatus: string;
  lines: RaBillLineView[];
  adjustments: BillAdjustmentView[];
  totals: { previousGross: number; claimedGross: number; grossAmount: number; upToDateGross: number; netAmount: number };
  events: { id: string; stage: string; actorName: string; note: string; createdAt: Date }[];
}

const num = (value: Prisma.Decimal | null): number | null => (value === null ? null : value.toNumber());

export function toRaBillSummary(bill: SummaryBill): RaBillSummaryView {
  const { id, code, title, direction, reference, client, vendor } = bill.contract;
  return {
    id: bill.id,
    code: billCode(bill.sequence),
    sequence: bill.sequence,
    status: bill.status,
    reference: bill.reference,
    periodFrom: bill.periodFrom,
    periodTo: bill.periodTo,
    grossAmount: bill.grossAmount.toNumber(),
    netAmount: bill.netAmount.toNumber(),
    contract: { id, code, title, direction, reference },
    project: bill.project,
    partyName: (direction === 'CLIENT' ? client : vendor)?.name ?? null,
    preparedBy: bill.preparedBy,
    certifiedBy: bill.certifiedBy,
    submittedAt: bill.submittedAt,
    certifiedAt: bill.certifiedAt,
    createdAt: bill.createdAt,
  };
}

function toMeasurementView(row: DetailBill['measurements'][number]): MeasurementView {
  return {
    id: row.id,
    description: row.description,
    type: row.type,
    nos: num(row.nos),
    length: num(row.length),
    breadth: num(row.breadth),
    height: num(row.height),
    unitWeight: num(row.unitWeight),
    quantity: row.quantity.toNumber(),
    isDeduction: row.isDeduction,
  };
}

/** The bill's abstract: every BOQ line with previous, this bill and up-to-date quantities and amounts. */
export function toRaBillDetail(bill: DetailBill, previousLines: PreviousLine[]): RaBillDetailView {
  const linesByItem = new Map(bill.lines.map((line) => [line.contractItemId, line]));
  const lines: RaBillLineView[] = bill.contract.items.map((item) => {
    const line = linesByItem.get(item.id);
    const previous = previousLines.filter((entry) => entry.contractItemId === item.id);
    const previousQuantity = roundQuantity(previous.reduce((sum, entry) => sum + (entry.certifiedQuantity?.toNumber() ?? 0), 0));
    const previousAmount = roundMoney(previous.reduce(
      (sum, entry) => sum + (entry.certifiedQuantity?.toNumber() ?? 0) * (entry.rate ?? item.rate).toNumber(),
      0,
    ));
    const rate = (line?.rate ?? item.rate).toNumber();
    const claimedQuantity = line?.claimedQuantity.toNumber() ?? 0;
    const certifiedQuantity = num(line?.certifiedQuantity ?? null);
    const thisQuantity = certifiedQuantity ?? claimedQuantity;
    const thisAmount = roundMoney(thisQuantity * rate);
    const upToDateQuantity = roundQuantity(previousQuantity + thisQuantity);
    return {
      contractItemId: item.id,
      itemNo: item.itemNo,
      rateCode: item.rateCode,
      description: item.description,
      unit: item.unit,
      isExtra: item.isExtra,
      boqQuantity: item.quantity.toNumber(),
      rate,
      previousQuantity,
      previousAmount,
      claimedQuantity,
      claimedAmount: roundMoney(claimedQuantity * rate),
      certifiedQuantity,
      certificationNote: line?.certificationNote ?? null,
      thisQuantity,
      thisAmount,
      upToDateQuantity,
      upToDateAmount: roundMoney(previousAmount + thisAmount),
      exceedsBoq: item.quantity.toNumber() > 0 && upToDateQuantity > item.quantity.toNumber(),
      measurements: bill.measurements.filter((row) => row.contractItemId === item.id).map(toMeasurementView),
    };
  });

  const sum = (pick: (line: RaBillLineView) => number): number => roundMoney(lines.reduce((total, line) => total + pick(line), 0));
  const grossAmount = sum((line) => line.thisAmount);
  const adjustments = bill.adjustments.map((adjustment) => {
    const view = toAdjustmentView(adjustment);
    return { ...view, amount: adjustmentAmount(view, grossAmount) };
  });

  return {
    ...toRaBillSummary(bill),
    notes: bill.notes,
    reviewNote: bill.reviewNote,
    contractStatus: bill.contract.status,
    lines,
    adjustments,
    totals: {
      previousGross: sum((line) => line.previousAmount),
      claimedGross: sum((line) => line.claimedAmount),
      grossAmount,
      upToDateGross: sum((line) => line.upToDateAmount),
      netAmount: roundMoney(grossAmount + adjustments.reduce((total, adjustment) => total + adjustment.amount, 0)),
    },
    events: bill.events.map(({ id, stage, actorName, note, createdAt }) => ({ id, stage, actorName, note, createdAt })),
  };
}
