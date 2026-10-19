import type { Insight } from '@/components/shared/AiInsightPanel';
import { formatCompactINR } from './format';
import type { ProcurementSummary } from '../types';

export type ProcurementInsight = Insight<{ kind: 'order' | 'rfq'; id: string }>;

const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? '' : 's'}`;

/**
 * Turns the summary's attention lists into short, actionable call-outs.
 * Rule-based today; an AI service can later replace this behind the same shape.
 */
export function buildProcurementInsights(summary: ProcurementSummary): ProcurementInsight[] {
  const insights: ProcurementInsight[] = [];
  const { overdueOrders, stalePendingOrders, closingRfqs } = summary.attention;

  overdueOrders.forEach((order) => insights.push({
    id: `overdue-${order.id}`,
    tone: 'critical',
    title: `${order.poNumber} is ${plural(order.daysLate, 'day')} late`,
    body: `${order.vendorName ?? 'The vendor'} hasn't delivered in full. Chase the vendor or reschedule site work that depends on it.`,
    target: { kind: 'order', id: order.id },
  }));

  stalePendingOrders.forEach((order) => insights.push({
    id: `stale-${order.id}`,
    tone: 'warning',
    title: `${order.poNumber} waiting ${plural(order.daysWaiting, 'day')} for approval`,
    body: `${formatCompactINR(order.amount)} is on hold. Delayed approvals push out delivery dates.`,
    target: { kind: 'order', id: order.id },
  }));

  closingRfqs.forEach((rfq) => {
    const missing = rfq.vendorsInvited - rfq.quotesReceived;
    insights.push({
      id: `rfq-${rfq.id}`,
      tone: rfq.daysLeft < 0 ? 'warning' : 'info',
      title: rfq.daysLeft < 0
        ? `${rfq.rfqNumber} is past its closing date`
        : `${rfq.rfqNumber} closes ${rfq.daysLeft === 0 ? 'today' : `in ${plural(rfq.daysLeft, 'day')}`}`,
      body: missing > 0
        ? `${rfq.quotesReceived}/${rfq.vendorsInvited} quotes in for "${rfq.title}". Follow up with ${plural(missing, 'vendor')}.`
        : `All ${rfq.vendorsInvited} quotes are in for "${rfq.title}". Ready to compare and award.`,
      target: { kind: 'rfq', id: rfq.id },
    });
  });

  if (summary.committedLastMonth > 0 && summary.committedThisMonth > 0) {
    const change = Math.round(((summary.committedThisMonth - summary.committedLastMonth) / summary.committedLastMonth) * 100);
    insights.push({
      id: 'spend-trend',
      tone: change > 25 ? 'warning' : 'info',
      title: `Committed spend ${change >= 0 ? 'up' : 'down'} ${Math.abs(change)}% this month`,
      body: `${formatCompactINR(summary.committedThisMonth)} approved so far vs ${formatCompactINR(summary.committedLastMonth)} last month.`,
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: 'all-clear',
      tone: 'positive',
      title: 'Procurement is on track',
      body: 'No overdue deliveries, stale approvals or RFQs closing without quotes.',
    });
  }

  return insights;
}
