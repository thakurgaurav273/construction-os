'use client';

import React, { useEffect, useRef } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Button, Input, Label, Textarea,
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@sitepilot/ui';
import { FormField } from '@/components/shared/FormField';
import { useInventoryItems, useWarehouses } from '@/hooks/api/use-inventory';
import { useIssueAgainstRequest, type MaterialRequestDetail } from '@/hooks/api/use-material-requests';
import { getApiErrorMessage } from '@/lib/api/errors';
import { formatNumber } from '@/lib/utils';
import { issueRequestSchema, toIssueRequestInput, type IssueRequestFormValues } from '../validation/material-request.schema';

interface IssueRequestDialogProps {
  request: MaterialRequestDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function emptyValues(request: MaterialRequestDetail, warehouseId: string): IssueRequestFormValues {
  return {
    warehouseId,
    issuedOn: format(new Date(), 'yyyy-MM-dd'),
    note: '',
    lines: request.items
      .filter((item) => item.remaining > 0)
      .map((item) => ({ itemId: item.id, remaining: item.remaining, quantity: 0 })),
  };
}

/**
 * Issues what's still owed on a request from one store. Quantities start at whatever the chosen store can
 * cover; anything left can be issued later from another store.
 */
export function IssueRequestDialog({ request, open, onOpenChange }: IssueRequestDialogProps): React.ReactElement {
  const issue = useIssueAgainstRequest();
  const { data: warehouses = [] } = useWarehouses();
  const siteStoreId = warehouses.find((store) => store.projectId === request.projectId)?.id ?? '';

  const { register, control, handleSubmit, reset, setValue, getValues, formState: { errors, isSubmitting } } = useForm<IssueRequestFormValues>({
    resolver: zodResolver(issueRequestSchema),
    defaultValues: emptyValues(request, siteStoreId),
  });
  const warehouseId = useWatch({ control, name: 'warehouseId' });
  const formLines = useWatch({ control, name: 'lines' });
  const { data: storeStock, isFetching: isLoadingStock } = useInventoryItems(
    { warehouseId, limit: 100 },
    { enabled: open && !!warehouseId },
  );
  const availableAt = (materialId: string): number =>
    storeStock?.items.find((item) => item.materialId === materialId)?.available ?? 0;

  const wasOpen = useRef(false);
  const prefilledFor = useRef<string | null>(null);
  useEffect(() => {
    if (open && !wasOpen.current) {
      reset(emptyValues(request, siteStoreId));
      prefilledFor.current = null;
    }
    wasOpen.current = open;
  }, [open, request, siteStoreId, reset]);

  // Start each line at what a newly chosen store can cover, so a full issue is one click. Later refetches
  // of the same store leave typed quantities alone.
  useEffect(() => {
    if (!storeStock || prefilledFor.current === warehouseId) return;
    prefilledFor.current = warehouseId;
    getValues('lines').forEach((line, index) => {
      const item = request.items.find((candidate) => candidate.id === line.itemId);
      const available = item ? storeStock.items.find((stock) => stock.materialId === item.materialId)?.available ?? 0 : 0;
      setValue(`lines.${index}.quantity`, Math.min(line.remaining, Math.max(0, available)));
    });
  }, [storeStock, warehouseId, request.items, getValues, setValue]);

  async function onSubmit(values: IssueRequestFormValues): Promise<void> {
    try {
      const updated = await issue.mutateAsync({ id: request.id, input: toIssueRequestInput(values) });
      toast.success(updated.status === 'ISSUED' ? `${request.code} issued in full` : `${request.code} partly issued`, {
        description: updated.status === 'ISSUED' ? undefined : 'Issue the rest later, from this or another store.',
      });
      onOpenChange(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't issue the material. Try again."));
    }
  }

  // Rows follow the form's lines, not the live request, so a refetch after issuing can't shift them.
  const rows = (formLines ?? []).flatMap((line) => request.items.filter((item) => item.id === line.itemId));
  const linesError = errors.lines?.root?.message ?? errors.lines?.message;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Issue {request.code}</DialogTitle>
          <DialogDescription>
            Send material to {request.project.name}. Each material gets its own issue note and is charged to the project.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormField label="Issue from store" error={errors.warehouseId?.message}>
            <Controller control={control} name="warehouseId" render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger aria-label="Issue from store"><SelectValue placeholder="Choose a store" /></SelectTrigger>
                <SelectContent>
                  {warehouses.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}{store.projectId === request.projectId ? ' · this site' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )} />
          </FormField>

          <div className="space-y-2">
            <Label>Quantities to issue</Label>
            {rows.map((item, index) => {
              const available = availableAt(item.materialId);
              const quantityError = errors.lines?.[index]?.quantity?.message;
              return (
                <div key={item.id} className="rounded-lg border p-3 space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatNumber(formLines[index]?.remaining ?? item.remaining)} {item.unit} still owed
                        {warehouseId && !isLoadingStock && ` · ${formatNumber(available)} available here`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        aria-label={`Quantity of ${item.name}`}
                        className="w-24"
                        {...register(`lines.${index}.quantity`)}
                      />
                      <span className="text-xs text-muted-foreground w-10">{item.unit}</span>
                    </div>
                  </div>
                  {quantityError && <p className="text-xs text-destructive" role="alert">{quantityError}</p>}
                </div>
              );
            })}
            {linesError && <p className="text-xs text-destructive" role="alert">{linesError}</p>}
          </div>

          <FormField label="Date" htmlFor="issue-request-date" error={errors.issuedOn?.message}>
            <Input id="issue-request-date" type="date" max={format(new Date(), 'yyyy-MM-dd')} {...register('issuedOn')} />
          </FormField>

          <FormField label="Note (optional)" htmlFor="issue-request-note" error={errors.note?.message}>
            <Textarea id="issue-request-note" rows={2} placeholder="e.g. Sent with vehicle MH12 AB 1234" {...register('note')} />
          </FormField>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !warehouseId}>
              {isSubmitting ? 'Issuing…' : 'Issue Material'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
