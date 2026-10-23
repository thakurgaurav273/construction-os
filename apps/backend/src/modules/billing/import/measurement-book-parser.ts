import type { MeasurementType } from '@prisma/client';
import { parseNumber } from '../../data-import/cell-parsers';
import type { MappedRow } from '../../data-import/import-mapping';
import { roundQuantity } from '../billing-math';

/**
 * Reads a measurement book laid out the way site teams write them: a row with an item number starts each
 * item; under it come optional bill sections ("RA Bill 1st"), measurement rows, deduction rows, notes and
 * the sheet's own total / hold / paid rows. Everything is decided by fixed rules, never by AI.
 */

/** "RA Bill 1st", "R.A. Bill No. 2", "Running Bill 3", "Running Account Bill-04". */
const BILL_SECTION = /^\s*(r\.?\s*a\.?|running(\s+account)?)\s*bill\b/i;
/** Total rows carry the sheet's own arithmetic, used only to cross-check ours. */
const TOTAL_ROW = /^\s*(total|sub[\s-]?total|grand\s+total|net\s+total)\b/i;
const HOLD_ROW = /\bhold|held\b/i;
const PAID_ROW = /\b(to\s+be\s+)?paid\b/i;
/** Common spellings in real sheets, including the frequent "Desuction". */
const DEDUCTION_ROW = /^\s*(less\b|deduct|desuct|deductions?\b|minus\b|\(-\))/i;

const NO_SECTION = 'No bill section';

export interface ParsedMeasurement {
  rowNumber: number;
  section: string;
  description: string;
  type: MeasurementType;
  nos: number | null;
  length: number | null;
  breadth: number | null;
  height: number | null;
  /** Always positive; deductions are flagged. */
  quantity: number;
  isDeduction: boolean;
  /** Why the row was kept as an entered quantity instead of its dimensions. */
  note: string | null;
}

export interface ParsedBookItem {
  itemNo: string;
  rowNumber: number;
  heading: string;
  measurements: ParsedMeasurement[];
  /** The sheet's own figures for the item, when it states them. */
  sheetTotals: { payable: number | null; hold: number | null; paid: number | null };
}

export interface ParsedMeasurementBook {
  items: ParsedBookItem[];
  /** Section labels in the order they first appear, e.g. ["RA Bill 1st", "RA Bill 2nd"]. */
  sections: string[];
  /** Rows above the first item (title block) plus text-only rows such as sub-headings and working notes. */
  ignoredRows: number;
}

const toNumber = (text: string): number | null => {
  const value = parseNumber(text);
  return typeof value === 'number' ? value : null;
};

/** Measurements keep 4 decimals; averaged widths such as 25.26875 carry more. */
/** Half of 0.01: how far a 2-decimal figure in a sheet can sit from the value it was rounded from. */
const DISPLAY_ROUNDING = 0.005;

const stored = (value: number | null): number | null => (value === null ? null : Math.round(value * 10_000) / 10_000);

const product = (values: (number | null)[]): number => values.reduce<number>((total, value) => total * (value ?? 1), 1);

interface Classification {
  type: MeasurementType;
  note: string | null;
  /** Set when the row is kept as a quantity but its dimensions are worth showing, e.g. "1 × 155.1 × 25.26875". */
  dimensionsText: string | null;
}

/**
 * Keeps a row as Nos × L × B × H only when that reproduces the sheet's quantity exactly as stored. Numbers
 * that are really labels (12 in a "Dia" column) or dimensions with more decimals than SitePilot keeps fall
 * back to the sheet's own quantity, so imported claims always match the sheet to the last decimal.
 */
function classify(nos: number | null, length: number | null, breadth: number | null, height: number | null, quantity: number): Classification {
  const dimensions = [length, breadth, height];
  if (dimensions.every((value) => value === null)) return { type: 'DIRECT', note: null, dimensionsText: null };
  const target = roundQuantity(Math.abs(quantity));
  const exact = Math.abs(product([nos, ...dimensions]));
  if (Math.abs(exact - target) > Math.max(DISPLAY_ROUNDING, target * 0.005)) {
    return { type: 'DIRECT', note: `The dimensions don’t multiply to ${quantity}, so the sheet’s quantity was kept.`, dimensionsText: null };
  }
  // Sheets often show quantities to 2 decimals; within that rounding the dimensions are the more exact figure.
  if (Math.abs(roundQuantity(Math.abs(product([stored(nos), ...dimensions.map(stored)]))) - target) <= DISPLAY_ROUNDING) {
    return { type: 'DIMENSIONS', note: null, dimensionsText: null };
  }
  const text = [nos, ...dimensions].filter((value): value is number => value !== null).join(' × ');
  return { type: 'DIRECT', note: 'Kept as the sheet’s quantity because the dimensions have more than 4 decimals.', dimensionsText: text };
}

export function parseMeasurementBook(rows: MappedRow[]): ParsedMeasurementBook {
  const items = new Map<string, ParsedBookItem>();
  const sections: string[] = [];
  let current: ParsedBookItem | null = null;
  let section = NO_SECTION;
  let ignoredRows = 0;

  const addMeasurement = (item: ParsedBookItem, row: MappedRow, description: string, quantity: number): void => {
    const nos = toNumber(row.values.nos ?? '');
    const length = toNumber(row.values.length ?? '');
    const breadth = toNumber(row.values.breadth ?? '');
    const height = toNumber(row.values.height ?? '');
    const { type, note, dimensionsText } = classify(nos, length, breadth, height, quantity);
    if (!sections.includes(section)) sections.push(section);
    const label = description || `Row ${row.rowNumber}`;
    item.measurements.push({
      rowNumber: row.rowNumber,
      section,
      description: dimensionsText ? `${label} (${dimensionsText})` : label,
      type,
      nos: type === 'DIMENSIONS' ? stored(nos) : null,
      length: type === 'DIMENSIONS' ? stored(length) : null,
      breadth: type === 'DIMENSIONS' ? stored(breadth) : null,
      height: type === 'DIMENSIONS' ? stored(height) : null,
      // What the bill will hold: dimension rows are recomputed from their (stored) dimensions.
      quantity: type === 'DIMENSIONS' ? roundQuantity(Math.abs(product([stored(nos), stored(length), stored(breadth), stored(height)]))) : roundQuantity(Math.abs(quantity)),
      isDeduction: quantity < 0 || DEDUCTION_ROW.test(description),
      note,
    });
  };

  for (const row of rows) {
    const itemNo = (row.values.itemNo ?? '').trim();
    const description = (row.values.description ?? '').replace(/\s+/g, ' ').trim();
    const quantity = toNumber(row.values.quantity ?? '');

    if (itemNo) {
      const key = normalizeItemNo(itemNo);
      current = items.get(key) ?? { itemNo, rowNumber: row.rowNumber, heading: description, measurements: [], sheetTotals: { payable: null, hold: null, paid: null } };
      items.set(key, current);
      section = NO_SECTION;
      // Some sheets put a single measurement on the item's own row.
      if (quantity !== null) addMeasurement(current, row, description, quantity);
      continue;
    }
    if (!current) {
      ignoredRows += 1;
      continue;
    }
    if (BILL_SECTION.test(description) && quantity === null) {
      section = description;
      continue;
    }
    if (TOTAL_ROW.test(description)) {
      if (quantity !== null) {
        if (HOLD_ROW.test(description)) current.sheetTotals.hold = quantity;
        else if (PAID_ROW.test(description)) current.sheetTotals.paid = quantity;
        else current.sheetTotals.payable = quantity;
      }
      continue;
    }
    if (quantity === null) {
      ignoredRows += 1;
      continue;
    }
    addMeasurement(current, row, description, quantity);
  }

  return { items: [...items.values()], sections, ignoredRows };
}

/** "50.1", " 50.10 " and 50.1 (read as a number) all refer to the same item. */
export function normalizeItemNo(itemNo: string): string {
  const compact = itemNo.trim().toLowerCase().replace(/\s+/g, '');
  return /^\d+(\.\d+)?$/.test(compact) ? String(Number(compact)) : compact;
}

/** The signed total of an item's rows in the chosen sections. */
export function measuredQuantity(measurements: ParsedMeasurement[]): number {
  return roundQuantity(measurements.reduce((sum, row) => sum + (row.isDeduction ? -row.quantity : row.quantity), 0));
}
