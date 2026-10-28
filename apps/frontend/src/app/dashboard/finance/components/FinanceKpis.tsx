'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Skeleton } from '@sitepilot/ui';
import { AlertTriangle, CalendarClock, ClipboardCheck, HandCoins, IndianRupee, Landmark, PiggyBank, Vault } from 'lucide-react';
import { formatCompactINR } from '@/features/procurement/utils/format';
import type { FinanceSummary } from '@/features/finance/types';
import { ProcurementKpiCard, type KpiTrendDirection } from '../../procurement/components/ProcurementKpiCard';

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
};

function periodTrend(current: number, previous: number): { trendLabel?: string; trendDirection: KpiTrendDirection } {
  if (previous === 0) return { trendDirection: 'flat' };
  const change = Math.round(((current - previous) / previous) * 100);
  return change === 0 ? { trendDirection: 'flat' } : { trendLabel: `${Math.abs(change)}%`, trendDirection: change > 0 ? 'up' : 'down' };
}

export function FinanceKpis({ summary }: { summary: FinanceSummary | undefined }): React.ReactElement {
  if (!summary) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-[118px] rounded-xl" />)}
      </div>
    );
  }
  const { payables, receivables, retention, approvals, budget } = summary;
  const cards = [
    {
      title: 'Payables',
      value: formatCompactINR(payables.outstanding),
      description: 'approved, unpaid',
      icon: <IndianRupee className="h-4 w-4" />,
      trendDirection: 'flat' as const,
    },
    {
      title: 'Overdue Payables',
      value: formatCompactINR(payables.overdueAmount),
      description: `${payables.overdueCount} bill${payables.overdueCount === 1 ? '' : 's'} past due`,
      icon: <AlertTriangle className="h-4 w-4" />,
      trendDirection: 'flat' as const,
      accentClass: payables.overdueCount ? 'border-red-200 dark:border-red-800/30' : '',
    },
    {
      title: 'Due This Week',
      value: formatCompactINR(payables.dueSoonAmount),
      description: `${payables.dueSoonCount} bill${payables.dueSoonCount === 1 ? '' : 's'}`,
      icon: <CalendarClock className="h-4 w-4" />,
      trendDirection: 'flat' as const,
      accentClass: 'border-amber-200 dark:border-amber-800/30',
    },
    {
      title: 'To Approve',
      value: approvals.invoicesPending + approvals.paymentsPending,
      description: approvals.invoicesWithVariance
        ? `${approvals.invoicesWithVariance} with variance`
        : `${approvals.invoicesPending} bills · ${approvals.paymentsPending} payments`,
      icon: <ClipboardCheck className="h-4 w-4" />,
      trendDirection: 'flat' as const,
    },
    {
      title: 'Receivables',
      value: formatCompactINR(receivables.outstanding),
      description: receivables.overdueCount
        ? `${formatCompactINR(receivables.overdueAmount)} overdue on ${receivables.overdueCount} bill${receivables.overdueCount === 1 ? '' : 's'}`
        : 'certified client bills, unpaid',
      icon: <HandCoins className="h-4 w-4" />,
      trendDirection: 'flat' as const,
      accentClass: receivables.overdueCount ? 'border-amber-200 dark:border-amber-800/30' : '',
    },
    {
      title: 'Retention',
      value: formatCompactINR(retention.heldByClients),
      description: `held by clients · we hold ${formatCompactINR(retention.heldFromSubcontractors)}`,
      icon: <Vault className="h-4 w-4" />,
      trendDirection: 'flat' as const,
    },
    {
      title: 'Paid This Month',
      value: formatCompactINR(summary.paidThisMonth),
      description: 'released to vendors',
      icon: <Landmark className="h-4 w-4" />,
      ...periodTrend(summary.paidThisMonth, summary.paidLastMonth),
      accentClass: 'border-emerald-200 dark:border-emerald-800/30',
    },
    {
      title: 'Budget Used',
      value: `${budget.utilizationPercent}%`,
      description: `${formatCompactINR(budget.remaining)} uncommitted`,
      icon: <PiggyBank className="h-4 w-4" />,
      trendDirection: 'flat' as const,
    },
  ];

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <motion.div key={card.title} variants={itemVariants}>
          <ProcurementKpiCard {...card} />
        </motion.div>
      ))}
    </motion.div>
  );
}
