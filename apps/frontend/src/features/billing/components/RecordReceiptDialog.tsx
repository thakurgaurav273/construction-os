'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Textarea,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@sitepilot/ui';
import { FormField } from '@/components/shared/FormField';
import { useRecordReceipt } from '@/hooks/api/use-billing';
import { getApiErrorMessage } from '@/lib/api/errors';
import { formatAmount } from '../utils/format';
import {
  PAYMENT_METHODS, receiptSchema, toReceiptFormValues, toReceiptInput, type ReceiptFormValues,
} from '../validation/settlement.schema';

interface RecordReceiptDialogProps {
  billId: string;
  billCode: string;
  outstanding: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RecordReceiptDialog({ billId, billCode, outstanding, open, onOpenChange }: RecordReceiptDialogProps): React.ReactElement {
  const recordReceipt = useRecordReceipt();
  const schema = useMemo(() => receiptSchema(outstanding), [outstanding]);
  const { register, control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ReceiptFormValues>({
    resolver: zodResolver(schema),
    defaultValues: toReceiptFormValues(outstanding),
  });

  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) reset(toReceiptFormValues(outstanding));
    wasOpen.current = open;
  }, [open, outstanding, reset]);

  async function onSubmit(values: ReceiptFormValues): Promise<void> {
    try {
      await recordReceipt.mutateAsync({ billId, input: toReceiptInput(values) });
      toast.success(`${formatAmount(values.amount)} recorded against ${billCode}`);
      onOpenChange(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't record the receipt. Try again."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Record money received</DialogTitle>
          <DialogDescription>{formatAmount(outstanding)} is outstanding on {billCode}. Part payments are fine.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Amount (₹)" htmlFor="receipt-amount" error={errors.amount?.message}>
              <Input id="receipt-amount" type="number" step="0.01" min={0} {...register('amount')} />
            </FormField>
            <FormField label="Received on" htmlFor="receipt-date" error={errors.receivedDate?.message}>
              <Input id="receipt-date" type="date" {...register('receivedDate')} />
            </FormField>
            <FormField label="Method">
              <Controller control={control} name="method" render={({ field }) => (
                <Select value={field.value} onValueChange={(value) => { if (value) field.onChange(value); }}>
                  <SelectTrigger aria-label="Method"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </FormField>
            <FormField label="UTR / cheque no. (optional)" htmlFor="receipt-reference" error={errors.reference?.message}>
              <Input id="receipt-reference" {...register('reference')} />
            </FormField>
          </div>
          <FormField label="Notes (optional)" htmlFor="receipt-notes" error={errors.notes?.message}>
            <Textarea id="receipt-notes" rows={2} {...register('notes')} />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Recording…' : 'Record Receipt'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
