'use client';

import React from 'react';
import {
  BarChart, Bar, LineChart, Line, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Button, Card, CardContent, Skeleton } from '@sitepilot/ui';
import { AlertTriangle, BarChart3 } from 'lucide-react';
import { useProcurementAnalytics } from '@/hooks/api/use-procurement';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  AnalyticsChart, AXIS_TICK, CHART_TOOLTIP_STYLE, CHART_GRID_STROKE, CHART_COLORS, CATEGORICAL_PALETTE,
} from './AnalyticsChart';
import { formatCompactINR, formatCurrency } from './procurement-format';

const compact = (value: number | string): string => formatCompactINR(Number(value));
const truncate = (value: string): string => (value.length > 16 ? `${value.slice(0, 16)}…` : value);
const days = (value: number | null): string => (value === null ? '—' : `${value.toFixed(1)} days`);

function SummaryCard({ label, value, detail, accent }: { label: string; value: string; detail: string; accent: string }): React.ReactElement {
  return (
    <Card className={accent}>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{detail}</p>
      </CardContent>
    </Card>
  );
}

export function AnalyticsTab(): React.ReactElement {
  const { data: analytics, isLoading, isError, refetch } = useProcurementAnalytics();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-72 w-full rounded-xl" />)}
      </div>
    );
  }

  if (isError || !analytics) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Unable to load procurement analytics"
        description="The analytics service didn't respond. Your orders and deliveries are unaffected."
        action={<Button variant="outline" onClick={() => refetch()}>Retry</Button>}
      />
    );
  }

  const { totals } = analytics;
  if (totals.committed === 0 && analytics.byCategory.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No spend to analyse yet"
        description="Charts fill in as purchase orders are approved and goods are received."
      />
    );
  }

  const receivedShare = totals.committed ? Math.round((totals.received / totals.committed) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Committed Spend"
          value={formatCompactINR(totals.committed)}
          detail={`${formatCurrency(totals.committed)} approved`}
          accent="border-indigo-200 dark:border-indigo-800/50"
        />
        <SummaryCard
          label="Goods Received"
          value={`${receivedShare}%`}
          detail={`${formatCompactINR(totals.received)} of committed value delivered`}
          accent="border-emerald-200 dark:border-emerald-800/50"
        />
        <SummaryCard
          label="Avg Approval Time"
          value={days(totals.avgApprovalDays)}
          detail={`RFQ to award ${days(totals.avgRfqToAwardDays)} · delivery ${days(totals.avgDeliveryDays)}`}
          accent="border-amber-200 dark:border-amber-800/50"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AnalyticsChart
          title="Committed vs Received"
          description="Approved order value against goods received, by month"
          height={280}
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.monthly} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={AXIS_TICK} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} tickFormatter={compact} width={64} />
              <RechartsTooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={compact} cursor={{ fill: 'hsl(var(--muted)/0.4)' }} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} iconType="circle" iconSize={8} />
              <Bar dataKey="committed" name="Committed" fill={CHART_COLORS.spend} radius={[3, 3, 0, 0]} />
              <Bar dataKey="received" name="Received" fill={CHART_COLORS.onTime} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChart>

        <AnalyticsChart title="Spend by Category" description="Approved spend across material categories" height={280}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.byCategory} layout="vertical" margin={{ top: 5, right: 24, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART_GRID_STROKE} />
              <XAxis type="number" axisLine={false} tickLine={false} tick={AXIS_TICK} tickFormatter={compact} />
              <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={AXIS_TICK} width={90} />
              <RechartsTooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={compact} cursor={{ fill: 'hsl(var(--muted)/0.4)' }} />
              <Bar dataKey="value" name="Spend" radius={[0, 3, 3, 0]}>
                {analytics.byCategory.map((entry, index) => (
                  <Cell key={entry.name} fill={CATEGORICAL_PALETTE[index % CATEGORICAL_PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChart>

        <AnalyticsChart title="Spend by Vendor" description="Top vendors by approved procurement value" height={280}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.byVendor} layout="vertical" margin={{ top: 5, right: 24, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART_GRID_STROKE} />
              <XAxis type="number" axisLine={false} tickLine={false} tick={AXIS_TICK} tickFormatter={compact} />
              <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={AXIS_TICK} width={120} tickFormatter={truncate} />
              <RechartsTooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={compact} cursor={{ fill: 'hsl(var(--muted)/0.4)' }} />
              <Bar dataKey="value" name="Spend" radius={[0, 3, 3, 0]}>
                {analytics.byVendor.map((entry, index) => (
                  <Cell key={entry.name} fill={CATEGORICAL_PALETTE[index % CATEGORICAL_PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChart>

        <AnalyticsChart title="Procurement Cycle Time" description="Average days per stage, by month" height={280}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={analytics.cycleTimes} margin={{ top: 5, right: 20, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={AXIS_TICK} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} />
              <RechartsTooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value) => `${Number(value).toFixed(1)} days`} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} iconType="circle" iconSize={8} />
              <Line type="monotone" dataKey="rfqToAwardDays" name="RFQ → Award" stroke={CHART_COLORS.spend} strokeWidth={2} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="approvalDays" name="Approval" stroke={CHART_COLORS.amber} strokeWidth={2} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="deliveryDays" name="Delivery" stroke={CHART_COLORS.onTime} strokeWidth={2} dot={{ r: 3 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </AnalyticsChart>

        <AnalyticsChart title="Approval Queue" description="Orders awaiting approval, by days waiting" height={280}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.approvalQueue} margin={{ top: 5, right: 12, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ ...AXIS_TICK, fontSize: 10 }} interval={0} dy={8} />
              <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={AXIS_TICK} allowDecimals={false} />
              <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={AXIS_TICK} tickFormatter={compact} width={56} />
              <RechartsTooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                formatter={(value, name) => (name === 'Value' ? compact(Number(value)) : value)}
                cursor={{ fill: 'hsl(var(--muted)/0.4)' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} iconType="circle" iconSize={8} />
              <Bar yAxisId="left" dataKey="count" name="Orders" fill={CHART_COLORS.amber} radius={[3, 3, 0, 0]} />
              <Bar yAxisId="right" dataKey="value" name="Value" fill={CHART_COLORS.spend} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChart>
      </div>
    </div>
  );
}
