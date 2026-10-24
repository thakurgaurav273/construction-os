/**
 * Turns spreadsheet text into typed values. Each parser returns `undefined` for a blank cell and `null` for a
 * value it can't understand, so callers can tell "not given" from "given but wrong".
 */

const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30);
const DAY_MS = 86_400_000;

export function parseNumber(text: string): number | null | undefined {
  const cleaned = text.replace(/₹|rs\.?|inr|\$|,|%|\s/gi, '');
  if (cleaned === '') return undefined;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

function isoDate(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  const valid = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return valid ? date.toISOString().slice(0, 10) : null;
}

/** Accepts ISO dates, Indian day-first dates (31/12/2026, 31-12-26, 31.12.2026), Excel serials and "5 Nov 2026". */
export function parseDate(text: string): string | null | undefined {
  const value = text.trim();
  if (value === '') return undefined;

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(value);
  if (iso) return isoDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const dayFirst = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(value);
  if (dayFirst) {
    const year = Number(dayFirst[3]);
    return isoDate(year < 100 ? 2000 + year : year, Number(dayFirst[2]), Number(dayFirst[1]));
  }

  // Dates in CSV exports of Excel sheets sometimes arrive as the serial number Excel stores internally.
  if (/^\d{5}(\.\d+)?$/.test(value)) {
    return new Date(EXCEL_EPOCH_UTC + Math.floor(Number(value)) * DAY_MS).toISOString().slice(0, 10);
  }

  const named = Date.parse(`${value} UTC`);
  return Number.isNaN(named) ? null : new Date(named).toISOString().slice(0, 10);
}

export function parseList(text: string): string[] | undefined {
  const items = text.split(/[,;|]/).map((item) => item.trim()).filter((item) => item !== '');
  return items.length === 0 ? undefined : items;
}

export function parseOption(text: string, options: readonly string[]): string | null | undefined {
  const value = text.trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (value === '') return undefined;
  return options.find((option) => option === value) ?? null;
}

export function parseText(text: string): string | undefined {
  const value = text.trim();
  return value === '' ? undefined : value;
}
