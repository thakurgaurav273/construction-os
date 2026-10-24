'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Textarea,
} from '@sitepilot/ui';
import { FormField } from '@/components/shared/FormField';
import { useCreateRaBill } from '@/hooks/api/use-billing';
import { getApiErrorMessage } from '@/lib/api/errors';
import type { ContractDetail, RaBillDetail } from '../types';
import { raBillSchema, toRaBillFormValues, toRaBillInput, type RaBillFormValues } from '../validation/ra-bill.schema';

interface NewRaBillDialogProps {
  contract: ContractDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (bill: RaBillDetail) => void;
}

export function NewRaBillDialog({ contract, open, onOpenChange, onCreated }: NewRaBillDialogProps): React.ReactElement {
  const createBill = useCreateRaBill();
  const lastBill = [...contract.bills].reverse().find((bill) => bill.status === 'CERTIFIED');
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<RaBillFormValues>({
    resolver: zodResolver(raBillSchema),
    defaultValues: toRaBillFormValues(undefined, lastBill?.periodTo, contract.startDate),
  });

  useEffect(() => {
    if (open) reset(toRaBillFormValues(undefined, lastBill?.periodTo, contract.startDate));
  }, [open, lastBill?.periodTo, contract.startDate, reset]);

  async function onSubmit(values: RaBillFormValues): Promise<void> {
    try {
      const bill = await createBill.mutateAsync({ contractId: contract.id, input: toRaBillInput(values) });
      toast.success(`${bill.code} started`, { description: 'Enter the measurements for each item worked on.' });
      onOpenChange(false);
      onCreated(bill);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't start the bill. Try again."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>New RA Bill</DialogTitle>
          <DialogDescription>
            {lastBill
              ? `Quantities certified on ${lastBill.code} and earlier bills carry forward as "previous".`
              : 'This is the first bill on this contract.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Period from" htmlFor="bill-from" error={errors.periodFrom?.message}>
              <Input id="bill-from" type="date" {...register('periodFrom')} />
            </FormField>
            <FormField label="Period to" htmlFor="bill-to" error={errors.periodTo?.message}>
              <Input id="bill-to" type="date" {...register('periodTo')} />
            </FormField>
          </div>
          <FormField label="Their bill number (optional)" htmlFor="bill-reference" error={errors.reference?.message}>
            <Input id="bill-reference" placeholder="RA Bill No-04" {...register('reference')} />
          </FormField>
          <FormField label="Notes (optional)" htmlFor="bill-notes" error={errors.notes?.message}>
            <Textarea id="bill-notes" rows={2} {...register('notes')} />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Starting…' : 'Start Bill'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
