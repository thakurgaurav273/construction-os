'use client';

import React from 'react';
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCrore } from '../format';
import type { SpendTrendPoint } from '../types';

const AXIS_TICK = { fill: 'hsl(var(--muted-foreground))', fontSize: 12 };

/** Loaded on demand: recharts is heavy and the dashboard should paint its numbers first. */
export function SpendTrendChart({ data }: { data: SpendTrendPoint[] }): React.ReactElement {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="spendPlanned" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="spendActual" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.25} />
              <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={AXIS_TICK} dy={10} />
          <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} width={72} tickFormatter={(value: number) => formatCrore(value)} />
          <Tooltip
            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
            formatter={(value: number) => formatCrore(value)}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Area type="monotone" dataKey="planned" name="Planned" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#spendPlanned)" />
          <Area type="monotone" dataKey="actual" name="Paid out" stroke="hsl(var(--destructive))" strokeWidth={2} fill="url(#spendActual)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
