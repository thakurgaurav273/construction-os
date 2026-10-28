'use client';

import React from 'react';
import { Controller, type Control, type UseFormRegister } from 'react-hook-form';
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sitepilot/ui';
import type { ImportField } from '@/hooks/api/use-data-import';
import type { TemplateFormValues } from '../validation/import-template.schema';

/** Radix Select can't hold an empty value, so this stands in for "the sheet has no such column". */
const NOT_IN_SHEET = '__not_in_sheet__';

interface MappingFieldRowProps {
  field: ImportField;
  headers: string[];
  control: Control<TemplateFormValues>;
  register: UseFormRegister<TemplateFormValues>;
  selectedColumn: string;
  /** First non-blank value of the chosen column, so the admin can confirm the match at a glance. */
  sample: string | null;
  error?: string;
}

export function MappingFieldRow({
  field, headers, control, register, selectedColumn, sample, error,
}: MappingFieldRowProps): React.ReactElement {
  const selectId = `column-${field.key}`;
  return (
    <div className="grid grid-cols-1 gap-2 border-b py-4 last:border-b-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:gap-6">
      <div>
        <label htmlFor={selectId} className="text-sm font-medium">
          {field.label}
          {field.required && <span className="ml-0.5 text-destructive" aria-hidden>*</span>}
        </label>
        <p className="text-xs text-muted-foreground">{field.description}</p>
      </div>
      <div className="space-y-2">
        <Controller
          control={control}
          name={`columns.${field.key}`}
          render={({ field: input }) => (
            <Select value={input.value || NOT_IN_SHEET} onValueChange={(value) => input.onChange(value === NOT_IN_SHEET ? '' : value)}>
              <SelectTrigger id={selectId} aria-invalid={Boolean(error)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NOT_IN_SHEET}>Not in this sheet</SelectItem>
                {headers.map((heading) => <SelectItem key={heading} value={heading}>{heading}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        />
        {selectedColumn ? (
          <p className="truncate text-xs text-muted-foreground">
            {sample ? <>e.g. <span className="text-foreground">{sample}</span></> : 'This column is empty in the first rows.'}
          </p>
        ) : (
          <Input
            {...register(`defaults.${field.key}`)}
            aria-label={`${field.label} for every row`}
            placeholder={field.options ? `Same for every row, e.g. ${field.options[0]}` : 'Same value for every row (optional)'}
          />
        )}
        {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
      </div>
    </div>
  );
}
