'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, Badge, Progress } from '@sitepilot/ui';
import {
  Zap, HardHat, Wrench, Layers, Settings2,
  Hammer, Truck, Droplets, Ruler, Paintbrush,
} from 'lucide-react';
import { tradeStats, TradeStats, WorkerTrade } from '@/data/workforce-demo';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 280, damping: 22 } },
};

const TRADE_ICONS: Record<WorkerTrade, React.ReactNode> = {
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

const SKILL_BADGE_COLORS: Record<TradeStats['skillLevel'], string> = {
  Expert:       'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Proficient:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Intermediate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Beginner:     'bg-muted text-muted-foreground',
};

function getUtilizationColor(pct: number): string {
  if (pct >= 90) return 'text-emerald-600';
  if (pct >= 70) return 'text-amber-600';
  return 'text-red-600';
}

export function TradesTab(): React.ReactElement {
  const totalWorkers = tradeStats.reduce((sum, t) => sum + t.total, 0);
  const totalActive  = tradeStats.reduce((sum, t) => sum + t.active, 0);
  const totalOpen    = tradeStats.reduce((sum, t) => sum + t.openPositions, 0);

  return (
    <div className="space-y-6">
      {/* Summary Strip */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{totalWorkers}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Workers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{totalActive}</p>
            <p className="text-xs text-muted-foreground mt-1">Active Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{totalOpen}</p>
            <p className="text-xs text-muted-foreground mt-1">Open Positions</p>
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
        {tradeStats.map((stat) => (
          <motion.div key={stat.trade} variants={itemVariants}>
            <Card className="hover:shadow-md transition-all group h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-white shrink-0"
                      style={{ backgroundColor: stat.color }}
                    >
                      {TRADE_ICONS[stat.trade]}
                    </div>
                    <span className="font-semibold text-sm leading-tight">{stat.trade}</span>
                  </div>
                  {stat.openPositions > 0 && (
                    <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 shrink-0">
                      +{stat.openPositions} open
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Workers count */}
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-muted-foreground">Workforce</span>
                  <span className="text-sm font-semibold">
                    {stat.active}
                    <span className="text-muted-foreground font-normal text-xs"> / {stat.total}</span>
                  </span>
                </div>

                {/* Utilization */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">Utilization</span>
                    <span className={`font-semibold ${getUtilizationColor(stat.utilization)}`}>
                      {stat.utilization}%
                    </span>
                  </div>
                  <Progress value={stat.utilization} className="h-1.5" />
                </div>

                {/* Availability & Skill */}
                <div className="flex items-center justify-between pt-1">
                  <div className="text-xs text-muted-foreground">
                    Available: <span className="font-medium text-foreground">{stat.total - stat.active}</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${SKILL_BADGE_COLORS[stat.skillLevel]}`}>
                    {stat.skillLevel}
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
