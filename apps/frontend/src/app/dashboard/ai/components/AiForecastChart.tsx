'use client';

import React from 'react';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  AnalyticsChart, AXIS_TICK, CHART_TOOLTIP_STYLE, CHART_GRID_STROKE, CHART_COLORS,
} from '../../procurement/components/AnalyticsChart';
import { formatCompactINR } from '../../procurement/components/procurement-format';
import { portfolioForecastData } from '../data/command-center-demo';

const compact = (value: number | string): string => formatCompactINR(Number(value));

/**
 * Portfolio spend, actual-to-date with an AI forecast tail against the planned
 * budget line. Reuses the procurement chart wrapper and shared axis/tooltip
 * tokens so it matches every other chart in the product.
 */
export function AiForecastChart(): React.ReactElement {
  return (
    <AnalyticsChart
      title="Portfolio Spend Forecast"
      description="Actual spend to date with AI forecast against planned budget (all projects)"
      height={300}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={portfolioForecastData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="aiActualGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
              <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="aiForecastGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.violet} stopOpacity={0.2} />
              <stop offset="100%" stopColor={CHART_COLORS.violet} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={AXIS_TICK} dy={8} />
          <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} tickFormatter={compact} width={64} />
          <RechartsTooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={compact} />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} iconType="circle" iconSize={8} />
          <Line
            type="monotone"
            dataKey="budget"
            name="Planned Budget"
            stroke={CHART_COLORS.budget}
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="actual"
            name="Actual Spend"
            stroke={CHART_COLORS.primary}
            strokeWidth={2}
            fill="url(#aiActualGrad)"
            connectNulls
          />
          <Area
            type="monotone"
            dataKey="forecast"
            name="AI Forecast"
            stroke={CHART_COLORS.violet}
            strokeWidth={2}
            strokeDasharray="5 4"
            fill="url(#aiForecastGrad)"
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </AnalyticsChart>
  );
}
