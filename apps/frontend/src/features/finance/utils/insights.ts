import type { Insight } from '@/components/shared/AiInsightPanel';
import { formatCompactINR } from '@/features/procurement/utils/format';
import type { FinanceSummary } from '../types';

export type FinanceInsight = Insight<{ kind: 'invoice'; id: string }>;

const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? '' : 's'}`;

/**
 * Turns the finance summary into short, actionable call-outs.
 * Rule-based today; an AI service can later replace this behind the same shape.
 */
export function buildFinanceInsights(summary: FinanceSummary): FinanceInsight[] {
  const insights: FinanceInsight[] = [];
  const { overdueInvoices, varianceInvoices, budgetRisks } = summary.attention;

  overdueInvoices.forEach((invoice) => insights.push({
    id: `overdue-${invoice.id}`,
    tone: 'critical',
    title: `${invoice.invoiceNumber} overdue by ${plural(invoice.daysOverdue, 'day')}`,
    body: `${formatCompactINR(invoice.balanceDue)} still owed to ${invoice.vendorName}. Late payment risks supply holds and interest.`,
    target: { kind: 'invoice', id: invoice.id },
  }));

  varianceInvoices.forEach((invoice) => insights.push({
    id: `variance-${invoice.id}`,
    tone: 'warning',
    title: `${invoice.invoiceNumber} doesn't match its PO`,
    body: `${invoice.vendorName} billed ${formatCompactINR(invoice.totalAmount)}. Check quantities against receipts and rates against the PO before approving.`,
    target: { kind: 'invoice', id: invoice.id },
  }));

  if (summary.approvals.paymentsToRelease > 0) {
    insights.push({
      id: 'release',
      tone: 'info',
      title: `${plural(summary.approvals.paymentsToRelease, 'payment')} approved, not yet paid`,
      body: `${formatCompactINR(summary.approvals.paymentsToReleaseValue)} is cleared for release. Record the bank reference once transferred.`,
    });
  }

  budgetRisks.forEach((risk) => insights.push({
    id: `budget-${risk.projectName}-${risk.category}`,
    tone: risk.utilizationPercent >= 100 ? 'critical' : 'warning',
    title: `${risk.category} at ${risk.utilizationPercent}% of budget`,
    body: `${risk.projectName}: review remaining scope before raising new orders in this category.`,
  }));

  if (insights.length === 0) {
    insights.push({
      id: 'all-clear',
      tone: 'positive',
      title: 'Payables are under control',
      body: 'No overdue bills, unmatched invoices or budget lines near their limit.',
    });
  }
  return insights;
}
