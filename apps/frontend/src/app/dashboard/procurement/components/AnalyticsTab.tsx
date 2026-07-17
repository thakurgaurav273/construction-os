'use client';

import React from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Card, CardContent } from '@sitepilot/ui';
import {
  AnalyticsChart, AXIS_TICK, CHART_TOOLTIP_STYLE, CHART_GRID_STROKE,
  CHART_COLORS, CATEGORICAL_PALETTE,
} from './AnalyticsChart';
import { formatCompactINR, formatCurrency } from './procurement-format';
import {
  monthlySpendData, spendByCategoryData, spendByVendorData,
  cycleTimeData, approvalBottleneckData,
} from '@/data/procurement-demo';

const compact = (value: number | string): string => formatCompactINR(Number(value));
const truncate = (value: string): string => (value.length > 16 ? `${value.slice(0, 16)}…` : value);

const totalApprovedSpend = spendByCategoryData.reduce((sum, item) => sum + item.spend, 0);
const latestCycle = cycleTimeData[cycleTimeData.length - 1];
const latestMonth = monthlySpendData[monthlySpendData.length - 1];
const budgetUtilization = Math.round((latestMonth.spend / latestMonth.budget) * 100);

export function AnalyticsTab(): React.ReactElement {
  return (
    <div className="space-y-6">
      {/* Summary strip */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-indigo-200 dark:border-indigo-800/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Approved Spend</p>
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
              {formatCompactINR(totalApprovedSpend)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{formatCurrency(totalApprovedSpend)}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 dark:border-emerald-800/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Avg RFQ-to-PO Cycle</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {latestCycle.rfqToPo.toFixed(1)} days
            </p>
            <p className="text-xs text-muted-foreground mt-1">Down from {cycleTimeData[0].rfqToPo.toFixed(1)} days in Feb</p>
          </CardContent>
        </Card>
        <Card className={budgetUtilization > 100 ? 'border-red-200 dark:border-red-800/50' : 'border-amber-200 dark:border-amber-800/50'}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Budget Utilization (Jul)</p>
            <p className={`text-2xl font-bold mt-1 ${budgetUtilization > 100 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {budgetUtilization}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCompactINR(latestMonth.spend)} of {formatCompactINR(latestMonth.budget)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AnalyticsChart
          title="Monthly Procurement Spend"
          description="Approved procurement value over the last six months"
          height={280}
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlySpendData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.spend} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={CHART_COLORS.spend} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={AXIS_TICK} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} tickFormatter={compact} width={64} />
              <RechartsTooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={compact} />
              <Area
                type="monotone"
                dataKey="spend"
                name="Spend"
                stroke={CHART_COLORS.spend}
                strokeWidth={2}
                fill="url(#spendGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </AnalyticsChart>

        <AnalyticsChart
          title="Budget vs Procurement"
          description="Sanctioned budget against actual procurement value"
          height={280}
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlySpendData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={AXIS_TICK} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} tickFormatter={compact} width={64} />
              <RechartsTooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={compact} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} iconType="circle" iconSize={8} />
              <Bar dataKey="budget" name="Budget" fill={CHART_COLORS.budget} radius={[3, 3, 0, 0]} />
              <Bar dataKey="spend" name="Procurement" fill={CHART_COLORS.spend} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChart>

        <AnalyticsChart
          title="Spend by Category"
          description="Approved spend across material categories"
          height={280}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={spendByCategoryData}
              layout="vertical"
              margin={{ top: 5, right: 24, left: 8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART_GRID_STROKE} />
              <XAxis type="number" axisLine={false} tickLine={false} tick={AXIS_TICK} tickFormatter={compact} />
              <YAxis
                type="category"
                dataKey="category"
                axisLine={false}
                tickLine={false}
                tick={AXIS_TICK}
                width={90}
              />
              <RechartsTooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={compact} cursor={{ fill: 'hsl(var(--muted)/0.4)' }} />
              <Bar dataKey="spend" name="Spend" radius={[0, 3, 3, 0]}>
                {spendByCategoryData.map((entry, index) => (
                  <Cell key={entry.category} fill={CATEGORICAL_PALETTE[index % CATEGORICAL_PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChart>

        <AnalyticsChart
          title="Spend by Vendor"
          description="Top vendors by approved procurement value"
          height={280}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={spendByVendorData}
              layout="vertical"
              margin={{ top: 5, right: 24, left: 8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART_GRID_STROKE} />
              <XAxis type="number" axisLine={false} tickLine={false} tick={AXIS_TICK} tickFormatter={compact} />
              <YAxis
                type="category"
                dataKey="vendor"
                axisLine={false}
                tickLine={false}
                tick={AXIS_TICK}
                width={120}
                tickFormatter={truncate}
              />
              <RechartsTooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={compact} cursor={{ fill: 'hsl(var(--muted)/0.4)' }} />
              <Bar dataKey="spend" name="Spend" radius={[0, 3, 3, 0]}>
                {spendByVendorData.map((entry, index) => (
                  <Cell key={entry.vendor} fill={CATEGORICAL_PALETTE[index % CATEGORICAL_PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChart>

        <AnalyticsChart
          title="Procurement Cycle Time"
          description="Average days per stage, trending down"
          height={280}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cycleTimeData} margin={{ top: 5, right: 20, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={AXIS_TICK} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} />
              <RechartsTooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value) => `${Number(value).toFixed(1)} days`} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} iconType="circle" iconSize={8} />
              <Line type="monotone" dataKey="rfqToPo" name="RFQ → PO" stroke={CHART_COLORS.spend} strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="approvalDays" name="Approval" stroke={CHART_COLORS.amber} strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="deliveryDays" name="Delivery" stroke={CHART_COLORS.onTime} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </AnalyticsChart>

        <AnalyticsChart
          title="Approval Bottlenecks"
          description="Average days and pending orders per approval stage"
          height={280}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={approvalBottleneckData} margin={{ top: 5, right: 12, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
              <XAxis
                dataKey="stage"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                interval={0}
                dy={8}
              />
              <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={AXIS_TICK} />
              <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={AXIS_TICK} />
              <RechartsTooltip contentStyle={CHART_TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} iconType="circle" iconSize={8} />
              <Bar yAxisId="left" dataKey="avgDays" name="Avg Days" fill={CHART_COLORS.spend} radius={[3, 3, 0, 0]} />
              <Bar yAxisId="right" dataKey="pending" name="Pending Orders" fill={CHART_COLORS.amber} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChart>
      </div>
    </div>
  );
}
