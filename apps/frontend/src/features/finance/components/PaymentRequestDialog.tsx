'use client';

import React, { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Textarea,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@sitepilot/ui';
import { FormField } from '@/components/shared/FormField';
import { useCreatePayment } from '@/hooks/api/use-finance';
import { getApiErrorMessage } from '@/lib/api/errors';
import { formatCurrency } from '@/lib/utils';
import { PAYMENT_METHODS } from '../constants';
import type { Invoice } from '../types';
import { paymentSchema, type PaymentFormValues } from '../validation/payment.schema';

interface PaymentRequestDialogProps {
  invoice: Invoice | null;
  onClose: () => void;
}

export function PaymentRequestDialog({ invoice, onClose }: PaymentRequestDialogProps): React.ReactElement {
  const createPayment = useCreatePayment();
  const maxAmount = invoice?.unscheduledAmount ?? 0;
  const schema = useMemo(() => paymentSchema(maxAmount), [maxAmount]);
  const { register, control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PaymentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { amount: 0, dueDate: '', method: 'bank_transfer', notes: '' },
  });

  useEffect(() => {
    if (invoice) reset({ amount: invoice.unscheduledAmount, dueDate: invoice.dueDate.slice(0, 10), method: 'bank_transfer', notes: '' });
  }, [invoice, reset]);

  async function onSubmit(values: PaymentFormValues): Promise<void> {
    if (!invoice) return;
    try {
      const payment = await createPayment.mutateAsync({
        invoiceId: invoice.id,
        amount: values.amount,
        dueDate: values.dueDate,
        method: values.method,
        notes: values.notes || undefined,
      });
      toast.success(`${payment.paymentNumber} sent for approval`, { description: `${formatCurrency(payment.amount)} to ${payment.vendorName}` });
      onClose();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't request the payment. Try again."));
    }
  }

  return (
    <Dialog open={!!invoice} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Request Payment</DialogTitle>
          <DialogDescription>
            {invoice?.invoiceNumber} · {invoice?.vendorName}. {formatCurrency(maxAmount)} is left to schedule. Another approver releases it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Amount (₹)" htmlFor="payment-amount" error={errors.amount?.message}>
              <Input id="payment-amount" type="number" step="0.01" min={0} max={maxAmount} {...register('amount')} />
            </FormField>
            <FormField label="Pay by" htmlFor="payment-due" error={errors.dueDate?.message}>
              <Input id="payment-due" type="date" {...register('dueDate')} />
            </FormField>
          </div>
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
          <FormField label="Notes (optional)" htmlFor="payment-notes" error={errors.notes?.message}>
            <Textarea id="payment-notes" rows={2} placeholder="e.g. Retention of 5% held until handover" {...register('notes')} />
          </FormField>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || maxAmount <= 0}>{isSubmitting ? 'Sending…' : 'Send for Approval'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
