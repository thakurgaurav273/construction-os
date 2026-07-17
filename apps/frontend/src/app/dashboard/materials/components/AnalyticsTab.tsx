'use client';

import React from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@sitepilot/ui';
import { AlertTriangle, TrendingDown, PackageX } from 'lucide-react';
import { useMaterialsDashboard, type MaterialsDashboard } from '@/hooks/api/use-materials';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatNumber } from '@/lib/utils';
import {
  MaterialsChartCard, AXIS_TICK, CHART_TOOLTIP_STYLE, CHART_GRID_STROKE,
  CHART_COLORS, CATEGORICAL_PALETTE,
} from './MaterialsChartCard';
import { formatCompactINR, getStatusMeta } from './materials-format';

const compact = (value: number | string): string => formatCompactINR(Number(value));
const truncate = (value: string): string => (value.length > 16 ? `${value.slice(0, 16)}…` : value);

function AnalyticsSkeleton(): React.ReactElement {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-72 w-full rounded-xl" />
      ))}
    </div>
  );
}

function AnalyticsContent({ dashboard }: { dashboard: MaterialsDashboard }): React.ReactElement {
  const { categorySplit, consumptionTrend, supplierSpend, lowStock, deadStock } = dashboard;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <MaterialsChartCard
        title="Consumption Trend"
        description="Inbound vs outbound stock movement over time"
        className="lg:col-span-2"
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={consumptionTrend} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="inboundGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.inbound} stopOpacity={0.3} />
                <stop offset="100%" stopColor={CHART_COLORS.inbound} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="outboundGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.outbound} stopOpacity={0.3} />
                <stop offset="100%" stopColor={CHART_COLORS.outbound} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={AXIS_TICK} dy={8} />
            <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} width={48} />
            <RechartsTooltip contentStyle={CHART_TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} iconType="circle" iconSize={8} />
            <Area type="monotone" dataKey="inbound" name="Inbound" stroke={CHART_COLORS.inbound} strokeWidth={2} fill="url(#inboundGrad)" />
            <Area type="monotone" dataKey="outbound" name="Outbound" stroke={CHART_COLORS.outbound} strokeWidth={2} fill="url(#outboundGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </MaterialsChartCard>

      <MaterialsChartCard title="Inventory Value by Category" description="Stock value held across material categories">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={categorySplit} layout="vertical" margin={{ top: 5, right: 24, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART_GRID_STROKE} />
            <XAxis type="number" axisLine={false} tickLine={false} tick={AXIS_TICK} tickFormatter={compact} />
            <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={AXIS_TICK} width={100} tickFormatter={truncate} />
            <RechartsTooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={compact} cursor={{ fill: 'hsl(var(--muted)/0.4)' }} />
            <Bar dataKey="value" name="Value" radius={[0, 3, 3, 0]}>
              {categorySplit.map((entry, index) => (
                <Cell key={entry.name} fill={CATEGORICAL_PALETTE[index % CATEGORICAL_PALETTE.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </MaterialsChartCard>

      <MaterialsChartCard title="Category Split" description="Number of materials per category">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={categorySplit}
              dataKey="count"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={2}
            >
              {categorySplit.map((entry, index) => (
                <Cell key={entry.name} fill={CATEGORICAL_PALETTE[index % CATEGORICAL_PALETTE.length]} />
              ))}
            </Pie>
            <RechartsTooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value: number | string) => formatNumber(Number(value))} />
            <Legend wrapperStyle={{ fontSize: '12px' }} iconType="circle" iconSize={8} />
          </PieChart>
        </ResponsiveContainer>
      </MaterialsChartCard>

      <MaterialsChartCard title="Supplier Spend" description="Procurement spend by supplier" className="lg:col-span-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={supplierSpend} layout="vertical" margin={{ top: 5, right: 24, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART_GRID_STROKE} />
            <XAxis type="number" axisLine={false} tickLine={false} tick={AXIS_TICK} tickFormatter={compact} />
            <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={AXIS_TICK} width={130} tickFormatter={truncate} />
            <RechartsTooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={compact} cursor={{ fill: 'hsl(var(--muted)/0.4)' }} />
            <Bar dataKey="spend" name="Spend" radius={[0, 3, 3, 0]}>
              {supplierSpend.map((entry, index) => (
                <Cell key={entry.name} fill={CATEGORICAL_PALETTE[index % CATEGORICAL_PALETTE.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </MaterialsChartCard>

      {/* Low stock */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <TrendingDown className="h-4 w-4 text-amber-500" />
          <CardTitle className="text-base">Low Stock Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          {lowStock.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Everything is above its reorder point.</p>
          ) : (
            <div className="space-y-2">
              {lowStock.map((item) => {
                const meta = getStatusMeta(item.status);
                return (
                  <div key={item.id} className="flex items-center justify-between gap-2 border-b border-dashed last:border-0 py-2">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <div className="text-right shrink-0">
                      <span className={`text-sm font-semibold ${meta.accentClass}`}>
                        {formatNumber(item.available)} {item.unit}
                      </span>
                      <span className="text-xs text-muted-foreground"> / min {formatNumber(item.minStock)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dead stock */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <PackageX className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Dead Stock</CardTitle>
        </CardHeader>
        <CardContent>
          {deadStock.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No idle inventory detected.</p>
          ) : (
            <div className="space-y-2">
              {deadStock.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2 border-b border-dashed last:border-0 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{formatNumber(item.quantity)} {item.unit} idle</p>
                  </div>
                  <span className="text-sm font-semibold shrink-0">{formatCompactINR(item.stockValue)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function AnalyticsTab(): React.ReactElement {
  const { data, isLoading, isError, refetch } = useMaterialsDashboard();

  if (isError) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Unable to load analytics"
        description="Something went wrong while fetching inventory analytics. Please try again."
        action={<button className="text-sm font-medium text-primary" onClick={() => refetch()}>Retry</button>}
      />
    );
  }

  if (isLoading || !data) return <AnalyticsSkeleton />;

  return <AnalyticsContent dashboard={data} />;
}
