'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from '@sitepilot/ui';
import { useAttendanceTrend } from '@/hooks/api/use-workforce';
import type { SpendTrendPoint } from '../types';

const chartSkeleton = (height: string) => function ChartSkeleton(): React.ReactElement {
  return <Skeleton className={`${height} w-full rounded-lg`} />;
};

const SpendTrendChart = dynamic(() => import('./SpendTrendChart').then((mod) => mod.SpendTrendChart), { ssr: false, loading: chartSkeleton('h-[280px]') });
const AttendanceTrendChart = dynamic(() => import('./AttendanceTrendChart').then((mod) => mod.AttendanceTrendChart), { ssr: false, loading: chartSkeleton('h-[220px]') });

export function SpendTrendCard({ trend }: { trend: SpendTrendPoint[] }): React.ReactElement {
  const hasData = trend.some((point) => point.planned > 0 || point.actual > 0);
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Planned vs paid out</CardTitle>
        <CardDescription>Budgets spread over each project’s timeline, against payments released, last 6 months.</CardDescription>
      </CardHeader>
      <CardContent className={hasData ? 'pl-0' : undefined}>
        {hasData ? <SpendTrendChart data={trend} /> : (
          <div className="flex h-[280px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-center">
            <p className="max-w-xs text-sm text-muted-foreground">Add budgets and dates to projects, and release payments in Finance, to see spend over time.</p>
            <Button variant="outline" size="sm" asChild><Link href="/dashboard/finance">Open Finance</Link></Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AttendanceTrendCard(): React.ReactElement {
  const { data: trend, isLoading, isError, refetch } = useAttendanceTrend();
  const hasData = trend?.daily.some((day) => day.present + day.late + day.halfDay + day.absent + day.onLeave > 0) ?? false;

  function body(): React.ReactNode {
    if (isLoading) return <Skeleton className="h-[220px] w-full rounded-lg" />;
    if (isError || !trend) {
      return (
        <div className="flex h-[220px] flex-col items-center justify-center gap-2 text-center">
          <p className="text-sm text-muted-foreground">Unable to load attendance.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
        </div>
      );
    }
    if (!hasData) {
      return (
        <div className="flex h-[220px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-center">
          <p className="max-w-xs text-sm text-muted-foreground">No attendance marked this week. Mark today’s attendance to see the trend.</p>
          <Button variant="outline" size="sm" asChild><Link href="/dashboard/workforce">Open Workforce</Link></Button>
        </div>
      );
    }
    return <AttendanceTrendChart trend={trend} />;
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Workforce trend</CardTitle>
        <CardDescription>Workers on site each day, last 7 days.</CardDescription>
      </CardHeader>
      <CardContent className={hasData ? 'pb-2 pl-0' : undefined}>{body()}</CardContent>
    </Card>
  );
}
