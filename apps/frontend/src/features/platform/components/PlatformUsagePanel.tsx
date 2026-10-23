'use client';

import React from 'react';
import { format } from 'date-fns';
import { Button, Skeleton } from '@sitepilot/ui';
import { AlertTriangle, BarChart3 } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { usePlatformUsage } from '@/hooks/api/use-platform';

/** Calls paid for by the platform key, per day for the last 30 days. */
export function PlatformUsagePanel(): React.ReactElement {
  const { data: days = [], isLoading, isError, refetch } = usePlatformUsage();
  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (isError) return <EmptyState icon={AlertTriangle} title="Unable to load usage" description="Check your connection and try again." action={<Button variant="outline" onClick={() => refetch()}>Retry</Button>} />;
  if (days.length === 0) return <EmptyState icon={BarChart3} title="No platform-funded AI calls yet" description="Calls made under approved trials and top-ups will be counted here." />;

  const peak = Math.max(...days.map((day) => day.calls + day.failures), 1);
  const total = days.reduce((sum, day) => sum + day.calls, 0);
  const failed = days.reduce((sum, day) => sum + day.failures, 0);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{total.toLocaleString('en-IN')}</span> successful calls and {failed} failures in the last 30 days.
      </p>
      <ul className="space-y-1.5 rounded-xl border bg-card p-4" aria-label="Platform AI calls per day">
        {days.map((day) => (
          <li key={day.day} className="grid grid-cols-[72px_minmax(0,1fr)_64px] items-center gap-3 text-sm">
            <span className="text-muted-foreground">{format(new Date(day.day), 'dd MMM')}</span>
            <span className="flex h-3 overflow-hidden rounded bg-muted">
              <span className="bg-primary" style={{ width: `${(day.calls / peak) * 100}%` }} />
              <span className="bg-red-400" style={{ width: `${(day.failures / peak) * 100}%` }} />
            </span>
            <span className="text-right tabular-nums">{day.calls}{day.failures ? ` (+${day.failures}✕)` : ''}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
