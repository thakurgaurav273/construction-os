'use client';

import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Button, Input, Label, Textarea,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@sitepilot/ui';
import {
  useCreateAdjustment, type AdjustmentReason,
} from '@/hooks/api/use-inventory';
import { formatNumber } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/api/errors';
import { ADJUSTMENT_REASON_LABELS } from './inventory-format';

const REASONS = Object.keys(ADJUSTMENT_REASON_LABELS) as AdjustmentReason[];

const schema = z.object({
  reason: z.enum(['CYCLE_COUNT', 'DAMAGE', 'LOSS', 'FOUND', 'CORRECTION', 'RETURN']),
  quantityAfter: z.coerce.number().min(0, 'Quantity cannot be negative'),
  note: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

interface AdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  materialId: string;
  warehouseId: string;
  materialName: string;
  currentQuantity: number;
  unit: string;
}

export function AdjustmentDialog({
  open,
  onOpenChange,
  materialId,
  warehouseId,
  materialName,
  currentQuantity,
  unit,
}: AdjustmentDialogProps): React.ReactElement {
  const createAdjustment = useCreateAdjustment();

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { reason: 'CYCLE_COUNT', quantityAfter: currentQuantity, note: '' },
  });

  React.useEffect(() => {
    if (open) {
      reset({ reason: 'CYCLE_COUNT', quantityAfter: currentQuantity, note: '' });
    }
  }, [open, currentQuantity, reset]);

  const quantityAfter = Number(watch('quantityAfter') ?? currentQuantity);
  const delta = Number.isFinite(quantityAfter) ? quantityAfter - currentQuantity : 0;

  async function onSubmit(values: FormValues): Promise<void> {
    if (values.quantityAfter === currentQuantity) {
      toast.error('The new quantity matches the current on-hand - nothing to adjust.');
      return;
    }
    try {
      await createAdjustment.mutateAsync({
        warehouseId,
        materialId,
        reason: values.reason,
        quantityAfter: values.quantityAfter,
        note: values.note?.trim() || undefined,
      });
      toast.success(`Stock adjusted for ${materialName}`);
      onOpenChange(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't record the adjustment. Try again."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Adjust Stock</DialogTitle>
          <DialogDescription>
            Correct the on-hand quantity of {materialName}. Current: {formatNumber(currentQuantity)} {unit}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="reason">Reason</Label>
            <Controller
              control={control}
              name="reason"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="reason">
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {REASONS.map((reason) => (
                      <SelectItem key={reason} value={reason}>
                        {ADJUSTMENT_REASON_LABELS[reason]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="quantityAfter">New on-hand quantity ({unit})</Label>
            <Input
              id="quantityAfter"
              type="number"
              step="any"
              min={0}
              {...register('quantityAfter')}
            />
            {errors.quantityAfter && (
              <p className="text-xs text-red-500">{errors.quantityAfter.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Change:{' '}
              <span className={delta === 0 ? '' : delta > 0 ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-red-600 dark:text-red-400 font-medium'}>
                {delta > 0 ? '+' : ''}{formatNumber(delta)} {unit}
              </span>
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea id="note" rows={2} placeholder="Add context for the audit trail..." {...register('note')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Record Adjustment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
