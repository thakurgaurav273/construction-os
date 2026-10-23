'use client';

import React, { useEffect, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button, Input, ScrollArea, Sheet, SheetContent, SheetTitle, Textarea } from '@sitepilot/ui';
import { FormField } from '@/components/shared/FormField';
import { useRaBillTransition } from '@/hooks/api/use-billing';
import { getApiErrorMessage } from '@/lib/api/errors';
import type { RaBillDetail } from '../types';
import { formatAmount, formatQuantity } from '../utils/format';
import { certifySchema, toCertifyFormValues, type CertifyFormValues } from '../validation/ra-bill.schema';

interface CertifyBillSheetProps {
  bill: RaBillDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Certifies each claimed line, as claimed or less. Whatever isn't certified is held back on this bill
 * and can be claimed again later. On a client contract this records the client's certificate.
 */
export function CertifyBillSheet({ bill, open, onOpenChange }: CertifyBillSheetProps): React.ReactElement {
  const transition = useRaBillTransition();
  const { register, control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CertifyFormValues>({
    resolver: zodResolver(certifySchema),
    defaultValues: toCertifyFormValues(bill),
  });
  const lines = useWatch({ control, name: 'lines' });
  const toClient = bill.contract.direction === 'CLIENT';

  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) reset(toCertifyFormValues(bill));
    wasOpen.current = open;
  }, [open, bill, reset]);

  const certifiedGross = (lines ?? []).reduce((sum, entry) => {
    const line = bill.lines.find((candidate) => candidate.contractItemId === entry.contractItemId);
    return sum + (Number(entry.certifiedQuantity) || 0) * (line?.rate ?? 0);
  }, 0);

  async function onSubmit(values: CertifyFormValues): Promise<void> {
    try {
      await transition.mutateAsync({
        id: bill.id,
        action: 'certify',
        lines: values.lines.map(({ contractItemId, certifiedQuantity, note }) => ({ contractItemId, certifiedQuantity, note: note || null })),
        note: values.note || undefined,
        invoiceNumber: toClient && values.invoiceNumber ? values.invoiceNumber : undefined,
      });
      toast.success(`${bill.code} certified`);
      onOpenChange(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't certify the bill. Try again."));
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col" noValidate>
          <div className="space-y-1 border-b p-6 pr-12">
            <SheetTitle>{toClient ? `Record client certification · ${bill.code}` : `Certify ${bill.code}`}</SheetTitle>
            <p className="text-sm text-muted-foreground">
              {toClient
                ? 'Enter the quantities the client certified. Anything less than claimed is held on this bill. The net becomes a receivable.'
                : 'Certify what was done to specification. Anything less than claimed is held back. The net goes to Finance as an approved bill to pay.'}
            </p>
          </div>
          <ScrollArea className="flex-1">
            <ul className="divide-y">
              {(lines ?? []).map((entry, index) => {
                const line = bill.lines.find((candidate) => candidate.contractItemId === entry.contractItemId);
                if (!line) return null;
                const held = Math.max(0, line.claimedQuantity - (Number(entry.certifiedQuantity) || 0));
                const lineErrors = errors.lines?.[index];
                return (
                  <li key={entry.contractItemId} className="space-y-2 px-6 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">Item {line.itemNo}</p>
                        <p className="line-clamp-2 text-xs text-muted-foreground">{line.description}</p>
                      </div>
                      <p className="shrink-0 text-right text-xs text-muted-foreground">
                        Claimed<br /><span className="text-sm font-medium text-foreground">{formatQuantity(line.claimedQuantity)} {line.unit}</span>
                      </p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-[160px_minmax(0,1fr)]">
                      <FormField label={`Certified (${line.unit})`} htmlFor={`certify-${index}`} error={lineErrors?.certifiedQuantity?.message}>
                        <Input id={`certify-${index}`} type="number" step="any" min={0} {...register(`lines.${index}.certifiedQuantity`)} />
                      </FormField>
                      <FormField label={held > 0 ? `Reason for holding ${formatQuantity(held)} ${line.unit}` : 'Note (optional)'} htmlFor={`certify-note-${index}`}>
                        <Input id={`certify-note-${index}`} placeholder={held > 0 ? 'e.g. Held due to deviation' : ''} {...register(`lines.${index}.note`)} />
                      </FormField>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="space-y-4 px-6 pb-6">
              {toClient && (
                <FormField label="Our tax invoice number (optional)" htmlFor="certify-invoice" hint="The GST invoice you raise on the client for this bill.">
                  <Input id="certify-invoice" placeholder="INV/2026-27/014" {...register('invoiceNumber')} />
                </FormField>
              )}
              <FormField label="Note on the bill (optional)" htmlFor="certify-note">
                <Textarea id="certify-note" rows={2} placeholder={toClient ? 'e.g. Certified by the client engineer on 12 Mar' : ''} {...register('note')} />
              </FormField>
            </div>
          </ScrollArea>
          <div className="flex items-center justify-between gap-3 border-t p-4">
            <div className="text-sm">
              <p className="text-muted-foreground">Certified gross</p>
              <p className="font-semibold">{formatAmount(Math.round(certifiedGross * 100) / 100)}</p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Certifying…' : 'Certify Bill'}</Button>
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
