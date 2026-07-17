'use client';

import React, { useMemo } from 'react';
import { format } from 'date-fns';
import type { Delivery, DeliveryStatus } from '@/data/procurement-demo';
import { StatusBadge } from './StatusBadge';

const DOT_COLOR: Record<DeliveryStatus, string> = {
  not_started: 'bg-muted-foreground/40',
  pending: 'bg-amber-500',
  in_transit: 'bg-blue-500',
  delivered: 'bg-emerald-500',
  delayed: 'bg-red-500',
};

interface DeliveryTimelineProps {
  deliveries: Delivery[];
}

export function DeliveryTimeline({ deliveries }: DeliveryTimelineProps): React.ReactElement {
  const upcoming = useMemo(
    () =>
      deliveries
        .filter((d) => d.status === 'pending' || d.status === 'in_transit')
        .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
        .slice(0, 8),
    [deliveries],
  );

  if (upcoming.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No upcoming deliveries scheduled.
      </p>
    );
  }

  return (
    <div className="space-y-0">
      {upcoming.map((delivery, idx) => {
        const isLast = idx === upcoming.length - 1;
        return (
          <div key={delivery.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className={`h-3 w-3 rounded-full shrink-0 mt-1.5 ${DOT_COLOR[delivery.status]}`} />
              {!isLast && <span className="w-0.5 flex-1 bg-border" />}
            </div>
            <div className={`flex-1 ${isLast ? 'pb-0' : 'pb-5'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{delivery.poNumber}</p>
                  <p className="text-xs text-muted-foreground truncate">{delivery.vendorName}</p>
                  <p className="text-xs text-muted-foreground truncate">{delivery.projectName}</p>
                </div>
                <StatusBadge kind="delivery" value={delivery.status} />
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs text-muted-foreground">
                  {format(new Date(delivery.scheduledDate), 'EEE, dd MMM')}
                </span>
                {delivery.delayDays > 0 && (
                  <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                    +{delivery.delayDays}d late
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
