'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@sitepilot/ui';

/** Shared axis/tooltip styling so every materials chart reads as one system. */
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
  inbound: '#10b981',
  outbound: '#ef4444',
  amber: '#f59e0b',
  violet: '#8b5cf6',
} as const;

/** Ordered palette for categorical charts (category split, supplier spend, etc.). */
export const CATEGORICAL_PALETTE = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444',
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6',
];

interface MaterialsChartCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Chart body height in px. */
  height?: number;
  className?: string;
}

export function MaterialsChartCard({
  title,
  description,
  children,
  height = 280,
  className = '',
}: MaterialsChartCardProps): React.ReactElement {
  return (
    <Card className={className}>
      <CardHeader className="space-y-0">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="pl-0">
        <div style={{ height }}>{children}</div>
      </CardContent>
    </Card>
  );
}
