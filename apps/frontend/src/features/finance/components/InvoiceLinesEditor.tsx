'use client';

import React from 'react';
import { useFieldArray, useWatch, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form';
import { Button, Input } from '@sitepilot/ui';
import { AlertTriangle, Link2, Plus, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { PROCUREMENT_UNITS } from '@/features/procurement/constants';
import { MAX_INVOICE_LINES } from '../constants';
import type { BillableLine } from '../types';
import { emptyInvoiceLine, type InvoiceFormValues } from '../validation/invoice.schema';

/** Mirrors RATE_TOLERANCE_PERCENT on the backend so the warning appears before submission. */
const RATE_TOLERANCE = 1.01;

interface InvoiceLinesEditorProps {
  control: Control<InvoiceFormValues>;
  register: UseFormRegister<InvoiceFormValues>;
  errors: FieldErrors<InvoiceFormValues>;
  /** PO lines keyed by id, when the bill is against a purchase order. */
  billable: Map<string, BillableLine>;
}

const toNumber = (value: unknown): number => Number(value) || 0;

export function InvoiceLinesEditor({ control, register, errors, billable }: InvoiceLinesEditorProps): React.ReactElement {
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const items = useWatch({ control, name: 'items' }) ?? [];

  const subtotal = items.reduce((sum, item) => sum + toNumber(item?.quantity) * toNumber(item?.rate), 0);
  const tax = items.reduce((sum, item) => sum + toNumber(item?.quantity) * toNumber(item?.rate) * (toNumber(item?.taxPercent) / 100), 0);

  return (
    <fieldset className="space-y-3">
      <div className="flex items-center justify-between">
        <legend className="text-sm font-medium">Invoice lines</legend>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append(emptyInvoiceLine())}
          disabled={fields.length >= MAX_INVOICE_LINES}
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Add line
        </Button>
      </div>

      <datalist id="invoice-units">
        {PROCUREMENT_UNITS.map((unit) => <option key={unit} value={unit} />)}
      </datalist>

      {fields.map((field, index) => {
        const item = items[index];
        const poLine = item?.poLineItemId ? billable.get(item.poLineItemId) : undefined;
        const lineErrors = errors.items?.[index];
        const error = lineErrors?.description?.message ?? lineErrors?.quantity?.message ?? lineErrors?.rate?.message
          ?? lineErrors?.taxPercent?.message ?? lineErrors?.unit?.message;
        const warnings = poLine ? [
          toNumber(item?.quantity) > poLine.billableQuantity && `only ${poLine.billableQuantity} ${poLine.unit} received and unbilled`,
          toNumber(item?.rate) > poLine.rate * RATE_TOLERANCE && `rate above PO ${formatCurrency(poLine.rate)}`,
          toNumber(item?.taxPercent) !== poLine.taxPercent && `PO GST is ${poLine.taxPercent}%`,
        ].filter(Boolean) : [];

        return (
          <div key={field.id} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-start gap-2">
              <Input
                aria-label={`Line ${index + 1} description`}
                placeholder="Item or service"
                className="flex-1"
                readOnly={!!poLine}
                {...register(`items.${index}.description`)}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
                aria-label={`Remove line ${index + 1}`}
                onClick={() => remove(index)}
                disabled={fields.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <Input aria-label="Quantity" type="number" step="any" min={0} placeholder="Qty" {...register(`items.${index}.quantity`)} />
              <Input aria-label="Unit" list="invoice-units" placeholder="Unit" readOnly={!!poLine} {...register(`items.${index}.unit`)} />
              <Input aria-label="Rate (₹)" type="number" step="0.01" min={0} placeholder="Rate ₹" className="sm:col-span-2" {...register(`items.${index}.rate`)} />
              <Input aria-label="GST %" type="number" step="0.01" min={0} max={100} placeholder="GST %" {...register(`items.${index}.taxPercent`)} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              {error ? (
                <p className="text-destructive" role="alert">{error}</p>
              ) : poLine ? (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Link2 className="h-3 w-3" />
                  PO line · {poLine.receivedQuantity} received, {poLine.billedQuantity} billed · {formatCurrency(poLine.rate)}/{poLine.unit}
                </span>
              ) : (
                <span className="text-muted-foreground">{billable.size ? 'Not on the PO' : 'Qty · Unit · Rate · GST %'}</span>
              )}
              <span className="font-semibold">
                {formatCurrency(toNumber(item?.quantity) * toNumber(item?.rate) * (1 + toNumber(item?.taxPercent) / 100))}
              </span>
            </div>
            {warnings.length > 0 && (
              <p className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-3 w-3 shrink-0" /> Variance: {warnings.join(' · ')}. Approval will need a note.
              </p>
            )}
          </div>
        );
      })}
      {errors.items?.root?.message && <p className="text-xs text-destructive" role="alert">{errors.items.root.message}</p>}

      <div className="rounded-lg bg-muted/40 p-3 space-y-1 text-sm">
        <div className="flex justify-between text-muted-foreground"><span>Taxable value</span><span>{formatCurrency(subtotal)}</span></div>
        <div className="flex justify-between text-muted-foreground"><span>GST</span><span>+{formatCurrency(tax)}</span></div>
        <div className="flex justify-between border-t pt-1.5 font-semibold"><span>Invoice total</span><span>{formatCurrency(subtotal + tax)}</span></div>
      </div>
    </fieldset>
  );
}
