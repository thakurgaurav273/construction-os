'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Textarea,
} from '@sitepilot/ui';
import { FormField } from '@/components/shared/FormField';
import { useScheduleDelivery } from '@/hooks/api/use-procurement';
import { getApiErrorMessage } from '@/lib/api/errors';
import type { PurchaseOrder } from '../types';
import { scheduleDeliverySchema, type ScheduleDeliveryFormValues } from '../validation/delivery.schema';

interface ScheduleDeliveryDialogProps {
  order: PurchaseOrder | null;
  onClose: () => void;
}

export function ScheduleDeliveryDialog({ order, onClose }: ScheduleDeliveryDialogProps): React.ReactElement {
  const scheduleDelivery = useScheduleDelivery();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ScheduleDeliveryFormValues>({
    resolver: zodResolver(scheduleDeliverySchema),
    defaultValues: { scheduledDate: '', trackingId: '', notes: '' },
  });

  useEffect(() => {
    if (order) reset({ scheduledDate: order.expectedDelivery.slice(0, 10), trackingId: '', notes: '' });
  }, [order, reset]);

  async function onSubmit(values: ScheduleDeliveryFormValues): Promise<void> {
    if (!order) return;
    try {
      await scheduleDelivery.mutateAsync({
        orderId: order.id,
        input: { scheduledDate: values.scheduledDate, trackingId: values.trackingId || undefined, notes: values.notes || undefined },
      });
      toast.success(`Delivery scheduled for ${order.poNumber}`);
      onClose();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't schedule the delivery. Try again."));
    }
  }

  return (
    <Dialog open={!!order} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Schedule Delivery</DialogTitle>
          <DialogDescription>{order?.poNumber} · {order?.vendor?.name}. The site team will see it under upcoming deliveries.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormField label="Delivery date" htmlFor="delivery-date" error={errors.scheduledDate?.message}>
            <Input id="delivery-date" type="date" {...register('scheduledDate')} />
          </FormField>
          <FormField label="Tracking / vehicle no. (optional)" htmlFor="delivery-tracking" error={errors.trackingId?.message}>
            <Input id="delivery-tracking" placeholder="KA-01-AB-1234" {...register('trackingId')} />
          </FormField>
          <FormField label="Notes (optional)" htmlFor="delivery-notes" error={errors.notes?.message}>
            <Textarea id="delivery-notes" rows={2} {...register('notes')} />
          </FormField>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Scheduling…' : 'Schedule'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
