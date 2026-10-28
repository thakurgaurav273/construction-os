'use client';

import React from 'react';
import { format, parseISO } from 'date-fns';
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription, Badge, Skeleton } from '@sitepilot/ui';
import { CheckCircle2, Clock, XCircle, Calendar, ClipboardCheck } from 'lucide-react';
import { useAttendanceTrend, type Worker, type WorkforceStats } from '@/hooks/api/use-workforce';
import { formatCheckIn } from '@/features/workforce/utils/attendance';
import { Can } from '@/components/shared/Can';

const PRESENT_COLOR  = '#10b981';
const LATE_COLOR     = '#f59e0b';
const HALF_DAY_COLOR = '#8b5cf6';
const ABSENT_COLOR   = '#ef4444';
const ON_LEAVE_COLOR = '#3b82f6';

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  borderRadius: '8px',
  border: '1px solid hsl(var(--border))',
  fontSize: '12px',
};
const AXIS_TICK = { fill: 'hsl(var(--muted-foreground))', fontSize: 12 };

// Full class names so Tailwind can see them at build time.
const TONES = {
  emerald: { border: 'border-emerald-200 dark:border-emerald-800/50', icon: 'text-emerald-500', value: 'text-emerald-600' },
  amber:   { border: 'border-amber-200 dark:border-amber-800/50',     icon: 'text-amber-500',   value: 'text-amber-600' },
  red:     { border: 'border-red-200 dark:border-red-800/50',         icon: 'text-red-500',     value: 'text-red-600' },
  blue:    { border: 'border-blue-200 dark:border-blue-800/50',       icon: 'text-blue-500',    value: 'text-blue-600' },
};

interface AttendanceTabProps {
  workers: Worker[];
  stats: WorkforceStats | undefined;
  onMarkAttendance: () => void;
}

export function AttendanceTab({ workers, stats, onMarkAttendance }: AttendanceTabProps): React.ReactElement {
  const { data: trend, isLoading: trendLoading, isError: trendError, refetch } = useAttendanceTrend();
  const lateWorkers = workers.filter((w) => w.todayStatus === 'LATE');

  const summaryCards = [
    { label: 'On site', value: stats?.presentToday, note: `${stats?.lateToday ?? 0} arrived late`, icon: CheckCircle2, tone: 'emerald' },
    { label: 'Late', value: stats?.lateToday, note: 'After shift start + 30 min', icon: Clock, tone: 'amber' },
    { label: 'Absent', value: stats?.absentToday, note: 'Marked absent today', icon: XCircle, tone: 'red' },
    { label: 'Not marked', value: stats?.notMarkedToday, note: `${stats?.onLeaveToday ?? 0} on approved leave`, icon: Calendar, tone: 'blue' },
  ] as const;

  const dailyData = (trend?.daily ?? []).map((day) => ({ ...day, label: format(parseISO(day.date), 'EEE d') }));
  const weeklyData = (trend?.weekly ?? []).map((week) => ({
    ...week,
    label: format(parseISO(week.weekStart), 'MMM d'),
    rate: week.attendanceRate,
  }));

  return (
    <div className="space-y-6">
      {/* Today's Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map(({ label, value, note, icon: Icon, tone }) => (
          <Card key={label} className={TONES[tone].border}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">{label}</span>
                <Icon className={`h-4 w-4 ${TONES[tone].icon}`} />
              </div>
              {value === undefined
                ? <Skeleton className="h-8 w-12" />
                : <p className={`text-2xl font-bold ${TONES[tone].value}`}>{value}</p>}
              <p className="text-xs text-muted-foreground mt-1">{note}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {stats && stats.notMarkedToday > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-dashed p-4">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{stats.notMarkedToday} workers</span> haven&apos;t been marked today.
          </p>
          <Can permission="attendance.mark">
            <Button size="sm" onClick={onMarkAttendance}>
              <ClipboardCheck className="mr-2 h-4 w-4" /> Mark Attendance
            </Button>
          </Can>
        </div>
      )}

      {/* Charts Row */}
      {trendError ? (
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <p className="text-sm text-muted-foreground">Unable to load attendance trends.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Daily Attendance</CardTitle>
              <CardDescription>Workers by status over the last 14 days</CardDescription>
            </CardHeader>
            <CardContent className="pl-0">
              <div className="h-[260px]">
                {trendLoading ? <Skeleton className="h-full ml-6" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyData} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={AXIS_TICK} dy={8} interval="preserveStartEnd" />
                      <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} allowDecimals={false} />
                      <RechartsTooltip contentStyle={TOOLTIP_STYLE} />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} iconType="circle" iconSize={8} />
                      <Bar dataKey="present" name="Present"  fill={PRESENT_COLOR}  stackId="a" />
                      <Bar dataKey="late"    name="Late"     fill={LATE_COLOR}     stackId="a" />
                      <Bar dataKey="halfDay" name="Half day" fill={HALF_DAY_COLOR} stackId="a" />
                      <Bar dataKey="absent"  name="Absent"   fill={ABSENT_COLOR}   stackId="a" />
                      <Bar dataKey="onLeave" name="On Leave" fill={ON_LEAVE_COLOR} radius={[3, 3, 0, 0]} stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Weekly Trend</CardTitle>
              <CardDescription>Attendance rate (%) over the past 6 weeks, leave excluded</CardDescription>
            </CardHeader>
            <CardContent className="pl-0">
              <div className="h-[260px]">
                {trendLoading ? <Skeleton className="h-full ml-6" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weeklyData} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={PRESENT_COLOR} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={PRESENT_COLOR} stopOpacity={0}   />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={AXIS_TICK} dy={8} />
                      <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} domain={[0, 100]} unit="%" />
                      <RechartsTooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => [typeof value === 'number' ? `${value}%` : 'No records', 'Attendance']} />
                      <Area type="monotone" dataKey="rate" name="Attendance" stroke={PRESENT_COLOR} strokeWidth={2} fill="url(#presentGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Late Arrivals Today */}
      <Card>
        <CardHeader>
          <CardTitle>Late Arrivals Today</CardTitle>
          <CardDescription>{lateWorkers.length} workers checked in more than 30 minutes after shift start</CardDescription>
        </CardHeader>
        <CardContent>
          {lateWorkers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No late arrivals today.</p>
          ) : (
            <div className="space-y-2">
              {lateWorkers.map((worker) => (
                <div key={worker.id} className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30">
                  <div>
                    <p className="text-sm font-medium">{worker.name}</p>
                    <p className="text-xs text-muted-foreground">{worker.role} · {worker.project ?? 'Not assigned'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-amber-600">{formatCheckIn(worker.lastCheckInAt).replace('Today, ', '')}</p>
                    <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700 mt-0.5">Late</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
