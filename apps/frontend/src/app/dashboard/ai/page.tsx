'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Button, Skeleton } from '@sitepilot/ui';
import {
  Sparkles, FileText, Building2, IndianRupee, TrendingUp, Wand2, ShieldAlert, Gauge,
} from 'lucide-react';
import { toast } from 'sonner';

import { ProcurementKpiCard } from '../procurement/components/ProcurementKpiCard';
import { formatCompactINR } from '../procurement/components/procurement-format';
import { ExecutiveSummary } from './components/ExecutiveSummary';
import { ForecastCard } from './components/ForecastCard';
import { CrossProjectInsights } from './components/CrossProjectInsights';
import { SuggestedActions } from './components/SuggestedActions';
import { OrganizationTimeline } from './components/OrganizationTimeline';
import {
  executiveSummary,
  crossProjectInsights,
  forecastCards,
  suggestedActions,
  organizationTimeline,
  portfolioBudget,
  budgetUtilization,
  activeProjectCount,
  flaggedProjectCount,
  forecastSavings,
  portfolioRiskIndex,
  onTimeProbability,
  pendingActionCount,
  type SuggestedAction,
} from './data/command-center-demo';

// The forecast chart pulls in Recharts, so load it on demand to keep the
// initial route bundle light - same pattern as the procurement analytics tab.
const AiForecastChart = dynamic(
  () => import('./components/AiForecastChart').then((mod) => mod.AiForecastChart),
  {
    ssr: false,
    loading: () => <Skeleton className="h-80 w-full rounded-xl" />,
  },
);

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
};

export default function AiCommandCenterPage(): React.ReactElement {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => { setIsClient(true); }, []);
  if (!isClient) return <></>;

  function handleRunAction(action: SuggestedAction): void {
    toast.success(`${action.actionLabel} (demo)`, { description: action.title });
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start justify-between gap-4"
      >
        <div>
          <h2 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Sparkles className="h-7 w-7 text-primary" />
            AI Command Center
          </h2>
          <p className="text-muted-foreground mt-1">
            {activeProjectCount} active projects · {flaggedProjectCount} need attention · {pendingActionCount} AI actions ready
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={() => toast('AI assistant opening (demo)')}>
            <Wand2 className="mr-1.5 h-4 w-4" /> Ask AI
          </Button>
          <Button onClick={() => toast.success('Executive report generating (demo)')}>
            <FileText className="mr-1.5 h-4 w-4" /> Generate Report
          </Button>
        </div>
      </motion.div>

      {/* Executive summary */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <ExecutiveSummary
          data={executiveSummary}
          onAsk={() => toast('AI assistant opening (demo)')}
        />
      </motion.div>

      {/* Executive overview - KPI cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
      >
        <motion.div variants={itemVariants}>
          <ProcurementKpiCard
            title="Portfolio Value"
            value={formatCompactINR(portfolioBudget)}
            description="across all projects"
            icon={<Building2 className="h-4 w-4" />}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <ProcurementKpiCard
            title="Budget Utilization"
            value={`${budgetUtilization}%`}
            description="of sanctioned budget"
            icon={<Gauge className="h-4 w-4" />}
            trendLabel="on plan"
            trendDirection="up"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <ProcurementKpiCard
            title="On-Time Probability"
            value={`${onTimeProbability}%`}
            description="modelled completion"
            icon={<TrendingUp className="h-4 w-4" />}
            trendLabel="stable"
            trendDirection="up"
            accentClass="border-emerald-200 dark:border-emerald-800/30"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <ProcurementKpiCard
            title="Forecast Savings"
            value={formatCompactINR(forecastSavings)}
            description="AI-identified"
            icon={<IndianRupee className="h-4 w-4" />}
            trendLabel="6 opportunities"
            trendDirection="up"
            accentClass="border-emerald-200 dark:border-emerald-800/30"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <ProcurementKpiCard
            title="Risk Index"
            value={`${portfolioRiskIndex}/100`}
            description="moderate exposure"
            icon={<ShieldAlert className="h-4 w-4" />}
            trendLabel="2 fewer"
            trendDirection="down"
            invertTrendColor
            accentClass="border-amber-200 dark:border-amber-800/30"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <ProcurementKpiCard
            title="AI Actions"
            value={pendingActionCount}
            description="ready to action"
            icon={<Wand2 className="h-4 w-4" />}
            trendLabel="review queue"
            trendDirection="up"
          />
        </motion.div>
      </motion.div>

      {/* Forecast + suggested actions */}
      <div className="grid gap-6 xl:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="xl:col-span-2 space-y-6"
        >
          <AiForecastChart />
          <div className="grid gap-4 sm:grid-cols-2">
            {forecastCards.map((card) => (
              <ForecastCard key={card.id} data={card} />
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="xl:col-span-1"
        >
          <SuggestedActions
            actions={suggestedActions}
            onRun={handleRunAction}
            className="sticky top-6"
          />
        </motion.div>
      </div>

      {/* Cross-project insights + organization timeline */}
      <div className="grid gap-6 xl:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="xl:col-span-2"
        >
          <CrossProjectInsights insights={crossProjectInsights} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="xl:col-span-1"
        >
          <OrganizationTimeline events={organizationTimeline} />
        </motion.div>
      </div>
    </div>
  );
}
