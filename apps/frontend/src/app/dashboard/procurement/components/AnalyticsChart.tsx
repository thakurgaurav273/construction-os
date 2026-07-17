'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@sitepilot/ui';

/** Shared axis/tooltip styling so every procurement chart reads as one system. */
export const AXIS_TICK = { fill: 'hsl(var(--muted-foreground))', fontSize: 12 } as const;

export const CHART_TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  borderRadius: '8px',
  border: '1px solid hsl(var(--border))',
  fontSize: '12px',
} as const;

export const CHART_GRID_STROKE = 'hsl(var(--border))';

export const CHART_COLORS = {
  primary: '#6366f1',
  spend: '#6366f1',
  budget: '#94a3b8',
  onTime: '#10b981',
  late: '#ef4444',
  quality: '#3b82f6',
  amber: '#f59e0b',
  violet: '#8b5cf6',
} as const;

/** Ordered palette for categorical charts (spend by category, etc.). */
export const CATEGORICAL_PALETTE = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444',
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6',
];

interface AnalyticsChartProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Chart body height in px. */
  height?: number;
  className?: string;
  action?: React.ReactNode;
}

export function AnalyticsChart({
  title,
  description,
  children,
  height = 280,
  className = '',
  action,
}: AnalyticsChartProps): React.ReactElement {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {action}
      </CardHeader>
      <CardContent className="pl-0">
        <div style={{ height }}>{children}</div>
      </CardContent>
    </Card>
  );
}
