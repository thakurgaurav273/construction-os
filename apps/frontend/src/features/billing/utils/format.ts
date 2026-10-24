import type { AdjustmentRule } from '../types';

export function describeAdjustment(rule: AdjustmentRule): string {
  return rule.calculation === 'PERCENT' ? `${rule.value}% of gross` : 'Fixed amount';
}

export function formatQuantity(value: number): string {
  return value.toLocaleString('en-IN', { maximumFractionDigits: 3 });
}

/** Bills are settled to the paisa, so amounts keep two decimals (unlike the rounded dashboard figures). */
export function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

/** "01 Aug 2024 – 28 Feb 2026", read in UTC to match how calendar days are stored. */
export function formatPeriod(from: string, to: string): string {
  const day = (value: string): string => new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
  return `${day(from)} – ${day(to)}`;
}
