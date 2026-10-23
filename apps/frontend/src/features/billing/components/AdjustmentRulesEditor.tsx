'use client';

import React from 'react';
import { Controller, useFieldArray, useWatch, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form';
import {
  Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Input,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@sitepilot/ui';
import { Plus, Trash2 } from 'lucide-react';
import { ADJUSTMENT_PRESETS, MAX_ADJUSTMENTS } from '../constants';
import type { AdjustmentFormValues } from '../validation/contract.schema';

/** Any form that holds a list of taxes and deductions under `adjustments`. */
interface AdjustmentsForm {
  adjustments: AdjustmentFormValues[];
}

interface AdjustmentRulesEditorProps<T extends AdjustmentsForm> {
  control: Control<T>;
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
}

/** Taxes added to and deductions taken from each bill's gross amount, e.g. GST, TDS, security deposit. */
export function AdjustmentRulesEditor<T extends AdjustmentsForm>(props: AdjustmentRulesEditorProps<T>): React.ReactElement {
  // The generic form narrows to the shared `adjustments` shape this editor works on.
  const control = props.control as unknown as Control<AdjustmentsForm>;
  const register = props.register as unknown as UseFormRegister<AdjustmentsForm>;
  const errors = props.errors as FieldErrors<AdjustmentsForm>;
  const { fields, append, remove } = useFieldArray({ control, name: 'adjustments' });
  const rules = useWatch({ control, name: 'adjustments' });

  return (
    <fieldset className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <legend className="text-sm font-medium">Taxes & deductions</legend>
          <p className="text-xs text-muted-foreground">Applied to every bill&apos;s gross amount. Each bill can still be adjusted.</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm" disabled={fields.length >= MAX_ADJUSTMENTS}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add line
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {ADJUSTMENT_PRESETS.map((preset) => (
              <DropdownMenuItem key={preset.label} onSelect={() => append(preset)}>{preset.label}</DropdownMenuItem>
            ))}
            <DropdownMenuItem onSelect={() => append({ label: '', effect: 'DEDUCT', calculation: 'PERCENT', value: 0, isRetention: false })}>Custom line…</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {fields.length === 0 ? (
        <p className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
          No taxes or deductions. Bills will pay the gross amount.
        </p>
      ) : (
        <ul className="space-y-2">
          {fields.map((field, index) => {
            const rowErrors = errors.adjustments?.[index];
            const message = rowErrors?.label?.message ?? rowErrors?.value?.message;
            return (
              <li key={field.id} className="space-y-1">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:grid-cols-[minmax(0,1fr)_110px_120px_100px_auto]">
                  <Input aria-label={`Line ${index + 1} name`} placeholder="e.g. Security deposit" className="col-span-2 sm:col-span-1" {...register(`adjustments.${index}.label`)} />
                  <Controller control={control} name={`adjustments.${index}.effect`} render={({ field: effect }) => (
                    <Select value={effect.value} onValueChange={(value) => { if (value) effect.onChange(value); }}>
                      <SelectTrigger aria-label={`Line ${index + 1} adds or deducts`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADD">Add</SelectItem>
                        <SelectItem value="DEDUCT">Deduct</SelectItem>
                      </SelectContent>
                    </Select>
                  )} />
                  <Controller control={control} name={`adjustments.${index}.calculation`} render={({ field: calculation }) => (
                    <Select value={calculation.value} onValueChange={(value) => { if (value) calculation.onChange(value); }}>
                      <SelectTrigger aria-label={`Line ${index + 1} calculation`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PERCENT">% of gross</SelectItem>
                        <SelectItem value="FIXED">Fixed ₹</SelectItem>
                      </SelectContent>
                    </Select>
                  )} />
                  <Input aria-label={`Line ${index + 1} value`} type="number" step="0.01" min={0} {...register(`adjustments.${index}.value`)} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`Remove line ${index + 1}`}
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {rules?.[index]?.effect === 'DEDUCT' && (
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input type="checkbox" className="h-4 w-4 rounded border-input" {...register(`adjustments.${index}.isRetention`)} />
                    Held back and released later (security deposit, retention)
                  </label>
                )}
                {message && <p className="text-xs text-destructive" role="alert">{message}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </fieldset>
  );
}
