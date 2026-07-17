'use client';

import React from 'react';
import { Card, CardContent } from '@sitepilot/ui';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import type { ForecastCardData, InsightTone, ForecastDirection } from '../data/command-center-demo';

const TONE_ACCENT: Record<InsightTone, string> = {
  critical: 'border-red-200 dark:border-red-800/40',
  warning: 'border-amber-200 dark:border-amber-800/40',
  positive: 'border-emerald-200 dark:border-emerald-800/40',
  info: 'border-blue-200 dark:border-blue-800/40',
};

const TONE_TEXT: Record<InsightTone, string> = {
  critical: 'text-red-600 dark:text-red-400',
  warning: 'text-amber-600 dark:text-amber-400',
  positive: 'text-emerald-600 dark:text-emerald-400',
  info: 'text-blue-600 dark:text-blue-400',
};

const TONE_STROKE: Record<InsightTone, string> = {
  critical: '#ef4444',
  warning: '#f59e0b',
  positive: '#10b981',
  info: '#3b82f6',
};

function DirectionIcon({ direction }: { direction: ForecastDirection }): React.ReactElement {
  if (direction === 'up') return <ArrowUpRight className="h-3.5 w-3.5" />;
  if (direction === 'down') return <ArrowDownRight className="h-3.5 w-3.5" />;
  return <Minus className="h-3.5 w-3.5" />;
}

/** Normalises the spark series into a 0-100 viewBox polyline. */
function sparkPoints(values: number[]): string {
  if (values.length === 0) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = 100 / (values.length - 1 || 1);
  return values
    .map((v, i) => `${(i * step).toFixed(2)},${(28 - ((v - min) / span) * 24).toFixed(2)}`)
    .join(' ');
}

interface ForecastCardProps {
  data: ForecastCardData;
}

export function ForecastCard({ data }: ForecastCardProps): React.ReactElement {
  return (
    <Card className={`hover:shadow-md transition-all ${TONE_ACCENT[data.tone]}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground">{data.label}</p>
          <span className="text-[10px] font-medium text-muted-foreground shrink-0">
            {data.confidence}% conf.
          </span>
        </div>

        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-xl font-bold leading-none">{data.projected}</p>
            <span className={`mt-1.5 inline-flex items-center gap-0.5 text-xs font-semibold ${TONE_TEXT[data.tone]}`}>
              <DirectionIcon direction={data.direction} />
              {data.deltaLabel}
            </span>
          </div>
          <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="h-8 w-20 shrink-0">
            <polyline
              points={sparkPoints(data.spark)}
              fill="none"
              stroke={TONE_STROKE[data.tone]}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">{data.detail}</p>
      </CardContent>
    </Card>
  );
}
