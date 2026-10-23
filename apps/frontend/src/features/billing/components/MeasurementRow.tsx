'use client';

import React from 'react';
import { Controller, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form';
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, cn } from '@sitepilot/ui';
import { Trash2 } from 'lucide-react';
import { MEASUREMENT_TYPES } from '../constants';
import { formatQuantity } from '../utils/format';
import { previewMeasurement } from '../utils/measurement';
import type { MeasurementRowValues, MeasurementsFormValues } from '../validation/ra-bill.schema';

interface MeasurementRowProps {
  index: number;
  row: MeasurementRowValues | undefined;
  unit: string;
  control: Control<MeasurementsFormValues>;
  register: UseFormRegister<MeasurementsFormValues>;
  errors: FieldErrors<MeasurementsFormValues>;
  readOnly: boolean;
  onRemove: () => void;
}

type NumberField = 'nos' | 'length' | 'breadth' | 'height' | 'unitWeight' | 'quantity';

const INPUTS: Record<MeasurementRowValues['type'], { field: NumberField; label: string }[]> = {
  DIMENSIONS: [{ field: 'nos', label: 'Nos' }, { field: 'length', label: 'L (m)' }, { field: 'breadth', label: 'B (m)' }, { field: 'height', label: 'H (m)' }],
  STEEL: [{ field: 'nos', label: 'Nos' }, { field: 'length', label: 'Cut length (m)' }, { field: 'unitWeight', label: 'kg/m' }],
  DIRECT: [{ field: 'quantity', label: 'Quantity' }],
};

/** Inputs hold strings until the schema coerces them, so the preview reads them defensively. */
const numberOrNull = (value: unknown): number | null => (value === '' || value === null || value === undefined ? null : Number(value));

export function MeasurementRow({ index, row, unit, control, register, errors, readOnly, onRemove }: MeasurementRowProps): React.ReactElement {
  const type = row?.type ?? 'DIMENSIONS';
  const rowErrors = errors.rows?.[index];
  const message = rowErrors?.description?.message ?? INPUTS[type].map(({ field }) => rowErrors?.[field]?.message).find(Boolean);
  const quantity = row
    ? previewMeasurement({
      type,
      nos: numberOrNull(row.nos),
      length: numberOrNull(row.length),
      breadth: numberOrNull(row.breadth),
      height: numberOrNull(row.height),
      unitWeight: numberOrNull(row.unitWeight),
      quantity: numberOrNull(row.quantity),
      isDeduction: row.isDeduction,
    })
    : 0;

  return (
    <li className={cn('space-y-2 rounded-lg border p-3', row?.isDeduction && 'border-destructive/30 bg-destructive/5')}>
      <fieldset disabled={readOnly} className="space-y-2">
        <div className="flex gap-2">
          <Input aria-label={`Row ${index + 1} description`} placeholder="e.g. Wall-1, chainage 0–30" className="flex-1" {...register(`rows.${index}.description`)} />
          <Controller control={control} name={`rows.${index}.type`} render={({ field }) => (
            <Select value={field.value} onValueChange={(value) => { if (value) field.onChange(value); }} disabled={readOnly}>
              <SelectTrigger className="w-40" aria-label={`Row ${index + 1} measured as`}><SelectValue /></SelectTrigger>
              <SelectContent>
                {MEASUREMENT_TYPES.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {INPUTS[type].map(({ field, label }) => (
            <Input
              key={field}
              aria-label={`Row ${index + 1} ${label}`}
              placeholder={label}
              type="number"
              step="any"
              min={0}
              {...register(`rows.${index}.${field}`)}
            />
          ))}
        </div>
      </fieldset>
      <div className="flex items-center justify-between gap-3 text-xs">
        <label className="flex items-center gap-2 text-muted-foreground">
          <input type="checkbox" className="h-4 w-4 rounded border-input" disabled={readOnly} {...register(`rows.${index}.isDeduction`)} />
          Deduction (opening, overlap)
        </label>
        <div className="flex items-center gap-2">
          <span className={cn('font-semibold', quantity < 0 && 'text-destructive')}>{formatQuantity(quantity)} {unit}</span>
          {!readOnly && (
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" aria-label={`Remove row ${index + 1}`} onClick={onRemove}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      {message && <p className="text-xs text-destructive" role="alert">{message}</p>}
    </li>
  );
}
