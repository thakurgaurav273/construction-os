'use client';

import React from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Button } from '@sitepilot/ui';
import { PackageCheck, Truck, X } from 'lucide-react';
import { useDeliveryTransition } from '@/hooks/api/use-procurement';
import { useCan } from '@/hooks/api/use-access';
import { getApiErrorMessage } from '@/lib/api/errors';
import type { Delivery, PurchaseOrderDetail } from '@/features/procurement/types';
import { StatusBadge } from './StatusBadge';

interface PurchaseOrderDeliveriesProps {
  order: PurchaseOrderDetail;
  onReceive: (delivery: Delivery) => void;
}

export function PurchaseOrderDeliveries({ order, onReceive }: PurchaseOrderDeliveriesProps): React.ReactElement {
  const transition = useDeliveryTransition();
  const canReceive = useCan()('delivery.receive');

  async function runTransition(delivery: Delivery, kind: 'in-transit' | 'cancel'): Promise<void> {
    try {
      await transition.mutateAsync({ id: delivery.id, transition: kind });
      toast.success(kind === 'cancel' ? 'Delivery cancelled' : 'Marked in transit');
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't update the delivery. Try again."));
    }
  }

  if (order.deliveries.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        {order.status === 'APPROVED' ? 'No deliveries scheduled yet. Schedule one or record goods as they arrive.' : 'Deliveries can be scheduled once the order is approved.'}
      </p>
    );
  }

  return (
    <div className="divide-y">
      {order.deliveries.map((delivery) => {
        const isOpen = delivery.status === 'SCHEDULED' || delivery.status === 'IN_TRANSIT';
        return (
          <div key={delivery.id} className="py-2.5 first:pt-0 last:pb-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {delivery.grnNumber ?? (delivery.status === 'CANCELLED' ? 'Cancelled delivery' : 'Scheduled delivery')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {delivery.receivedAt
                    ? `Received ${format(new Date(delivery.receivedAt), 'dd MMM yyyy')}${delivery.receivedBy ? ` by ${delivery.receivedBy.name}` : ''}`
                    : `Due ${format(new Date(delivery.scheduledDate), 'dd MMM yyyy')}`}
                  {delivery.trackingId && ` · ${delivery.trackingId}`}
                </p>
                {delivery.items.length > 0 && (
                  <p className="text-xs text-muted-foreground truncate">
                    {delivery.items.map((item) => `${item.quantity} ${item.unit} ${item.description}`).join(', ')}
                  </p>
                )}
              </div>
              <StatusBadge kind="delivery" value={delivery.isDelayed ? 'DELAYED' : delivery.status} />
            </div>
            {isOpen && canReceive && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => onReceive(delivery)}>
                  <PackageCheck className="h-3 w-3" /> Receive
                </Button>
                {delivery.status === 'SCHEDULED' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1 text-xs"
                    disabled={transition.isPending}
                    onClick={() => runTransition(delivery, 'in-transit')}
                  >
                    <Truck className="h-3 w-3" /> In transit
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 text-xs text-muted-foreground hover:text-destructive"
                  disabled={transition.isPending}
                  onClick={() => runTransition(delivery, 'cancel')}
                >
                  <X className="h-3 w-3" /> Cancel
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
