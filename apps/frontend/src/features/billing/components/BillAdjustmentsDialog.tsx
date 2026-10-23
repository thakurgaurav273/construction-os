'use client';

import React, { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@sitepilot/ui';
import { useUpdateRaBill } from '@/hooks/api/use-billing';
import { getApiErrorMessage } from '@/lib/api/errors';
import { MAX_ADJUSTMENTS } from '../constants';
import type { RaBillDetail } from '../types';
import { adjustmentSchema } from '../validation/contract.schema';
import { AdjustmentRulesEditor } from './AdjustmentRulesEditor';

const billAdjustmentsSchema = z.object({ adjustments: z.array(adjustmentSchema).max(MAX_ADJUSTMENTS) });
type BillAdjustmentsValues = z.infer<typeof billAdjustmentsSchema>;

const toValues = (bill: RaBillDetail): BillAdjustmentsValues => ({
  adjustments: bill.adjustments.map(({ label, effect, calculation, value }) => ({ label, effect, calculation, value })),
});

/** Changes taxes and deductions on this bill only, e.g. this month's advance recovery. */
export function BillAdjustmentsDialog({ bill, open, onOpenChange }: { bill: RaBillDetail; open: boolean; onOpenChange: (open: boolean) => void }): React.ReactElement {
  const updateBill = useUpdateRaBill();
  const { register, control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<BillAdjustmentsValues>({
    resolver: zodResolver(billAdjustmentsSchema),
    defaultValues: toValues(bill),
  });

  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) reset(toValues(bill));
    wasOpen.current = open;
  }, [open, bill, reset]);

  async function onSubmit(values: BillAdjustmentsValues): Promise<void> {
    try {
      await updateBill.mutateAsync({ id: bill.id, input: { adjustments: values.adjustments } });
      toast.success('Taxes and deductions updated');
      onOpenChange(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't update the bill. Try again."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Taxes & deductions on {bill.code}</DialogTitle>
          <DialogDescription>Only this bill changes. Edit the contract to change them for future bills.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <AdjustmentRulesEditor control={control} register={register} errors={errors} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
