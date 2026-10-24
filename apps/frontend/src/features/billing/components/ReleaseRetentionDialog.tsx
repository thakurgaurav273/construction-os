'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Textarea,
} from '@sitepilot/ui';
import { FormField } from '@/components/shared/FormField';
import { useReleaseRetention } from '@/hooks/api/use-billing';
import { getApiErrorMessage } from '@/lib/api/errors';
import type { ContractDetail } from '../types';
import { formatAmount } from '../utils/format';
import {
  retentionReleaseSchema, toRetentionReleaseFormValues, toRetentionReleaseInput, type RetentionReleaseFormValues,
} from '../validation/settlement.schema';

interface ReleaseRetentionDialogProps {
  contract: ContractDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReleaseRetentionDialog({ contract, open, onOpenChange }: ReleaseRetentionDialogProps): React.ReactElement {
  const release = useReleaseRetention();
  const { balance } = contract.retention;
  const toClient = contract.direction === 'CLIENT';
  const schema = useMemo(() => retentionReleaseSchema(balance), [balance]);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<RetentionReleaseFormValues>({
    resolver: zodResolver(schema),
    defaultValues: toRetentionReleaseFormValues(balance),
  });

  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) reset(toRetentionReleaseFormValues(balance));
    wasOpen.current = open;
  }, [open, balance, reset]);

  async function onSubmit(values: RetentionReleaseFormValues): Promise<void> {
    try {
      await release.mutateAsync({ contractId: contract.id, input: toRetentionReleaseInput(values) });
      toast.success(toClient ? `${formatAmount(values.amount)} of retention recorded as received` : `${formatAmount(values.amount)} of retention sent to Finance to pay`);
      onOpenChange(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't release the retention. Try again."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{toClient ? 'Record retention received' : 'Release retention'}</DialogTitle>
          <DialogDescription>
            {formatAmount(balance)} is held on {contract.code}.{' '}
            {toClient
              ? 'Record what the client paid back, e.g. after the defect liability period.'
              : 'An approved bill for this amount goes to Finance, which pays it through the usual payment approval.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Amount (₹)" htmlFor="release-amount" error={errors.amount?.message}>
              <Input id="release-amount" type="number" step="0.01" min={0} {...register('amount')} />
            </FormField>
            <FormField label={toClient ? 'Received on' : 'Released on'} htmlFor="release-date" error={errors.releasedOn?.message}>
              <Input id="release-date" type="date" {...register('releasedOn')} />
            </FormField>
          </div>
          <FormField label="Reference (optional)" htmlFor="release-reference" error={errors.reference?.message} hint={toClient ? 'UTR or release letter number' : 'e.g. completion certificate number'}>
            <Input id="release-reference" {...register('reference')} />
          </FormField>
          <FormField label="Note (optional)" htmlFor="release-note" error={errors.note?.message}>
            <Textarea id="release-note" rows={2} {...register('note')} />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : toClient ? 'Record Received' : 'Release'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
