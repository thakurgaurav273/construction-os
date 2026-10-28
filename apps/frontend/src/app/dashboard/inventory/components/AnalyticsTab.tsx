'use client';

import React from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@sitepilot/ui';
import { AlertTriangle, TrendingUp, TrendingDown, PackageX } from 'lucide-react';
import { useInventoryAnalytics, type InventoryAnalytics } from '@/hooks/api/use-inventory';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatNumber } from '@/lib/utils';
import {
  MaterialsChartCard, AXIS_TICK, CHART_TOOLTIP_STYLE, CHART_GRID_STROKE,
  CHART_COLORS, CATEGORICAL_PALETTE,
} from '../../materials/components/MaterialsChartCard';
import { formatCompactINR } from './inventory-format';

const compact = (value: number | string): string => formatCompactINR(Number(value));
const truncate = (value: string): string => (value.length > 16 ? `${value.slice(0, 16)}…` : value);
const qty = (value: number | string): string => formatNumber(Number(value));

function AnalyticsSkeleton(): React.ReactElement {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-72 w-full rounded-xl" />
      ))}
    </div>
  );
}

function MoverList({
  title,
  icon: Icon,
  iconClass,
  movers,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  movers: InventoryAnalytics['fastMoving'];
}): React.ReactElement {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 space-y-0">
        <Icon className={`h-4 w-4 ${iconClass}`} />
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {movers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Not enough movement data yet.</p>
        ) : (
          <div className="space-y-2">
            {movers.map((m) => (
              <div key={m.name} className="flex items-center justify-between gap-2 border-b border-dashed last:border-0 py-2">
                <p className="text-sm font-medium truncate">{m.name}</p>
                <span className="text-sm font-semibold shrink-0">{formatNumber(m.movement)} {m.unit}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AnalyticsContent({ analytics }: { analytics: InventoryAnalytics }): React.ReactElement {
  const {
    valueByWarehouse, warehouseUtilization, stockAging, monthlyConsumption,
    transferVolume, fastMoving, slowMoving, deadStock,
  } = analytics;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <MaterialsChartCard title="Inventory Value by Warehouse" description="Stock value held per warehouse">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={valueByWarehouse} layout="vertical" margin={{ top: 5, right: 24, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART_GRID_STROKE} />
            <XAxis type="number" axisLine={false} tickLine={false} tick={AXIS_TICK} tickFormatter={compact} />
            <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={AXIS_TICK} width={110} tickFormatter={truncate} />
            <RechartsTooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={compact} cursor={{ fill: 'hsl(var(--muted)/0.4)' }} />
            <Bar dataKey="value" name="Value" radius={[0, 3, 3, 0]}>
              {valueByWarehouse.map((entry, index) => (
                <Cell key={entry.name} fill={CATEGORICAL_PALETTE[index % CATEGORICAL_PALETTE.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </MaterialsChartCard>

      <MaterialsChartCard title="Warehouse Utilization" description="Capacity used per warehouse (%)">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={warehouseUtilization} layout="vertical" margin={{ top: 5, right: 24, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART_GRID_STROKE} />
            <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={AXIS_TICK} tickFormatter={(v) => `${v}%`} />
            <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={AXIS_TICK} width={110} tickFormatter={truncate} />
            <RechartsTooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: number | string) => `${v}%`} cursor={{ fill: 'hsl(var(--muted)/0.4)' }} />
            <Bar dataKey="utilization" name="Utilization" radius={[0, 3, 3, 0]} fill={CHART_COLORS.violet} />
          </BarChart>
        </ResponsiveContainer>
      </MaterialsChartCard>

      <MaterialsChartCard title="Monthly Consumption" description="Stock issued to site over time" className="lg:col-span-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={monthlyConsumption} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="invConsumptionGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.outbound} stopOpacity={0.3} />
                <stop offset="100%" stopColor={CHART_COLORS.outbound} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={AXIS_TICK} dy={8} />
            <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} width={48} tickFormatter={qty} />
            <RechartsTooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={qty} />
            <Area type="monotone" dataKey="consumption" name="Consumption" stroke={CHART_COLORS.outbound} strokeWidth={2} fill="url(#invConsumptionGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </MaterialsChartCard>

      <MaterialsChartCard title="Stock Aging" description="Inventory value by age bucket">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={stockAging} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
            <XAxis dataKey="bucket" axisLine={false} tickLine={false} tick={AXIS_TICK} dy={8} />
            <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} width={48} tickFormatter={compact} />
            <RechartsTooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={compact} cursor={{ fill: 'hsl(var(--muted)/0.4)' }} />
            <Bar dataKey="value" name="Value" radius={[3, 3, 0, 0]}>
              {stockAging.map((entry, index) => (
                <Cell key={entry.bucket} fill={CATEGORICAL_PALETTE[index % CATEGORICAL_PALETTE.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </MaterialsChartCard>

      <MaterialsChartCard title="Transfer Volume" description="Quantity transferred between warehouses">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={transferVolume} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={AXIS_TICK} dy={8} />
            <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} width={48} tickFormatter={qty} />
            <RechartsTooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={qty} cursor={{ fill: 'hsl(var(--muted)/0.4)' }} />
            <Bar dataKey="quantity" name="Transferred" radius={[3, 3, 0, 0]} fill={CHART_COLORS.primary} />
          </BarChart>
        </ResponsiveContainer>
      </MaterialsChartCard>

      <MoverList title="Fast Moving" icon={TrendingUp} iconClass="text-emerald-500" movers={fastMoving} />
      <MoverList title="Slow Moving" icon={TrendingDown} iconClass="text-amber-500" movers={slowMoving} />

      {/* Dead stock */}
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <PackageX className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Dead Stock</CardTitle>
        </CardHeader>
        <CardContent>
          {deadStock.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No idle inventory detected.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {deadStock.map((item) => (
                <div key={`${item.name}-${item.warehouse}`} className="flex items-center justify-between gap-2 border-b border-dashed py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatNumber(item.quantity)} {item.unit} · {item.warehouse}
                    </p>
                  </div>
                  <span className="text-sm font-semibold shrink-0">{formatCompactINR(item.value)}</span>
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
  const { data, isLoading, isError, refetch } = useInventoryAnalytics();

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

  return <AnalyticsContent analytics={data} />;
}
