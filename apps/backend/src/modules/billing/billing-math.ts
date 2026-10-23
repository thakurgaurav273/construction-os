import type { BillAdjustmentCalculation, BillAdjustmentEffect, MeasurementType } from '@prisma/client';

export interface MeasurementInput {
  type: MeasurementType;
  nos?: number | null;
  length?: number | null;
  breadth?: number | null;
  height?: number | null;
  unitWeight?: number | null;
  /** Used only for DIRECT. */
  quantity?: number | null;
  isDeduction: boolean;
}

export interface AdjustmentInput {
  effect: BillAdjustmentEffect;
  calculation: BillAdjustmentCalculation;
  value: number;
}

export function roundQuantity(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

const factor = (value: number | null | undefined): number => (value === null || value === undefined ? 1 : value);

/**
 * Quantity of one measurement book row, signed: deductions such as door openings come out negative.
 * Dimensions left blank count as 1, so "2 nos × 3.5 m" is a valid length measurement.
 */
export function measurementQuantity(row: MeasurementInput): number {
  let quantity: number;
  if (row.type === 'DIRECT') quantity = row.quantity ?? 0;
  else if (row.type === 'STEEL') quantity = factor(row.nos) * (row.length ?? 0) * (row.unitWeight ?? 0);
  else quantity = factor(row.nos) * factor(row.length) * factor(row.breadth) * factor(row.height);
  const rounded = roundQuantity(Math.abs(quantity));
  return row.isDeduction ? -rounded : rounded;
}

/** Signed amount of a tax or deduction line on a bill with the given gross. */
export function adjustmentAmount(adjustment: AdjustmentInput, grossAmount: number): number {
  const amount = adjustment.calculation === 'PERCENT' ? (grossAmount * adjustment.value) / 100 : adjustment.value;
  const rounded = roundMoney(amount);
  return adjustment.effect === 'DEDUCT' ? -rounded : rounded;
}

export interface BillTotals {
  grossAmount: number;
  adjustments: number[];
  netAmount: number;
}

export function billTotals(lineAmounts: number[], adjustments: AdjustmentInput[]): BillTotals {
  const grossAmount = roundMoney(lineAmounts.reduce((sum, amount) => sum + amount, 0));
  const amounts = adjustments.map((adjustment) => adjustmentAmount(adjustment, grossAmount));
  return { grossAmount, adjustments: amounts, netAmount: roundMoney(grossAmount + amounts.reduce((sum, amount) => sum + amount, 0)) };
}
