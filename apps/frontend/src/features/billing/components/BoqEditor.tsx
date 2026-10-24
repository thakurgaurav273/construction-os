'use client';

import React, { useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Textarea,
} from '@sitepilot/ui';
import { ClipboardPaste, Plus, Trash2 } from 'lucide-react';
import { useSaveContractItems } from '@/hooks/api/use-billing';
import { getApiErrorMessage } from '@/lib/api/errors';
import { formatCurrency } from '@/lib/utils';
import { BOQ_UNITS, MAX_BOQ_ITEMS } from '../constants';
import type { ContractDetail } from '../types';
import { parsePastedBoq } from '../utils/paste-boq';
import { boqSchema, emptyBoqItem, toBoqFormValues, toContractItemInputs, type BoqFormValues } from '../validation/boq.schema';

interface BoqEditorProps {
  contract: ContractDetail;
  onDone: () => void;
}

/** Edits the whole BOQ and saves it in one go. Lines already billed can be changed but not removed. */
export function BoqEditor({ contract, onDone }: BoqEditorProps): React.ReactElement {
  const saveItems = useSaveContractItems();
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasted, setPasted] = useState('');
  const { register, control, handleSubmit, formState: { errors, isSubmitting, isDirty } } = useForm<BoqFormValues>({
    resolver: zodResolver(boqSchema),
    defaultValues: toBoqFormValues(contract.items),
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const items = useWatch({ control, name: 'items' });
  const inUse = new Set(contract.items.filter((item) => item.inUse).map((item) => item.id));
  const total = (items ?? []).reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.rate) || 0), 0);

  function addPasted(): void {
    const rows = parsePastedBoq(pasted);
    if (rows.length === 0) {
      toast.error('No BOQ rows found. Copy the columns Item no, Code, Description, Unit, Quantity, Rate.');
      return;
    }
    append(rows.slice(0, MAX_BOQ_ITEMS - fields.length));
    toast.success(`Added ${rows.length} ${rows.length === 1 ? 'line' : 'lines'}. Check them, then save.`);
    setPasted('');
    setPasteOpen(false);
  }

  async function onSubmit(values: BoqFormValues): Promise<void> {
    try {
      await saveItems.mutateAsync({ id: contract.id, items: toContractItemInputs(values) });
      toast.success('BOQ saved');
      onDone();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't save the BOQ. Try again."));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <datalist id="boq-units">{BOQ_UNITS.map((unit) => <option key={unit} value={unit} />)}</datalist>

      {fields.length === 0 && (
        <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
          No BOQ lines yet. Add them one by one, or paste rows from your spreadsheet.
        </p>
      )}

      <ul className="space-y-3">
        {fields.map((field, index) => {
          const rowErrors = errors.items?.[index];
          const message = rowErrors?.itemNo?.message ?? rowErrors?.description?.message ?? rowErrors?.unit?.message
            ?? rowErrors?.quantity?.message ?? rowErrors?.rate?.message;
          const locked = !!field.id && inUse.has(items?.[index]?.id ?? '');
          const amount = (Number(items?.[index]?.quantity) || 0) * (Number(items?.[index]?.rate) || 0);
          return (
            <li key={field.id} className="space-y-2 rounded-lg border p-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-[90px_110px_minmax(0,1fr)_auto]">
                <Input aria-label={`Line ${index + 1} item no.`} placeholder="Item no." {...register(`items.${index}.itemNo`)} />
                <Input aria-label={`Line ${index + 1} rate code`} placeholder="DSR code" {...register(`items.${index}.rateCode`)} />
                <Textarea
                  aria-label={`Line ${index + 1} description`}
                  placeholder="Description of item"
                  rows={1}
                  className="col-span-2 min-h-9 sm:col-span-1"
                  {...register(`items.${index}.description`)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="hidden text-muted-foreground hover:text-destructive sm:inline-flex"
                  aria-label={`Remove line ${index + 1}`}
                  title={locked ? 'Already on an RA bill' : undefined}
                  disabled={locked}
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-[90px_130px_130px_minmax(0,1fr)]">
                <Input aria-label={`Line ${index + 1} unit`} list="boq-units" placeholder="Unit" {...register(`items.${index}.unit`)} />
                <Input aria-label={`Line ${index + 1} BOQ quantity`} type="number" step="any" min={0} placeholder="BOQ qty" {...register(`items.${index}.quantity`)} />
                <Input aria-label={`Line ${index + 1} rate`} type="number" step="0.01" min={0} placeholder="Rate ₹" {...register(`items.${index}.rate`)} />
                <div className="col-span-3 flex items-center justify-between gap-3 text-xs sm:col-span-1">
                  <label className="flex items-center gap-2 text-muted-foreground">
                    <input type="checkbox" className="h-4 w-4 rounded border-input" {...register(`items.${index}.isExtra`)} />
                    Extra item
                  </label>
                  <span className="font-medium">{formatCurrency(amount)}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive sm:hidden"
                    disabled={locked}
                    onClick={() => remove(index)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
              {message && <p className="text-xs text-destructive" role="alert">{message}</p>}
              {locked && <p className="text-xs text-muted-foreground">On an RA bill: can be edited, not removed.</p>}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={fields.length >= MAX_BOQ_ITEMS} onClick={() => append(emptyBoqItem(fields.length + 1))}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add line
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setPasteOpen(true)}>
            <ClipboardPaste className="mr-1 h-3.5 w-3.5" /> Paste rows
          </Button>
        </div>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <span className="text-sm text-muted-foreground">Contract value <span className="font-semibold text-foreground">{formatCurrency(total)}</span></span>
          <Button type="button" variant="outline" onClick={onDone} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting || !isDirty}>{isSubmitting ? 'Saving…' : 'Save BOQ'}</Button>
        </div>
      </div>

      <Dialog open={pasteOpen} onOpenChange={setPasteOpen}>
        <DialogContent className="sm:max-w-[620px]">
          <DialogHeader>
            <DialogTitle>Paste BOQ rows</DialogTitle>
            <DialogDescription>
              Copy the rows from Excel or Numbers with the columns in this order: Item no, Code, Description, Unit, Quantity, Rate.
            </DialogDescription>
          </DialogHeader>
          <Textarea aria-label="Pasted rows" rows={8} value={pasted} onChange={(event) => setPasted(event.target.value)} placeholder={'50.1\t2.32\tClearing grass and rubbish\tSqm\t6000\t12.50'} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPasteOpen(false)}>Cancel</Button>
            <Button type="button" onClick={addPasted} disabled={!pasted.trim()}>Add Rows</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
