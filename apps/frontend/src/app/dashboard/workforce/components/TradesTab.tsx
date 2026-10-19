'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, Progress } from '@sitepilot/ui';
import {
  Zap, HardHat, Wrench, Layers, Settings2,
  Hammer, Truck, Droplets, Ruler, Paintbrush, Users,
} from 'lucide-react';
import type { Worker } from '@/hooks/api/use-workforce';
import { DEFAULT_TRADE_COLOR, TRADE_COLORS } from '@/features/workforce/constants';
import { isOnSiteToday } from '@/features/workforce/utils/attendance';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 280, damping: 22 } },
};

const TRADE_ICONS: Record<string, React.ReactNode> = {
  'Civil':               <HardHat className="h-5 w-5" />,
  'Electrical':          <Zap className="h-5 w-5" />,
  'Steel Fixing':        <Layers className="h-5 w-5" />,
  'Concrete':            <Hammer className="h-5 w-5" />,
  'Mechanical':          <Settings2 className="h-5 w-5" />,
  'Masonry':             <Wrench className="h-5 w-5" />,
  'Equipment Operation': <Truck className="h-5 w-5" />,
  'Plumbing':            <Droplets className="h-5 w-5" />,
  'Carpentry':           <Ruler className="h-5 w-5" />,
  'Painting':            <Paintbrush className="h-5 w-5" />,
};

interface TradeSummary {
  trade: string;
  total: number;
  onSite: number;
  subcontractors: number;
  averageExperience: number;
}

function summarizeTrades(workers: Worker[]): TradeSummary[] {
  const byTrade = new Map<string, Worker[]>();
  for (const worker of workers) byTrade.set(worker.trade, [...(byTrade.get(worker.trade) ?? []), worker]);

  return Array.from(byTrade.entries())
    .map(([trade, members]) => ({
      trade,
      total: members.length,
      onSite: members.filter(isOnSiteToday).length,
      subcontractors: members.filter((member) => member.type === 'SUBCONTRACTOR').length,
      averageExperience: Math.round(members.reduce((sum, member) => sum + member.experienceYears, 0) / members.length),
    }))
    .sort((a, b) => b.total - a.total);
}

function getOnSiteColor(pct: number): string {
  if (pct >= 90) return 'text-emerald-600';
  if (pct >= 70) return 'text-amber-600';
  return 'text-red-600';
}

export function TradesTab({ workers }: { workers: Worker[] }): React.ReactElement {
  const trades = useMemo(() => summarizeTrades(workers.filter((worker) => worker.isActive)), [workers]);
  const totalWorkers = trades.reduce((sum, t) => sum + t.total, 0);
  const totalOnSite  = trades.reduce((sum, t) => sum + t.onSite, 0);

  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
        <Users className="h-8 w-8 text-primary/40 mb-3" />
        <p className="font-medium">No workers yet</p>
        <p className="text-sm text-muted-foreground">Add workers to see how each trade is staffed.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Strip */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{totalWorkers}</p>
            <p className="text-xs text-muted-foreground mt-1">Active Workers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{totalOnSite}</p>
            <p className="text-xs text-muted-foreground mt-1">On Site Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{trades.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Trades</p>
          </CardContent>
        </Card>
      </div>

      {/* Trade Cards Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        {trades.map((stat) => {
          const onSitePct = Math.round((stat.onSite / stat.total) * 100);
          return (
            <motion.div key={stat.trade} variants={itemVariants}>
              <Card className="hover:shadow-md transition-all group h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-white shrink-0"
                      style={{ backgroundColor: TRADE_COLORS[stat.trade] ?? DEFAULT_TRADE_COLOR }}
                    >
                      {TRADE_ICONS[stat.trade] ?? <Users className="h-5 w-5" />}
                    </div>
                    <span className="font-semibold text-sm leading-tight">{stat.trade}</span>
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-muted-foreground">On site today</span>
                    <span className="text-sm font-semibold">
                      {stat.onSite}
                      <span className="text-muted-foreground font-normal text-xs"> / {stat.total}</span>
                    </span>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">Turnout</span>
                      <span className={`font-semibold ${getOnSiteColor(onSitePct)}`}>{onSitePct}%</span>
                    </div>
                    <Progress value={onSitePct} className="h-1.5" />
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
                    <span>Avg. <span className="font-medium text-foreground">{stat.averageExperience} yrs</span> exp</span>
                    <span>{stat.subcontractors} subcontracted</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
