'use client';

import React from 'react';
import { format } from 'date-fns';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AttendanceTrend } from '@/hooks/api/use-workforce';

const AXIS_TICK = { fill: 'hsl(var(--muted-foreground))', fontSize: 12 };
const DAYS_SHOWN = 7;

/** Workers on site per day: present, late and half-day all count as on site. */
export function AttendanceTrendChart({ trend }: { trend: AttendanceTrend }): React.ReactElement {
  const data = trend.daily.slice(-DAYS_SHOWN).map((day) => ({
    day: format(new Date(`${day.date}T00:00:00`), 'EEE'),
    onSite: day.present + day.late + day.halfDay,
  }));
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={AXIS_TICK} dy={10} />
          <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} allowDecimals={false} />
          <Tooltip
            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
            cursor={{ fill: 'hsl(var(--muted))' }}
          />
          <Bar dataKey="onSite" name="On site" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
