'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Card, CardContent, Badge, Skeleton,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@sitepilot/ui';
import { CalendarClock, Truck, PackageCheck, AlertTriangle } from 'lucide-react';
import type { Delivery, ProcurementAnalytics } from '@/features/procurement/types';
import { StatusBadge, type DeliveryBadgeValue } from './StatusBadge';
import {
  AnalyticsChart, AXIS_TICK, CHART_TOOLTIP_STYLE, CHART_GRID_STROKE, CHART_COLORS,
} from './AnalyticsChart';
import { DeliveryTimeline } from './DeliveryTimeline';
import { MobileCard, MobileCardList, useIncrementalItems } from '@/components/shared/MobileList';

const DELIVERY_FILTERS = ['all', 'SCHEDULED', 'IN_TRANSIT', 'RECEIVED', 'DELAYED', 'CANCELLED'] as const;
type DeliveryFilter = (typeof DELIVERY_FILTERS)[number];

interface StatusCard {
  key: Exclude<DeliveryFilter, 'all' | 'CANCELLED'>;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  border: string;
  text: string;
}

const STATUS_CARDS: StatusCard[] = [
  { key: 'SCHEDULED', label: 'Scheduled', icon: CalendarClock, border: 'border-amber-200 dark:border-amber-800/50', text: 'text-amber-600' },
  { key: 'IN_TRANSIT', label: 'In Transit', icon: Truck, border: 'border-blue-200 dark:border-blue-800/50', text: 'text-blue-600' },
  { key: 'RECEIVED', label: 'Received', icon: PackageCheck, border: 'border-emerald-200 dark:border-emerald-800/50', text: 'text-emerald-600' },
  { key: 'DELAYED', label: 'Delayed', icon: AlertTriangle, border: 'border-red-200 dark:border-red-800/50', text: 'text-red-600' },
];

function deliveryBadgeValue(delivery: Delivery): DeliveryBadgeValue {
  return delivery.isDelayed ? 'DELAYED' : delivery.status;
}

function matchesFilter(delivery: Delivery, filter: DeliveryFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'DELAYED') return delivery.isDelayed;
  return delivery.status === filter;
}

/** Axis ticks have ~90px per vendor; the first word ("Tata", "UltraTech") is enough to tell them apart. */
const shortVendorName = (name: string): string => {
  const [first] = name.split(/\s+/);
  return first.length > 12 ? `${first.slice(0, 11)}…` : first;
};

function itemSummary(delivery: Delivery): string {
  if (delivery.items.length === 0) return delivery.notes ?? '—';
  return delivery.items.map((item) => `${item.quantity} ${item.unit} ${item.description}`).join(', ');
}

interface DeliveriesTabProps {
  deliveries: Delivery[];
  analytics: ProcurementAnalytics | undefined;
  onOpenOrder: (orderId: string) => void;
}

export function DeliveriesTab({ deliveries, analytics, onOpenOrder }: DeliveriesTabProps): React.ReactElement {
  const [statusFilter, setStatusFilter] = useState<DeliveryFilter>('all');

  const counts = useMemo(
    () => Object.fromEntries(STATUS_CARDS.map((card) => [card.key, deliveries.filter((d) => matchesFilter(d, card.key)).length])),
    [deliveries],
  );
  const filtered = useMemo(() => deliveries.filter((d) => matchesFilter(d, statusFilter)), [deliveries, statusFilter]);
  const phoneList = useIncrementalItems(filtered, statusFilter);
  const emptyMessage = deliveries.length === 0
    ? 'No deliveries yet. Schedule one from an approved purchase order.'
    : 'No deliveries match this filter.';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATUS_CARDS.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.div key={card.key} initial={false} animate={{ opacity: 1, y: 0 }}>
              <Card className={card.border}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">{card.label}</p>
                    <Icon className={`h-4 w-4 ${card.text}`} />
                  </div>
                  <p className={`text-2xl font-bold mt-1 ${card.text}`}>{counts[card.key] ?? 0}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AnalyticsChart title="Weekly Deliveries" description="Received on time vs late, by week" height={260}>
          {analytics ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.weeklyDeliveries} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={AXIS_TICK} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} allowDecimals={false} />
                <RechartsTooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: 'hsl(var(--muted)/0.4)' }} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} iconType="circle" iconSize={8} />
                <Bar dataKey="onTime" name="On Time" fill={CHART_COLORS.onTime} stackId="a" />
                <Bar dataKey="late" name="Late" fill={CHART_COLORS.late} radius={[3, 3, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          ) : <Skeleton className="ml-6 h-full rounded-lg" />}
        </AnalyticsChart>

        <AnalyticsChart title="Supplier Performance" description="On-time delivery rate, busiest vendors" height={260}>
          {analytics && analytics.supplierPerformance.length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-muted-foreground">Appears once deliveries are received.</p>
          ) : analytics ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.supplierPerformance} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
                <XAxis dataKey="vendor" axisLine={false} tickLine={false} tick={{ ...AXIS_TICK, fontSize: 11 }} interval={0} dy={8} tickFormatter={shortVendorName} />
                <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} domain={[0, 100]} unit="%" />
                <RechartsTooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: 'hsl(var(--muted)/0.4)' }} formatter={(value) => `${value}%`} />
                <Bar dataKey="onTimePercent" name="On-Time %" fill={CHART_COLORS.onTime} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Skeleton className="ml-6 h-full rounded-lg" />}
        </AnalyticsChart>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardContent className="p-5">
            <h4 className="text-sm font-semibold mb-4">Upcoming Deliveries</h4>
            <DeliveryTimeline deliveries={deliveries} onSelect={(delivery) => onOpenOrder(delivery.purchaseOrder.id)} />
          </CardContent>
        </Card>

        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Showing {filtered.length} of {deliveries.length} deliveries</p>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(DELIVERY_FILTERS.find((filter) => filter === value) ?? 'all')}>
              <SelectTrigger className="w-full sm:w-44" aria-label="Delivery status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                <SelectItem value="RECEIVED">Received</SelectItem>
                <SelectItem value="DELAYED">Delayed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <MobileCardList
            items={phoneList.visible}
            getKey={(delivery) => delivery.id}
            hasMore={phoneList.hasMore}
            onLoadMore={phoneList.loadMore}
            empty={<div className="rounded-xl border bg-card px-4 py-12 text-center text-sm text-muted-foreground">{emptyMessage}</div>}
            renderCard={(delivery) => (
              <MobileCard
                onClick={() => onOpenOrder(delivery.purchaseOrder.id)}
                title={delivery.purchaseOrder.poNumber}
                subtitle={delivery.vendor?.name ?? '—'}
                aside={<StatusBadge kind="delivery" value={deliveryBadgeValue(delivery)} />}
                meta={[
                  { label: 'Date', value: format(new Date(delivery.receivedAt ?? delivery.scheduledDate), 'dd MMM yyyy') },
                  { label: 'GRN / Tracking', value: delivery.grnNumber ?? delivery.trackingId ?? '—' },
                  { label: 'Items', value: itemSummary(delivery) },
                  { label: 'Project', value: delivery.project?.name ?? '—' },
                ]}
              />
            )}
          />

          <div className="hidden rounded-xl border overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">PO Number</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden md:table-cell">Vendor</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden lg:table-cell">Project</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden xl:table-cell">Category</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Items</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden xl:table-cell">GRN / Tracking</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-muted-foreground">
                        {emptyMessage}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((delivery, idx) => (
                      <motion.tr
                        key={delivery.id}
                        initial={false}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => onOpenOrder(delivery.purchaseOrder.id)}
                        onKeyDown={(event) => { if (event.key === 'Enter') onOpenOrder(delivery.purchaseOrder.id); }}
                        tabIndex={0}
                        className="border-b last:border-0 hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3 font-medium whitespace-nowrap">{delivery.purchaseOrder.poNumber}</td>
                        <td className="px-4 py-3 hidden md:table-cell text-muted-foreground max-w-[180px] truncate">{delivery.vendor?.name ?? '—'}</td>
                        <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground max-w-[160px] truncate">{delivery.project?.name ?? '—'}</td>
                        <td className="px-4 py-3 hidden xl:table-cell">
                          <Badge variant="secondary" className="text-xs">{delivery.purchaseOrder.category}</Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{itemSummary(delivery)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          {format(new Date(delivery.receivedAt ?? delivery.scheduledDate), 'dd MMM yyyy')}
                        </td>
                        <td className="px-4 py-3"><StatusBadge kind="delivery" value={deliveryBadgeValue(delivery)} /></td>
                        <td className="px-4 py-3 hidden xl:table-cell font-mono text-xs text-muted-foreground">
                          {delivery.grnNumber ?? delivery.trackingId ?? '—'}
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
