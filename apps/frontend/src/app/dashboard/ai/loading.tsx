import React from 'react';
import { Skeleton } from '@sitepilot/ui';

export default function AiCommandCenterLoading(): React.ReactElement {
  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-72 rounded-md" />
          <Skeleton className="h-4 w-96 rounded-md" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>
      </div>

      {/* Executive summary banner */}
      <Skeleton className="h-48 w-full rounded-xl" />

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="rounded-xl border border-border/60 bg-card p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="h-4 w-4 rounded-md" />
            </div>
            <Skeleton className="h-7 w-16 rounded-md" />
            <Skeleton className="h-3 w-28 rounded-md" />
          </div>
        ))}
      </div>

      {/* Forecast + actions */}
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-6">
          <Skeleton className="h-80 w-full rounded-xl" />
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        </div>
        <div className="xl:col-span-1">
          <Skeleton className="h-[28rem] w-full rounded-xl" />
        </div>
      </div>

      {/* Insights + timeline */}
      <div className="grid gap-6 xl:grid-cols-3">
        <Skeleton className="h-72 w-full rounded-xl xl:col-span-2" />
        <Skeleton className="h-72 w-full rounded-xl xl:col-span-1" />
      </div>
    </div>
  );
}
