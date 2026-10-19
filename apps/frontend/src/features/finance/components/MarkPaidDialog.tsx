'use client';

import React, { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@sitepilot/ui';
import { FormField } from '@/components/shared/FormField';
import { useMarkPaymentPaid } from '@/hooks/api/use-finance';
import { getApiErrorMessage } from '@/lib/api/errors';
import { formatCurrency } from '@/lib/utils';
import { PAYMENT_METHODS } from '../constants';
import type { Payment, PaymentMethod } from '../types';
import { markPaidSchema, type MarkPaidFormValues } from '../validation/payment.schema';

interface MarkPaidDialogProps {
  payment: Payment | null;
  onClose: () => void;
}

const isPaymentMethod = (value: string): value is PaymentMethod => PAYMENT_METHODS.some((method) => method.value === value);

export function MarkPaidDialog({ payment, onClose }: MarkPaidDialogProps): React.ReactElement {
  const markPaid = useMarkPaymentPaid();
  const today = format(new Date(), 'yyyy-MM-dd');
  const { register, control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<MarkPaidFormValues>({
    resolver: zodResolver(markPaidSchema),
    defaultValues: { paidDate: today, reference: '', method: 'bank_transfer' },
  });

  useEffect(() => {
    if (payment) reset({ paidDate: today, reference: '', method: isPaymentMethod(payment.method) ? payment.method : 'bank_transfer' });
  }, [payment, reset, today]);

  async function onSubmit(values: MarkPaidFormValues): Promise<void> {
    if (!payment) return;
    try {
      await markPaid.mutateAsync({ id: payment.id, input: values });
      toast.success(`${payment.paymentNumber} marked as paid`, { description: 'The invoice balance is updated.' });
      onClose();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't record the payment. Try again."));
    }
  }

  return (
    <Dialog open={!!payment} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Record Bank Payment</DialogTitle>
          <DialogDescription>
            {payment?.paymentNumber} · {payment ? formatCurrency(payment.amount) : ''} to {payment?.vendorName}. Enter the details from your bank.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Paid on" htmlFor="paid-date" error={errors.paidDate?.message}>
              <Input id="paid-date" type="date" max={today} {...register('paidDate')} />
            </FormField>
            <FormField label="Method">
              <Controller control={control} name="method" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-label="Payment method"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </FormField>
          </div>
          <FormField label="UTR / cheque no." htmlFor="paid-reference" error={errors.reference?.message}>
            <Input id="paid-reference" placeholder="e.g. HDFCN26102012345" {...register('reference')} />
          </FormField>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Mark as Paid'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
