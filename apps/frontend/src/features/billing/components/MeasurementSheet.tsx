'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button, ScrollArea, Sheet, SheetContent, SheetTitle } from '@sitepilot/ui';
import { Plus } from 'lucide-react';
import { useSaveMeasurements } from '@/hooks/api/use-billing';
import { getApiErrorMessage } from '@/lib/api/errors';
import type { RaBillLine } from '../types';
import { formatQuantity } from '../utils/format';
import { previewMeasurement } from '../utils/measurement';
import {
  emptyMeasurement, measurementsSchema, toMeasurementInputs, toMeasurementsFormValues, type MeasurementsFormValues,
} from '../validation/ra-bill.schema';
import { MeasurementRow } from './MeasurementRow';

interface MeasurementSheetProps {
  billId: string;
  line: RaBillLine | null;
  readOnly: boolean;
  onClose: () => void;
}

const toNumber = (value: unknown): number | null => (value === '' || value === null || value === undefined ? null : Number(value));

/** The measurement book for one BOQ line on this bill. Its total becomes the claimed quantity. */
export function MeasurementSheet({ billId, line, readOnly, onClose }: MeasurementSheetProps): React.ReactElement {
  const saveMeasurements = useSaveMeasurements();
  const { register, control, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm<MeasurementsFormValues>({
    resolver: zodResolver(measurementsSchema),
    defaultValues: { rows: [] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'rows' });
  const rows = useWatch({ control, name: 'rows' });

  // Load the rows when the sheet opens on an item; background refetches must not wipe edits.
  const loadedItem = useRef<string | null>(null);
  useEffect(() => {
    if (line && loadedItem.current !== line.contractItemId) reset(toMeasurementsFormValues(line));
    loadedItem.current = line?.contractItemId ?? null;
  }, [line, reset]);

  // Keep showing the last item while the sheet slides closed, instead of an empty panel.
  const [shownLine, setShownLine] = useState(line);
  useEffect(() => {
    if (line) setShownLine(line);
  }, [line]);

  const total = (rows ?? []).reduce((sum, row) => sum + previewMeasurement({
    type: row.type,
    nos: toNumber(row.nos),
    length: toNumber(row.length),
    breadth: toNumber(row.breadth),
    height: toNumber(row.height),
    unitWeight: toNumber(row.unitWeight),
    quantity: toNumber(row.quantity),
    isDeduction: row.isDeduction,
  }), 0);

  async function onSubmit(values: MeasurementsFormValues): Promise<void> {
    if (!line) return;
    try {
      await saveMeasurements.mutateAsync({ id: billId, itemId: line.contractItemId, rows: toMeasurementInputs(values) });
      toast.success(`Item ${line.itemNo} measurements saved`);
      onClose();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't save the measurements. Try again."));
    }
  }

  const lastType = rows?.[rows.length - 1]?.type;

  return (
    <Sheet open={!!line} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
        {shownLine && (
          <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col" noValidate>
            <div className="space-y-1 border-b p-6 pr-12">
              <SheetTitle>Item {shownLine.itemNo} · Measurements</SheetTitle>
              <p className="line-clamp-2 text-sm text-muted-foreground">{shownLine.description}</p>
              <p className="text-xs text-muted-foreground">
                BOQ {formatQuantity(shownLine.boqQuantity)} {shownLine.unit} · Previous bills {formatQuantity(shownLine.previousQuantity)} {shownLine.unit}
              </p>
            </div>
            <ScrollArea className="flex-1">
              <div className="space-y-3 p-6">
                {fields.length === 0 && (
                  <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                    No measurements on this bill for this item.{readOnly ? '' : ' Add a row for each part measured on site.'}
                  </p>
                )}
                <ul className="space-y-3">
                  {fields.map((field, index) => (
                    <MeasurementRow
                      key={field.id}
                      index={index}
                      row={rows?.[index]}
                      unit={shownLine.unit}
                      control={control}
                      register={register}
                      errors={errors}
                      readOnly={readOnly}
                      onRemove={() => remove(index)}
                    />
                  ))}
                </ul>
                {!readOnly && (
                  <Button type="button" variant="outline" size="sm" onClick={() => append(emptyMeasurement(lastType))}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add row
                  </Button>
                )}
              </div>
            </ScrollArea>
            <div className="flex items-center justify-between gap-3 border-t p-4">
              <div className="text-sm">
                <p className="text-muted-foreground">Claimed this bill</p>
                <p className="font-semibold">{formatQuantity(Math.round(total * 1000) / 1000)} {shownLine.unit}</p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose}>{readOnly ? 'Close' : 'Cancel'}</Button>
                {!readOnly && <Button type="submit" disabled={isSubmitting || !isDirty}>{isSubmitting ? 'Saving…' : 'Save Measurements'}</Button>}
              </div>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
