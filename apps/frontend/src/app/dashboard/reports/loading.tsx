import React from 'react';
import { Skeleton } from '@sitepilot/ui';

export default function ReportsLoading(): React.ReactElement {
  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40 rounded-md" />
        <Skeleton className="h-4 w-96 max-w-full rounded-md" />
      </div>
      <Skeleton className="h-10 w-72 rounded-md" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-52 w-full rounded-xl" />)}
      </div>
    </div>
  );
}
