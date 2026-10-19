import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ANALYTICS_MONTHS, ANALYTICS_WEEKS, TOP_SPEND_ROWS } from './procurement.constants';
import {
  addUtcDays, average, elapsedDays, formatDay, lineItemTotal, monthKey, recentMonths, roundMoney, startOfUtcWeek,
  toNumber, wholeDaysBetween,
} from './procurement-math';

export interface MonthlySpendPoint { month: string; label: string; committed: number; received: number }
export interface SpendSlice { name: string; value: number }
export interface CycleTimePoint {
  month: string;
  label: string;
  approvalDays: number | null;
  deliveryDays: number | null;
  rfqToAwardDays: number | null;
}
export interface ApprovalAgeBucket { label: string; count: number; value: number }
export interface WeeklyDeliveryPoint { weekStart: string; label: string; onTime: number; late: number }
export interface SupplierPerformancePoint { vendor: string; onTimePercent: number; deliveries: number }

export interface ProcurementAnalytics {
  totals: {
    committed: number;
    received: number;
    avgApprovalDays: number | null;
    avgDeliveryDays: number | null;
    avgRfqToAwardDays: number | null;
  };
  monthly: MonthlySpendPoint[];
  byCategory: SpendSlice[];
  byVendor: SpendSlice[];
  cycleTimes: CycleTimePoint[];
  approvalQueue: ApprovalAgeBucket[];
  weeklyDeliveries: WeeklyDeliveryPoint[];
  supplierPerformance: SupplierPerformancePoint[];
}

const APPROVAL_AGE_BUCKETS = [
  { label: '0–1 days', maxDays: 1 },
  { label: '2–3 days', maxDays: 3 },
  { label: '4–7 days', maxDays: 7 },
  { label: '8+ days', maxDays: Number.POSITIVE_INFINITY },
];

function sumBy<T>(rows: T[], key: (row: T) => string, value: (row: T) => number): Map<string, number> {
  const totals = new Map<string, number>();
  for (const row of rows) totals.set(key(row), (totals.get(key(row)) ?? 0) + value(row));
  return totals;
}

function topSlices(totals: Map<string, number>): SpendSlice[] {
  return [...totals]
    .map(([name, value]) => ({ name, value: roundMoney(value) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, TOP_SPEND_ROWS);
}

/** Spend, cycle-time and delivery trends computed from purchase orders, RFQs and GRNs. */
@Injectable()
export class ProcurementAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAnalytics(organizationId: string): Promise<ProcurementAnalytics> {
    const today = new Date();
    const months = recentMonths(today, ANALYTICS_MONTHS);
    const windowStart = months[0].start;

    const [approvedOrders, pendingOrders, receivedLines, receipts, awardedRfqs] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where: { organizationId, status: 'APPROVED', reviewedAt: { gte: windowStart } },
        select: { amount: true, category: true, submittedAt: true, reviewedAt: true, vendor: { select: { name: true } } },
      }),
      this.prisma.purchaseOrder.findMany({
        where: { organizationId, status: 'PENDING' },
        select: { amount: true, submittedAt: true },
      }),
      this.prisma.deliveryItem.findMany({
        where: { delivery: { organizationId, status: 'RECEIVED', receivedAt: { gte: windowStart } } },
        select: {
          quantity: true,
          delivery: { select: { receivedAt: true } },
          poLineItem: { select: { rate: true, taxPercent: true, discountPercent: true } },
        },
      }),
      this.prisma.delivery.findMany({
        where: { organizationId, status: 'RECEIVED', receivedAt: { not: null } },
        select: {
          purchaseOrderId: true, scheduledDate: true, receivedAt: true,
          purchaseOrder: { select: { reviewedAt: true, vendor: { select: { name: true } } } },
        },
      }),
      this.prisma.rfq.findMany({
        where: { organizationId, status: 'AWARDED', awardedAt: { gte: windowStart } },
        select: { issuedDate: true, awardedAt: true },
      }),
    ]);

    const committedByMonth = sumBy(approvedOrders, (order) => monthKey(order.reviewedAt ?? today), (order) => toNumber(order.amount));
    const receivedByMonth = sumBy(
      receivedLines,
      (line) => monthKey(line.delivery.receivedAt ?? today),
      (line) => lineItemTotal({
        quantity: toNumber(line.quantity),
        rate: toNumber(line.poLineItem.rate),
        taxPercent: line.poLineItem.taxPercent,
        discountPercent: line.poLineItem.discountPercent,
      }),
    );

    const approvalDays = approvedOrders.flatMap((order) => (order.submittedAt && order.reviewedAt
      ? [{ month: monthKey(order.reviewedAt), days: elapsedDays(order.submittedAt, order.reviewedAt) }]
      : []));
    const deliveryDays = this.firstReceiptLeadTimes(receipts, windowStart);
    const rfqDays = awardedRfqs.flatMap((rfq) => (rfq.awardedAt
      ? [{ month: monthKey(rfq.awardedAt), days: elapsedDays(rfq.issuedDate, rfq.awardedAt) }]
      : []));
    const averageFor = (rows: { month: string; days: number }[], month: string): number | null =>
      average(rows.filter((row) => row.month === month).map((row) => row.days));

    return {
      totals: {
        committed: roundMoney([...committedByMonth.values()].reduce((sum, value) => sum + value, 0)),
        received: roundMoney([...receivedByMonth.values()].reduce((sum, value) => sum + value, 0)),
        avgApprovalDays: average(approvalDays.map((row) => row.days)),
        avgDeliveryDays: average(deliveryDays.map((row) => row.days)),
        avgRfqToAwardDays: average(rfqDays.map((row) => row.days)),
      },
      monthly: months.map((month) => ({
        month: month.key,
        label: month.label,
        committed: roundMoney(committedByMonth.get(month.key) ?? 0),
        received: roundMoney(receivedByMonth.get(month.key) ?? 0),
      })),
      byCategory: topSlices(sumBy(approvedOrders, (order) => order.category, (order) => toNumber(order.amount))),
      byVendor: topSlices(sumBy(approvedOrders, (order) => order.vendor?.name ?? 'Unassigned', (order) => toNumber(order.amount))),
      cycleTimes: months.map((month) => ({
        month: month.key,
        label: month.label,
        approvalDays: averageFor(approvalDays, month.key),
        deliveryDays: averageFor(deliveryDays, month.key),
        rfqToAwardDays: averageFor(rfqDays, month.key),
      })),
      approvalQueue: this.approvalQueue(pendingOrders, today),
      weeklyDeliveries: this.weeklyDeliveries(receipts, today),
      supplierPerformance: this.supplierPerformance(receipts),
    };
  }

  /** Days from approval to the first goods receipt, for orders first received inside the window. */
  private firstReceiptLeadTimes(
    receipts: { purchaseOrderId: string; receivedAt: Date | null; purchaseOrder: { reviewedAt: Date | null } }[],
    windowStart: Date,
  ): { month: string; days: number }[] {
    const firstReceipt = new Map<string, { receivedAt: Date; approvedAt: Date }>();
    for (const receipt of receipts) {
      if (!receipt.receivedAt || !receipt.purchaseOrder.reviewedAt) continue;
      const existing = firstReceipt.get(receipt.purchaseOrderId);
      if (!existing || receipt.receivedAt < existing.receivedAt) {
        firstReceipt.set(receipt.purchaseOrderId, { receivedAt: receipt.receivedAt, approvedAt: receipt.purchaseOrder.reviewedAt });
      }
    }
    return [...firstReceipt.values()]
      .filter((entry) => entry.receivedAt >= windowStart)
      .map((entry) => ({ month: monthKey(entry.receivedAt), days: Math.max(0, elapsedDays(entry.approvedAt, entry.receivedAt)) }));
  }

  private approvalQueue(pending: { amount: Prisma.Decimal; submittedAt: Date | null }[], today: Date): ApprovalAgeBucket[] {
    const buckets = APPROVAL_AGE_BUCKETS.map((bucket) => ({ label: bucket.label, count: 0, value: 0 }));
    for (const order of pending) {
      const days = wholeDaysBetween(order.submittedAt ?? today, today);
      const index = APPROVAL_AGE_BUCKETS.findIndex((bucket) => days <= bucket.maxDays);
      buckets[index].count += 1;
      buckets[index].value = roundMoney(buckets[index].value + toNumber(order.amount));
    }
    return buckets;
  }

  private weeklyDeliveries(receipts: { scheduledDate: Date; receivedAt: Date | null }[], today: Date): WeeklyDeliveryPoint[] {
    const currentWeek = startOfUtcWeek(today);
    const weeks = Array.from({ length: ANALYTICS_WEEKS }, (_, index) => {
      const weekStart = addUtcDays(currentWeek, -7 * (ANALYTICS_WEEKS - 1 - index));
      return { weekStart: weekStart.toISOString().slice(0, 10), label: formatDay(weekStart).slice(0, 6), onTime: 0, late: 0 };
    });
    const byWeek = new Map(weeks.map((week) => [week.weekStart, week]));

    for (const receipt of receipts) {
      if (!receipt.receivedAt) continue;
      const week = byWeek.get(startOfUtcWeek(receipt.receivedAt).toISOString().slice(0, 10));
      if (!week) continue;
      if (wholeDaysBetween(receipt.scheduledDate, receipt.receivedAt) > 0) week.late += 1;
      else week.onTime += 1;
    }
    return weeks;
  }

  private supplierPerformance(
    receipts: { scheduledDate: Date; receivedAt: Date | null; purchaseOrder: { vendor: { name: string } | null } }[],
  ): SupplierPerformancePoint[] {
    const byVendor = new Map<string, { onTime: number; total: number }>();
    for (const receipt of receipts) {
      if (!receipt.receivedAt || !receipt.purchaseOrder.vendor) continue;
      const stats = byVendor.get(receipt.purchaseOrder.vendor.name) ?? { onTime: 0, total: 0 };
      stats.total += 1;
      if (wholeDaysBetween(receipt.scheduledDate, receipt.receivedAt) <= 0) stats.onTime += 1;
      byVendor.set(receipt.purchaseOrder.vendor.name, stats);
    }
    return [...byVendor]
      .map(([vendor, stats]) => ({ vendor, deliveries: stats.total, onTimePercent: Math.round((stats.onTime / stats.total) * 100) }))
      .sort((a, b) => b.deliveries - a.deliveries)
      .slice(0, TOP_SPEND_ROWS);
  }
}
