'use client';

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sitepilot/ui';
import { ArrowRight } from 'lucide-react';
import type { ImportField, ImportMapping } from '@/hooks/api/use-data-import';

interface ExtraColumnsPickerProps {
  /** Headings not used by any field. */
  available: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

/** Materials can keep unmapped columns (brand, grade, size…) as specifications instead of dropping them. */
export function ExtraColumnsPicker({ available, selected, onChange }: ExtraColumnsPickerProps): React.ReactElement | null {
  if (available.length === 0) return null;
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium">Keep other columns as specifications</legend>
      <p className="text-xs text-muted-foreground">Ticked columns are saved on each material and shown in its details.</p>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {available.map((heading) => (
          <label key={heading} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input accent-primary"
              checked={selected.includes(heading)}
              onChange={(event) => onChange(event.target.checked ? [...selected, heading] : selected.filter((item) => item !== heading))}
            />
            {heading}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

interface ValueTranslationsProps {
  fields: ImportField[];
  /** Field key → the heading it reads from. */
  columns: Record<string, string>;
  columnValues: Record<string, string[]>;
  translations: ImportMapping['values'];
  onChange: (translations: ImportMapping['values']) => void;
}

/** Mirrors the backend: options match ignoring case, with spaces and hyphens read as underscores. */
function matchesOption(value: string, options: string[]): boolean {
  return options.includes(value.trim().toUpperCase().replace(/[\s-]+/g, '_'));
}

const LEAVE_AS_IS = '__leave__';

/**
 * Translates the sheet's own wording for fixed options (e.g. "Urgent" → CRITICAL). AI fills these in when it
 * can; any value that still doesn't match an option is listed so the admin can pick one.
 */
export function ValueTranslations({ fields, columns, columnValues, translations, onChange }: ValueTranslationsProps): React.ReactElement | null {
  const groups = fields.flatMap((field) => {
    const options = field.options;
    const heading = columns[field.key];
    if (!options || !heading) return [];
    const known = translations[field.key] ?? {};
    const unmatched = (columnValues[heading] ?? []).filter((value) => !matchesOption(value, options));
    const values = [...new Set([...unmatched, ...Object.keys(known)])];
    return values.length > 0 ? [{ field, options, values, known }] : [];
  });
  if (groups.length === 0) return null;

  function choose(fieldKey: string, from: string, to: string): void {
    const pairs = Object.entries(translations[fieldKey] ?? {}).filter(([key]) => key !== from);
    if (to !== LEAVE_AS_IS) pairs.push([from, to]);
    const rest = Object.entries(translations).filter(([key]) => key !== fieldKey);
    onChange(Object.fromEntries(pairs.length > 0 ? [...rest, [fieldKey, Object.fromEntries(pairs)]] : rest));
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium">Translate your wording</p>
        <p className="text-xs text-muted-foreground">These values in your sheet aren’t SitePilot options. Pick what each one means; rows left as is are reported as problems.</p>
      </div>
      {groups.map(({ field, options, values, known }) => (
        <div key={field.key} className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">{field.label}</p>
          {values.map((value) => (
            <div key={value} className="flex items-center gap-3">
              <span className="w-40 truncate text-sm">{value}</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <Select value={known[value] ?? LEAVE_AS_IS} onValueChange={(to) => choose(field.key, value, to)}>
                <SelectTrigger className="w-44" aria-label={`${field.label} for ${value}`}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={LEAVE_AS_IS}>Leave as is</SelectItem>
                  {options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
