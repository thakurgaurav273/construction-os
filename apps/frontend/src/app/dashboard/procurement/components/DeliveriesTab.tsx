'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Card, CardContent, Badge,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@sitepilot/ui';
import { Clock, Truck, PackageCheck, AlertTriangle } from 'lucide-react';
import type { Delivery, DeliveryStatus } from '@/data/procurement-demo';
import { weeklyDeliveryData, supplierPerformanceData } from '@/data/procurement-demo';
import { StatusBadge } from './StatusBadge';
import {
  AnalyticsChart, AXIS_TICK, CHART_TOOLTIP_STYLE, CHART_GRID_STROKE, CHART_COLORS,
} from './AnalyticsChart';
import { DeliveryTimeline } from './DeliveryTimeline';

interface StatusCard {
  key: DeliveryStatus;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  border: string;
  text: string;
}

const STATUS_CARDS: StatusCard[] = [
  { key: 'pending', label: 'Pending', icon: Clock, border: 'border-amber-200 dark:border-amber-800/50', text: 'text-amber-600' },
  { key: 'in_transit', label: 'In Transit', icon: Truck, border: 'border-blue-200 dark:border-blue-800/50', text: 'text-blue-600' },
  { key: 'delivered', label: 'Delivered', icon: PackageCheck, border: 'border-emerald-200 dark:border-emerald-800/50', text: 'text-emerald-600' },
  { key: 'delayed', label: 'Delayed', icon: AlertTriangle, border: 'border-red-200 dark:border-red-800/50', text: 'text-red-600' },
];

interface DeliveriesTabProps {
  deliveries: Delivery[];
}

export function DeliveriesTab({ deliveries }: DeliveriesTabProps): React.ReactElement {
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const counts = useMemo(() => {
    return deliveries.reduce<Record<string, number>>((acc, d) => {
      acc[d.status] = (acc[d.status] ?? 0) + 1;
      return acc;
    }, {});
  }, [deliveries]);

  const filtered = useMemo(
    () => (statusFilter === 'all' ? deliveries : deliveries.filter((d) => d.status === statusFilter)),
    [deliveries, statusFilter],
  );

  return (
    <div className="space-y-6">
      {/* Status KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATUS_CARDS.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
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

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AnalyticsChart title="Weekly Deliveries" description="On-time vs late by week" height={260}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyDeliveryData} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
              <XAxis dataKey="week" axisLine={false} tickLine={false} tick={AXIS_TICK} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} />
              <RechartsTooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: 'hsl(var(--muted)/0.4)' }} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} iconType="circle" iconSize={8} />
              <Bar dataKey="onTime" name="On Time" fill={CHART_COLORS.onTime} radius={[3, 3, 0, 0]} stackId="a" />
              <Bar dataKey="late" name="Late" fill={CHART_COLORS.late} radius={[3, 3, 0, 0]} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChart>

        <AnalyticsChart title="Supplier Performance" description="On-time & quality index (top vendors)" height={260}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={supplierPerformanceData} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
              <XAxis
                dataKey="vendor"
                axisLine={false}
                tickLine={false}
                tick={{ ...AXIS_TICK, fontSize: 10 }}
                interval={0}
                dy={8}
              />
              <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} />
              <RechartsTooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: 'hsl(var(--muted)/0.4)' }} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} iconType="circle" iconSize={8} />
              <Bar dataKey="onTime" name="On-Time %" fill={CHART_COLORS.onTime} radius={[3, 3, 0, 0]} />
              <Bar dataKey="quality" name="Quality Index" fill={CHART_COLORS.quality} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChart>
      </div>

      {/* Upcoming + Table */}
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardContent className="p-5">
            <h4 className="text-sm font-semibold mb-4">Upcoming Deliveries</h4>
            <DeliveryTimeline deliveries={deliveries} />
          </CardContent>
        </Card>

        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Showing {filtered.length} of {deliveries.length} deliveries
            </p>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_transit">In Transit</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="delayed">Delayed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">PO Number</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden md:table-cell">Vendor</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden lg:table-cell">Project</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden xl:table-cell">Category</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Item</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Scheduled</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden xl:table-cell">Tracking</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-muted-foreground">
                        No deliveries match this filter.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((delivery, idx) => (
                      <motion.tr
                        key={delivery.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(idx, 20) * 0.02 }}
                        className="border-b last:border-0 hover:bg-muted/40 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium whitespace-nowrap">{delivery.poNumber}</td>
                        <td className="px-4 py-3 hidden md:table-cell text-muted-foreground max-w-[180px] truncate">{delivery.vendorName}</td>
                        <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground max-w-[160px] truncate">{delivery.projectName}</td>
                        <td className="px-4 py-3 hidden xl:table-cell">
                          <Badge variant="secondary" className="text-xs">{delivery.category}</Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{delivery.itemSummary}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          {format(new Date(delivery.scheduledDate), 'dd MMM yyyy')}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge kind="delivery" value={delivery.status} />
                        </td>
                        <td className="px-4 py-3 hidden xl:table-cell font-mono text-xs text-muted-foreground">{delivery.trackingId}</td>
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
