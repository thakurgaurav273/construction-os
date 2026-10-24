import type { MeasurementType } from '../types';

export interface MeasurementPreviewInput {
  type: MeasurementType;
  nos?: number | null;
  length?: number | null;
  breadth?: number | null;
  height?: number | null;
  unitWeight?: number | null;
  quantity?: number | null;
  isDeduction: boolean;
}

const factor = (value: number | null | undefined): number => (value === null || value === undefined || Number.isNaN(value) ? 1 : value);

/**
 * Live preview while typing; the server recomputes every row when it is saved (billing-math.ts), so this
 * is never stored. Blank dimensions count as 1 and deductions come out negative.
 */
export function previewMeasurement(row: MeasurementPreviewInput): number {
  let quantity: number;
  if (row.type === 'DIRECT') quantity = row.quantity ?? 0;
  else if (row.type === 'STEEL') quantity = factor(row.nos) * (row.length ?? 0) * (row.unitWeight ?? 0);
  else quantity = factor(row.nos) * factor(row.length) * factor(row.breadth) * factor(row.height);
  const rounded = Math.round(Math.abs(quantity || 0) * 1000) / 1000;
  return row.isDeduction ? -rounded : rounded;
}
