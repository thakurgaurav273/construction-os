'use client';

import React from 'react';
import {
  Controller, useFieldArray, useWatch, type Control, type FieldErrors, type UseFormRegister, type UseFormSetValue,
} from 'react-hook-form';
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sitepilot/ui';
import { Package, Plus, Trash2 } from 'lucide-react';
import { useMaterials } from '@/hooks/api/use-materials';
import { formatCurrency } from '@/lib/utils';
import { MAX_LINE_ITEMS, PROCUREMENT_UNITS } from '../constants';
import { lineItemTotal, orderBreakdown } from '../utils/pricing';
import { NOT_STOCKED, emptyLineItem, type PurchaseOrderFormValues } from '../validation/purchase-order.schema';

interface LineItemsEditorProps {
  control: Control<PurchaseOrderFormValues>;
  register: UseFormRegister<PurchaseOrderFormValues>;
  errors: FieldErrors<PurchaseOrderFormValues>;
  setValue: UseFormSetValue<PurchaseOrderFormValues>;
}

/** Inputs hold strings until the schema coerces them, so previews read them defensively. */
function toPricedLine(item: Partial<PurchaseOrderFormValues['items'][number]> | undefined) {
  return {
    quantity: Number(item?.quantity) || 0,
    rate: Number(item?.rate) || 0,
    taxPercent: Number(item?.taxPercent) || 0,
    discountPercent: Number(item?.discountPercent) || 0,
  };
}

export function LineItemsEditor({ control, register, errors, setValue }: LineItemsEditorProps): React.ReactElement {
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const items = useWatch({ control, name: 'items' });
  const { data: materialPage } = useMaterials({ limit: 100, sort: 'name', order: 'asc' });
  const materials = materialPage?.items ?? [];

  /** Linking a line to the catalogue fills in its name and stock unit, so receipts post to the right item. */
  function linkMaterial(index: number, materialId: string): void {
    setValue(`items.${index}.materialId`, materialId);
    const material = materials.find((option) => option.id === materialId);
    if (!material) return;
    setValue(`items.${index}.description`, material.name, { shouldValidate: true });
    setValue(`items.${index}.unit`, material.unit, { shouldValidate: true });
    if (!Number(items?.[index]?.rate)) setValue(`items.${index}.rate`, material.unitCost);
  }
  const breakdown = orderBreakdown((items ?? []).map(toPricedLine));

  return (
    <fieldset className="space-y-3">
      <div className="flex items-center justify-between">
        <legend className="text-sm font-medium">Line items</legend>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append(emptyLineItem())}
          disabled={fields.length >= MAX_LINE_ITEMS}
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Add item
        </Button>
      </div>

      <datalist id="procurement-units">
        {PROCUREMENT_UNITS.map((unit) => <option key={unit} value={unit} />)}
      </datalist>

      <div className="space-y-3">
        {fields.map((field, index) => {
          const itemErrors = errors.items?.[index];
          const firstError = itemErrors?.description?.message ?? itemErrors?.quantity?.message ?? itemErrors?.unit?.message
            ?? itemErrors?.rate?.message ?? itemErrors?.taxPercent?.message ?? itemErrors?.discountPercent?.message;
          const isStocked = !!items?.[index]?.materialId && items[index].materialId !== NOT_STOCKED;
          return (
            <div key={field.id} className="rounded-lg border p-3 space-y-2">
              <Controller control={control} name={`items.${index}.materialId`} render={({ field: materialField }) => (
                <Select value={materialField.value} onValueChange={(value) => linkMaterial(index, value)}>
                  <SelectTrigger aria-label={`Item ${index + 1} stock material`} className="h-8 text-xs">
                    <Package className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NOT_STOCKED}>Not a stock item (service, hire, one-off)</SelectItem>
                    {materials.map((material) => (
                      <SelectItem key={material.id} value={material.id}>{material.name} · {material.unit}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
              <div className="flex items-start gap-2">
                <Input
                  aria-label={`Item ${index + 1} description`}
                  placeholder="e.g. TMT bars Fe500D 16mm"
                  className="flex-1"
                  {...register(`items.${index}.description`)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
                  aria-label={`Remove item ${index + 1}`}
                  onClick={() => remove(index)}
                  disabled={fields.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-center">
                <Input aria-label="Quantity" type="number" step="any" min={0} placeholder="Qty" {...register(`items.${index}.quantity`)} />
                <Input aria-label="Unit" list="procurement-units" placeholder="Unit" readOnly={isStocked} title={isStocked ? 'Stocked materials are ordered in their stock unit' : undefined} {...register(`items.${index}.unit`)} />
                <Input aria-label="Rate (₹)" type="number" step="0.01" min={0} placeholder="Rate ₹" className="sm:col-span-2" {...register(`items.${index}.rate`)} />
                <Input aria-label="GST %" type="number" step="0.01" min={0} max={100} placeholder="GST %" {...register(`items.${index}.taxPercent`)} />
                <Input aria-label="Discount %" type="number" step="0.01" min={0} max={100} placeholder="Disc %" {...register(`items.${index}.discountPercent`)} />
              </div>
              <div className="flex items-center justify-between text-xs">
                {firstError ? <p className="text-destructive" role="alert">{firstError}</p> : <span className="text-muted-foreground">GST % · Discount %</span>}
                <span className="font-semibold">{formatCurrency(lineItemTotal(toPricedLine(items?.[index])))}</span>
              </div>
            </div>
          );
        })}
      </div>

      {errors.items?.root?.message && <p className="text-xs text-destructive" role="alert">{errors.items.root.message}</p>}

      <div className="rounded-lg bg-muted/40 p-3 space-y-1 text-sm">
        <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatCurrency(breakdown.subtotal)}</span></div>
        <div className="flex justify-between text-muted-foreground"><span>Discount</span><span>-{formatCurrency(breakdown.discount)}</span></div>
        <div className="flex justify-between text-muted-foreground"><span>GST</span><span>+{formatCurrency(breakdown.tax)}</span></div>
        <div className="flex justify-between border-t pt-1.5 font-semibold"><span>Order total</span><span>{formatCurrency(breakdown.total)}</span></div>
      </div>
    </fieldset>
  );
}
