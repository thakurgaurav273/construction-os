import React from 'react';
import { Skeleton } from '@sitepilot/ui';

export default function BillingLoading(): React.ReactElement {
  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40 rounded-md" />
          <Skeleton className="h-4 w-96 max-w-full rounded-md" />
        </div>
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>
      <Skeleton className="h-10 w-72 rounded-md" />
      <div className="flex flex-col gap-3 sm:flex-row">
        <Skeleton className="h-10 flex-1 max-w-sm rounded-md" />
        <Skeleton className="h-10 w-48 rounded-md" />
        <Skeleton className="h-10 w-56 rounded-md" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-16 w-full rounded-lg" />)}
      </div>
    </div>
  );
}
