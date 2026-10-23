'use client';

import React, { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Textarea,
} from '@sitepilot/ui';
import { FormField } from '@/components/shared/FormField';
import { useRecordQuote } from '@/hooks/api/use-procurement';
import { getApiErrorMessage } from '@/lib/api/errors';
import { formatCurrency } from '@/lib/utils';
import type { RfqDetail, RfqInvitation } from '../types';
import { quoteSchema, toQuoteFormValues, toQuoteInput, type QuoteFormValues } from '../validation/rfq.schema';

export interface RecordQuoteRequest {
  rfq: RfqDetail;
  invitation: RfqInvitation;
}

interface RecordQuoteDialogProps {
  request: RecordQuoteRequest | null;
  onClose: () => void;
}

export function RecordQuoteDialog({ request, onClose }: RecordQuoteDialogProps): React.ReactElement {
  const recordQuote = useRecordQuote();
  const { register, control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteSchema),
    defaultValues: { leadTimeDays: 7, validUntil: '', taxPercent: 18, notes: '', rates: [] },
  });
  const rates = useWatch({ control, name: 'rates' });
  const taxPercent = Number(useWatch({ control, name: 'taxPercent' })) || 0;

  useEffect(() => {
    if (request) reset(toQuoteFormValues(request.rfq, request.invitation));
  }, [request, reset]);

  const items = request?.rfq.items ?? [];
  const subtotal = items.reduce((sum, item, index) => sum + item.quantity * (Number(rates?.[index]?.rate) || 0), 0);

  async function onSubmit(values: QuoteFormValues): Promise<void> {
    if (!request) return;
    try {
      await recordQuote.mutateAsync({ id: request.rfq.id, invitationId: request.invitation.id, input: toQuoteInput(values) });
      toast.success(`Quote from ${request.invitation.vendor.name} recorded`);
      onClose();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't record the quote. Try again."));
    }
  }

  return (
    <Dialog open={!!request} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Quote</DialogTitle>
          <DialogDescription>{request?.invitation.vendor.name} · {request?.rfq.rfqNumber}. Enter the rates from the vendor&apos;s quotation.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="rounded-lg border divide-y">
            {items.map((item, index) => (
              <div key={item.id} className="flex items-center gap-3 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.description}</p>
                  <p className="text-xs text-muted-foreground">{item.quantity} {item.unit}</p>
                  {errors.rates?.[index]?.rate?.message && (
                    <p className="text-xs text-destructive" role="alert">{errors.rates[index]?.rate?.message}</p>
                  )}
                </div>
                <Input
                  aria-label={`Rate for ${item.description}`}
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="Rate ₹"
                  className="w-32"
                  {...register(`rates.${index}.rate`)}
                />
              </div>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Lead time (days)" htmlFor="quote-lead" error={errors.leadTimeDays?.message}>
              <Input id="quote-lead" type="number" min={0} max={365} {...register('leadTimeDays')} />
            </FormField>
            <FormField label="GST %" htmlFor="quote-tax" error={errors.taxPercent?.message}>
              <Input id="quote-tax" type="number" step="0.01" min={0} max={100} {...register('taxPercent')} />
            </FormField>
            <FormField label="Valid until" htmlFor="quote-valid" error={errors.validUntil?.message}>
              <Input id="quote-valid" type="date" {...register('validUntil')} />
            </FormField>
          </div>

          <FormField label="Notes (optional)" htmlFor="quote-notes" error={errors.notes?.message}>
            <Textarea id="quote-notes" rows={2} placeholder="Payment terms, exclusions, freight" {...register('notes')} />
          </FormField>

          <div className="flex justify-between rounded-lg bg-muted/40 p-3 text-sm font-semibold">
            <span>Quoted total (incl. GST)</span>
            <span>{formatCurrency(subtotal * (1 + taxPercent / 100))}</span>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Save Quote'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
