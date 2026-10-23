'use client';

import React, { useMemo } from 'react';
import { format } from 'date-fns';
import type { Delivery } from '@/features/procurement/types';
import { StatusBadge } from './StatusBadge';

const UPCOMING_LIMIT = 8;

function dotColor(delivery: Delivery): string {
  if (delivery.isDelayed) return 'bg-red-500';
  return delivery.status === 'IN_TRANSIT' ? 'bg-blue-500' : 'bg-amber-500';
}

interface DeliveryTimelineProps {
  deliveries: Delivery[];
  onSelect: (delivery: Delivery) => void;
}

export function DeliveryTimeline({ deliveries, onSelect }: DeliveryTimelineProps): React.ReactElement {
  const upcoming = useMemo(
    () =>
      deliveries
        .filter((d) => d.status === 'SCHEDULED' || d.status === 'IN_TRANSIT')
        .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
        .slice(0, UPCOMING_LIMIT),
    [deliveries],
  );

  if (upcoming.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No upcoming deliveries scheduled.</p>;
  }

  return (
    <div className="space-y-0">
      {upcoming.map((delivery, idx) => {
        const isLast = idx === upcoming.length - 1;
        return (
          <button
            key={delivery.id}
            type="button"
            onClick={() => onSelect(delivery)}
            className="flex w-full gap-3 rounded-md text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex flex-col items-center self-stretch">
              <span className={`h-3 w-3 rounded-full shrink-0 mt-1.5 ${dotColor(delivery)}`} />
              {!isLast && <span className="w-0.5 flex-1 bg-border" />}
            </div>
            <div className={`flex-1 min-w-0 ${isLast ? 'pb-0' : 'pb-5'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{delivery.purchaseOrder.poNumber}</p>
                  <p className="text-xs text-muted-foreground truncate">{delivery.vendor?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{delivery.project?.name}</p>
                </div>
                <StatusBadge kind="delivery" value={delivery.isDelayed ? 'DELAYED' : delivery.status} />
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs text-muted-foreground">{format(new Date(delivery.scheduledDate), 'EEE, dd MMM')}</span>
                {delivery.isDelayed && (
                  <span className="text-xs font-semibold text-red-600 dark:text-red-400">+{delivery.delayDays}d late</span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
