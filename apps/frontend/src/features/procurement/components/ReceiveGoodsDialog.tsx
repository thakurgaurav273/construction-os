'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Textarea,
} from '@sitepilot/ui';
import { FormField } from '@/components/shared/FormField';
import { useReceiveGoods } from '@/hooks/api/use-procurement';
import { getApiErrorMessage } from '@/lib/api/errors';
import type { Delivery, PurchaseOrder } from '../types';
import { outstandingQuantity } from '../utils/order-rules';
import { receiveGoodsSchema, type ReceiveGoodsFormValues } from '../validation/delivery.schema';

export interface ReceiveGoodsRequest {
  order: PurchaseOrder;
  /** The scheduled delivery that arrived; omit for an unscheduled arrival. */
  delivery?: Delivery;
}

interface ReceiveGoodsDialogProps {
  request: ReceiveGoodsRequest | null;
  onClose: () => void;
}

function toFormValues(request: ReceiveGoodsRequest): ReceiveGoodsFormValues {
  return {
    receivedAt: format(new Date(), 'yyyy-MM-dd'),
    trackingId: request.delivery?.trackingId ?? '',
    notes: '',
    // Prefill the full outstanding quantity: most deliveries arrive complete, partials get edited down.
    lines: request.order.items.map((item) => ({
      poLineItemId: item.id,
      outstanding: outstandingQuantity(item),
      quantity: outstandingQuantity(item),
    })),
  };
}

export function ReceiveGoodsDialog({ request, onClose }: ReceiveGoodsDialogProps): React.ReactElement {
  const receiveGoods = useReceiveGoods();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ReceiveGoodsFormValues>({
    resolver: zodResolver(receiveGoodsSchema),
    defaultValues: { receivedAt: '', trackingId: '', notes: '', lines: [] },
  });

  useEffect(() => {
    if (request) reset(toFormValues(request));
  }, [request, reset]);

  async function onSubmit(values: ReceiveGoodsFormValues): Promise<void> {
    if (!request) return;
    try {
      const delivery = await receiveGoods.mutateAsync({
        orderId: request.order.id,
        input: {
          deliveryId: request.delivery?.id,
          receivedAt: values.receivedAt,
          trackingId: values.trackingId || undefined,
          notes: values.notes || undefined,
          items: values.lines
            .filter((line) => line.quantity > 0)
            .map((line) => ({ poLineItemId: line.poLineItemId, quantity: line.quantity })),
        },
      });
      toast.success(`${delivery.grnNumber ?? 'Goods receipt'} recorded`, { description: 'Order progress updated.' });
      onClose();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't record the receipt. Try again."));
    }
  }

  const items = request?.order.items ?? [];

  return (
    <Dialog open={!!request} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Receive Goods</DialogTitle>
          <DialogDescription>
            {request?.order.poNumber} · {request?.order.vendor?.name}. Enter what actually arrived; a GRN is generated.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Received on" htmlFor="grn-date" error={errors.receivedAt?.message}>
              <Input id="grn-date" type="date" max={format(new Date(), 'yyyy-MM-dd')} {...register('receivedAt')} />
            </FormField>
            <FormField label="Challan / vehicle no. (optional)" htmlFor="grn-tracking" error={errors.trackingId?.message}>
              <Input id="grn-tracking" {...register('trackingId')} />
            </FormField>
          </div>

          <div className="rounded-lg border divide-y">
            {items.map((item, index) => {
              const outstanding = outstandingQuantity(item);
              return (
                <div key={item.id} className="flex items-center gap-3 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.receivedQuantity} of {item.quantity} {item.unit} received · {outstanding} outstanding
                    </p>
                    {errors.lines?.[index]?.quantity?.message && (
                      <p className="text-xs text-destructive" role="alert">{errors.lines[index]?.quantity?.message}</p>
                    )}
                  </div>
                  <Input
                    aria-label={`Quantity received for ${item.description}`}
                    type="number"
                    step="any"
                    min={0}
                    max={outstanding}
                    readOnly={outstanding === 0}
                    className="w-28"
                    {...register(`lines.${index}.quantity`)}
                  />
                </div>
              );
            })}
          </div>
          {errors.lines?.root?.message && <p className="text-xs text-destructive" role="alert">{errors.lines.root.message}</p>}
          {errors.lines?.message && <p className="text-xs text-destructive" role="alert">{errors.lines.message}</p>}

          <FormField label="Notes (optional)" htmlFor="grn-notes" error={errors.notes?.message}>
            <Textarea id="grn-notes" rows={2} placeholder="Damages, shortages, quality remarks" {...register('notes')} />
          </FormField>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Recording…' : 'Record Receipt'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
