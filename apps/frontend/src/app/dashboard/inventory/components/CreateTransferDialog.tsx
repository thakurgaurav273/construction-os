'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Button, Input, Label, Textarea,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@sitepilot/ui';
import { Plus, Trash2, ArrowRight } from 'lucide-react';
import { FormField } from '@/components/shared/FormField';
import { useWarehouses, useInventoryItems, useCreateTransfer } from '@/hooks/api/use-inventory';
import { getApiErrorMessage } from '@/lib/api/errors';
import { formatNumber } from '@/lib/utils';
import {
  EMPTY_TRANSFER_LINE, toTransferInput, transferSchema, type TransferFormValues,
} from '@/features/inventory/validation/transfer.schema';

interface CreateTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Opens the new transfer once it's created. */
  onCreated?: (transferId: string) => void;
}

const EMPTY_VALUES: TransferFormValues = { fromWarehouseId: '', toWarehouseId: '', note: '', lines: [EMPTY_TRANSFER_LINE] };

export function CreateTransferDialog({ open, onOpenChange, onCreated }: CreateTransferDialogProps): React.ReactElement {
  const createTransfer = useCreateTransfer();
  const { data: warehouses = [] } = useWarehouses();
  const { register, control, handleSubmit, reset, setValue, setError, formState: { errors, isSubmitting } } = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: EMPTY_VALUES,
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });
  const fromWarehouseId = useWatch({ control, name: 'fromWarehouseId' });
  const lines = useWatch({ control, name: 'lines' });

  const { data: sourceStock } = useInventoryItems(
    { warehouseId: fromWarehouseId, limit: 100, sort: 'materialName', order: 'asc' },
    { enabled: !!fromWarehouseId },
  );
  const materialOptions = useMemo(
    () => (sourceStock?.items ?? []).filter((item) => item.available > 0),
    [sourceStock],
  );

  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) reset(EMPTY_VALUES);
    wasOpen.current = open;
  }, [open, reset]);

  async function onSubmit(values: TransferFormValues): Promise<void> {
    let overdrawn = false;
    values.lines.forEach((line, index) => {
      const stock = materialOptions.find((option) => option.materialId === line.materialId);
      if (stock && line.quantity > stock.available) {
        setError(`lines.${index}.quantity`, { message: `Only ${formatNumber(stock.available)} ${stock.unit} available` });
        overdrawn = true;
      }
    });
    if (overdrawn) return;

    try {
      const transfer = await createTransfer.mutateAsync(toTransferInput(values));
      toast.success(`${transfer.code} requested`, { description: 'It needs approval from someone else before stock moves.' });
      onOpenChange(false);
      onCreated?.(transfer.id);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't create the transfer. Try again."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Stock Transfer</DialogTitle>
          <DialogDescription>
            Request stock to move between stores. Someone else approves it, then the receiving store marks it received.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-start gap-3">
            <FormField label="From" error={errors.fromWarehouseId?.message}>
              <Controller control={control} name="fromWarehouseId" render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    setValue('lines', [EMPTY_TRANSFER_LINE]);
                  }}
                >
                  <SelectTrigger aria-label="From store"><SelectValue placeholder="Sending store" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
            </FormField>
            <ArrowRight className="h-4 w-4 text-muted-foreground mt-9 hidden sm:block" />
            <FormField label="To" error={errors.toWarehouseId?.message}>
              <Controller control={control} name="toWarehouseId" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-label="To store"><SelectValue placeholder="Receiving store" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.filter((warehouse) => warehouse.id !== fromWarehouseId).map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
            </FormField>
          </div>

          <div className="space-y-2">
            <Label>Materials</Label>
            {!fromWarehouseId ? (
              <p className="text-xs text-muted-foreground">Choose the sending store to see what it holds.</p>
            ) : materialOptions.length === 0 ? (
              <p className="text-xs text-muted-foreground">This store has no stock available to transfer.</p>
            ) : (
              <div className="space-y-2">
                {fields.map((field, index) => {
                  const stock = materialOptions.find((option) => option.materialId === lines?.[index]?.materialId);
                  const lineErrors = errors.lines?.[index];
                  return (
                    <div key={field.id} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <Controller control={control} name={`lines.${index}.materialId`} render={({ field: select }) => (
                            <Select value={select.value} onValueChange={select.onChange}>
                              <SelectTrigger aria-label={`Material ${index + 1}`}><SelectValue placeholder="Choose material" /></SelectTrigger>
                              <SelectContent>
                                {materialOptions.map((option) => (
                                  <SelectItem key={option.materialId} value={option.materialId}>
                                    {option.materialName} · {formatNumber(option.available)} {option.unit}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )} />
                        </div>
                        <Input
                          type="number"
                          min={0}
                          step="any"
                          placeholder="Qty"
                          aria-label={`Quantity ${index + 1}`}
                          className="w-24"
                          {...register(`lines.${index}.quantity`)}
                        />
                        <span className="text-xs text-muted-foreground w-10 shrink-0">{stock?.unit ?? ''}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0"
                          aria-label={`Remove material ${index + 1}`}
                          onClick={() => remove(index)}
                          disabled={fields.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {(lineErrors?.materialId || lineErrors?.quantity) && (
                        <p className="text-xs text-destructive" role="alert">
                          {lineErrors.materialId?.message ?? lineErrors.quantity?.message}
                        </p>
                      )}
                    </div>
                  );
                })}
                {errors.lines?.root?.message || errors.lines?.message ? (
                  <p className="text-xs text-destructive" role="alert">{errors.lines?.root?.message ?? errors.lines?.message}</p>
                ) : null}
                <Button type="button" variant="outline" size="sm" onClick={() => append(EMPTY_TRANSFER_LINE)}>
                  <Plus className="mr-1.5 h-4 w-4" /> Add material
                </Button>
              </div>
            )}
          </div>

          <FormField label="Note (optional)" htmlFor="transfer-note" error={errors.note?.message}>
            <Textarea id="transfer-note" rows={2} placeholder="e.g. Shortfall for slab casting next week" {...register('note')} />
          </FormField>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !fromWarehouseId}>
              {isSubmitting ? 'Requesting…' : 'Request Transfer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
