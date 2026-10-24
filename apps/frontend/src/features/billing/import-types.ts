import type { MeasurementType } from './types';
import type { RowOutcome } from '@/hooks/api/use-data-import';

/** Mirrors billing/import on the backend. */

export interface BoqImportResult {
  sheetName: string;
  summary: { create: number; update: number; skip: number; error: number };
  rows: RowOutcome[];
  opening: { itemCount: number; quantityLines: number; allowed: boolean; reason: string | null; lastBillNumber: number | null };
}

export interface ImportedMeasurement {
  rowNumber: number;
  section: string;
  description: string;
  type: MeasurementType;
  nos: number | null;
  length: number | null;
  breadth: number | null;
  height: number | null;
  quantity: number;
  isDeduction: boolean;
  note: string | null;
}

export interface MeasurementImportItem {
  itemNo: string;
  heading: string;
  contractItem: { id: string; itemNo: string; description: string; unit: string } | null;
  rows: ImportedMeasurement[];
  measuredQuantity: number;
  sheetTotals: { payable: number | null; hold: number | null; paid: number | null };
  replacesRows: number;
  warnings: string[];
  error: string | null;
}

export interface MeasurementImportResult {
  sheetName: string;
  sections: { label: string; rows: number; selected: boolean }[];
  items: MeasurementImportItem[];
  summary: { items: number; importable: number; unmatched: number; rows: number; warnings: number; ignoredRows: number };
}
