'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Skeleton } from '@sitepilot/ui';
import { FileClock, ClipboardCheck, ClipboardList, IndianRupee, Building2, AlertTriangle } from 'lucide-react';
import type { ProcurementSummary } from '@/features/procurement/types';
import { ProcurementKpiCard, type KpiTrendDirection } from './ProcurementKpiCard';
import { formatCompactINR } from './procurement-format';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
};

interface Trend {
  trendLabel?: string;
  trendDirection: KpiTrendDirection;
}

/** Period-over-period change; omitted when there's no baseline to compare against. */
function periodTrend(current: number, previous: number): Trend {
  if (previous === 0) return { trendDirection: 'flat' };
  const change = Math.round(((current - previous) / previous) * 100);
  if (change === 0) return { trendDirection: 'flat' };
  return { trendLabel: `${Math.abs(change)}%`, trendDirection: change > 0 ? 'up' : 'down' };
}

export function ProcurementKpis({ summary }: { summary: ProcurementSummary | undefined }): React.ReactElement {
  if (!summary) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-[118px] rounded-xl" />)}
      </div>
    );
  }

  const cards = [
    {
      title: 'Open RFQs',
      value: summary.openRfqs,
      description: summary.rfqsClosingSoon ? `${summary.rfqsClosingSoon} closing soon` : 'collecting quotes',
      icon: <FileClock className="h-4 w-4" />,
      trendDirection: 'flat' as const,
    },
    {
      title: 'Pending POs',
      value: summary.pendingApprovals,
      description: summary.pendingApprovals ? `${formatCompactINR(summary.pendingValue)} on hold` : 'approval queue clear',
      icon: <ClipboardList className="h-4 w-4" />,
      trendDirection: 'flat' as const,
      accentClass: 'border-amber-200 dark:border-amber-800/30',
    },
    {
      title: 'Approved POs',
      value: summary.approvedThisQuarter,
      description: 'this quarter',
      icon: <ClipboardCheck className="h-4 w-4" />,
      ...periodTrend(summary.approvedThisQuarter, summary.approvedLastQuarter),
      accentClass: 'border-emerald-200 dark:border-emerald-800/30',
    },
    {
      title: 'Committed',
      value: formatCompactINR(summary.committedThisMonth),
      description: 'approved this month',
      icon: <IndianRupee className="h-4 w-4" />,
      ...periodTrend(summary.committedThisMonth, summary.committedLastMonth),
    },
    {
      title: 'Active Vendors',
      value: summary.activeVendors,
      description: 'on the panel',
      icon: <Building2 className="h-4 w-4" />,
      trendDirection: 'flat' as const,
    },
    {
      title: 'Overdue Orders',
      value: summary.overdueOrders,
      description: `${summary.deliveriesDueThisWeek} deliveries due this week`,
      icon: <AlertTriangle className="h-4 w-4" />,
      trendDirection: 'flat' as const,
      accentClass: summary.overdueOrders ? 'border-red-200 dark:border-red-800/30' : '',
    },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
    >
      {cards.map((card) => (
        <motion.div key={card.title} variants={itemVariants}>
          <ProcurementKpiCard {...card} />
        </motion.div>
      ))}
    </motion.div>
  );
}
