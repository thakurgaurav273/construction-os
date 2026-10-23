import React from 'react';
import { Skeleton } from '@sitepilot/ui';

/**
 * Shown for any dashboard route while its code loads. It mirrors the shared page frame (title,
 * description, one content panel) rather than any one page, so the page's own skeleton follows
 * without the layout jumping.
 */
export default function DashboardLoading(): React.ReactElement {
  return (
    <div className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-4 pt-6 md:p-8" aria-busy="true" aria-label="Loading page">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56 rounded-md" />
        <Skeleton className="h-4 w-80 max-w-full rounded-md" />
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b p-4"><Skeleton className="h-9 w-full max-w-sm rounded-md" /></div>
        <div className="space-y-3 p-4">
          {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-10 w-full rounded-md" />)}
        </div>
      </div>
    </div>
  );
}
