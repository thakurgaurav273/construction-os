'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@sitepilot/ui';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

export type KpiTrendDirection = 'up' | 'down' | 'flat';

interface ProcurementKpiCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  trendLabel?: string;
  trendDirection?: KpiTrendDirection;
  /** When true, a downward trend is the good outcome (e.g. delayed deliveries). */
  invertTrendColor?: boolean;
  accentClass?: string;
}

function trendColor(direction: KpiTrendDirection, invert: boolean): string {
  if (direction === 'flat') return 'text-muted-foreground';
  const isPositive = invert ? direction === 'down' : direction === 'up';
  return isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';
}

export function ProcurementKpiCard({
  title,
  value,
  description,
  icon,
  trendLabel,
  trendDirection = 'flat',
  invertTrendColor = false,
  accentClass = '',
}: ProcurementKpiCardProps): React.ReactElement {
  const TrendIcon = trendDirection === 'down' ? ArrowDownRight : ArrowUpRight;

  return (
    <Card className={`hover:shadow-md transition-all group ${accentClass}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="text-muted-foreground group-hover:text-primary transition-colors">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center gap-1.5 mt-1">
          {trendLabel && trendDirection !== 'flat' && (
            <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${trendColor(trendDirection, invertTrendColor)}`}>
              <TrendIcon className="h-3 w-3" />
              {trendLabel}
            </span>
          )}
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
