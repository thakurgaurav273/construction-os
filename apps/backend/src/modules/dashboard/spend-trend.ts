import { monthKey, recentMonths, toNumber } from '../procurement/procurement-math';
import type { Prisma } from '@prisma/client';

export interface SpendTrendPoint {
  month: string;
  /** Budget spread evenly over each project's planned months. */
  planned: number;
  /** Payments released in the month. */
  actual: number;
}

export interface PlannedProject {
  budget: Prisma.Decimal | number | null;
  startDate: Date | null;
  expectedCompletion: Date | null;
}

export const SPEND_TREND_MONTHS = 6;

const monthIndex = (date: Date): number => date.getUTCFullYear() * 12 + date.getUTCMonth();

/** A project's planned spend per month: its budget over the calendar months from start to completion. */
export function plannedMonthlyBurn(project: PlannedProject, month: Date): number {
  const budget = toNumber(project.budget);
  if (budget <= 0 || !project.startDate || !project.expectedCompletion) return 0;
  const first = monthIndex(project.startDate);
  const last = monthIndex(project.expectedCompletion);
  const current = monthIndex(month);
  if (last < first || current < first || current > last) return 0;
  return budget / (last - first + 1);
}

export function spendTrend(
  projects: PlannedProject[],
  payments: { amount: Prisma.Decimal | number; paidDate: Date | null }[],
  today: Date,
): SpendTrendPoint[] {
  return recentMonths(today, SPEND_TREND_MONTHS).map((month) => ({
    month: month.label,
    planned: Math.round(projects.reduce((sum, project) => sum + plannedMonthlyBurn(project, month.start), 0)),
    actual: Math.round(payments
      .filter((payment) => payment.paidDate && monthKey(payment.paidDate) === month.key)
      .reduce((sum, payment) => sum + toNumber(payment.amount), 0)),
  }));
}
