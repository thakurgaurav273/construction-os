import React from 'react';
import { Skeleton } from '@sitepilot/ui';

export default function AiCommandCenterLoading(): React.ReactElement {
  return (
    <div className="mx-auto max-w-5xl flex-1 space-y-6 p-4 pt-6 md:p-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-72 rounded-md" />
        <Skeleton className="h-4 w-96 rounded-md" />
      </div>
      <div className="space-y-3">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-24 w-full rounded-xl" />)}</div>
    </div>
  );
}
