'use client';

import React from 'react';
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge } from '@sitepilot/ui';
import { CheckCircle2, Clock, XCircle, Calendar } from 'lucide-react';
import { dailyAttendanceData, weeklyTrendData, Worker } from '@/data/workforce-demo';

const PRESENT_COLOR  = '#10b981';
const LATE_COLOR     = '#f59e0b';
const ABSENT_COLOR   = '#ef4444';
const ON_LEAVE_COLOR = '#3b82f6';

interface AttendanceTabProps {
  workers: Worker[];
}

export function AttendanceTab({ workers }: AttendanceTabProps): React.ReactElement {
  const todayPresent  = workers.filter((w) => w.status === 'active').length;
  const todayLate     = workers.filter((w) => w.status === 'late').length;
  const todayAbsent   = workers.filter((w) => w.status === 'absent').length;
  const todayOnLeave  = workers.filter((w) => w.status === 'on_leave').length;

  const lateWorkers = workers.filter((w) => w.status === 'late');

  return (
    <div className="space-y-6">
      {/* Today's Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-emerald-200 dark:border-emerald-800/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Present</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-emerald-600">{todayPresent}</p>
            <p className="text-xs text-muted-foreground mt-1">On time today</p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 dark:border-amber-800/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Late</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-amber-600">{todayLate}</p>
            <p className="text-xs text-muted-foreground mt-1">Arrived late</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 dark:border-red-800/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Absent</span>
              <XCircle className="h-4 w-4 text-red-500" />
            </div>
            <p className="text-2xl font-bold text-red-600">{todayAbsent}</p>
            <p className="text-xs text-muted-foreground mt-1">No notification</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 dark:border-blue-800/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">On Leave</span>
              <Calendar className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-blue-600">{todayOnLeave}</p>
            <p className="text-xs text-muted-foreground mt-1">Approved leave</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Daily Attendance Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Attendance</CardTitle>
            <CardDescription>Present, late & absent by day this week</CardDescription>
          </CardHeader>
          <CardContent className="pl-0">
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyAttendanceData} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    dy={8}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderRadius: '8px',
                      border: '1px solid hsl(var(--border))',
                      fontSize: '12px',
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
                    iconType="circle"
                    iconSize={8}
                  />
                  <Bar dataKey="present" name="Present"  fill={PRESENT_COLOR}  radius={[3, 3, 0, 0]} stackId="a" />
                  <Bar dataKey="late"    name="Late"     fill={LATE_COLOR}     radius={[0, 0, 0, 0]} stackId="a" />
                  <Bar dataKey="absent"  name="Absent"   fill={ABSENT_COLOR}   radius={[0, 0, 0, 0]} stackId="a" />
                  <Bar dataKey="onLeave" name="On Leave" fill={ON_LEAVE_COLOR} radius={[3, 3, 0, 0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Trend</CardTitle>
            <CardDescription>Attendance pattern over the past 6 weeks</CardDescription>
          </CardHeader>
          <CardContent className="pl-0">
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyTrendData} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={PRESENT_COLOR} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={PRESENT_COLOR} stopOpacity={0}   />
                    </linearGradient>
                    <linearGradient id="absentGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={ABSENT_COLOR} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={ABSENT_COLOR} stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="week"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    dy={8}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderRadius: '8px',
                      border: '1px solid hsl(var(--border))',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} iconType="circle" iconSize={8} />
                  <Area type="monotone" dataKey="present" name="Present" stroke={PRESENT_COLOR} strokeWidth={2} fill="url(#presentGrad)" />
                  <Area type="monotone" dataKey="absent"  name="Absent"  stroke={ABSENT_COLOR}  strokeWidth={2} fill="url(#absentGrad)"  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Late Arrivals Today */}
      <Card>
        <CardHeader>
          <CardTitle>Late Arrivals Today</CardTitle>
          <CardDescription>{lateWorkers.length} workers checked in after 08:30 AM</CardDescription>
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
                    <p className="text-xs text-muted-foreground">{worker.role} · {worker.project}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-amber-600">{worker.lastCheckIn?.replace('Today, ', '') ?? '-'}</p>
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
