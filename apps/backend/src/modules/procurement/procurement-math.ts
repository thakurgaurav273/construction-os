import { Prisma } from '@prisma/client';

const DAY_MS = 86_400_000;

export interface PricedLine {
  quantity: number;
  rate: number;
  taxPercent: number;
  discountPercent: number;
}

export function toNumber(value: Prisma.Decimal | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === 'number' ? value : value.toNumber();
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Discount applies to the gross amount; GST is charged on the discounted value. */
export function lineItemTotal(line: PricedLine): number {
  const gross = line.quantity * line.rate;
  const discounted = gross * (1 - line.discountPercent / 100);
  return roundMoney(discounted * (1 + line.taxPercent / 100));
}

export function orderTotal(lines: PricedLine[]): number {
  return roundMoney(lines.reduce((sum, line) => sum + lineItemTotal(line), 0));
}

/**
 * Procurement dates are calendar days (expected delivery, closing date), stored at UTC midnight.
 * Comparing whole UTC days keeps "overdue" stable regardless of the time a request runs.
 */
export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function wholeDaysBetween(from: Date, to: Date): number {
  return Math.round((startOfUtcDay(to).getTime() - startOfUtcDay(from).getTime()) / DAY_MS);
}

/**
 * True when a user-entered calendar day is after today. Dates are compared in UTC but entered in the user's
 * local zone, so one day of slack keeps "today" valid for users ahead of UTC (e.g. India before 05:30 IST).
 */
export function isFutureDay(date: Date, today: Date = new Date()): boolean {
  return wholeDaysBetween(today, date) > 1;
}

export function addUtcDays(date: Date, days: number): Date {
  return new Date(startOfUtcDay(date).getTime() + days * DAY_MS);
}

export const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

/** "02 Nov 2026", read in UTC to match how calendar dates are stored. */
export function formatDay(date: Date): string {
  return `${String(date.getUTCDate()).padStart(2, '0')} ${MONTH_LABELS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** "2026-10" in UTC, used to bucket records by calendar month. */
export function monthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

/** The current month and the `count - 1` before it, oldest first. */
export function recentMonths(today: Date, count: number): { key: string; label: string; start: Date }[] {
  return Array.from({ length: count }, (_, index) => {
    const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - (count - 1 - index), 1));
    return { key: monthKey(start), label: MONTH_LABELS[start.getUTCMonth()], start };
  });
}

/** Monday of the week containing `date`, in UTC. */
export function startOfUtcWeek(date: Date): Date {
  const day = startOfUtcDay(date);
  return addUtcDays(day, -((day.getUTCDay() + 6) % 7));
}

/** Elapsed time in days with one decimal, for cycle-time averages. */
export function elapsedDays(from: Date, to: Date): number {
  return Math.round(((to.getTime() - from.getTime()) / DAY_MS) * 10) / 10;
}

export function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}
