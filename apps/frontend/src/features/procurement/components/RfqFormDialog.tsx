'use client';

import React, { useEffect, useRef } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label, Textarea,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@sitepilot/ui';
import { Plus, Trash2 } from 'lucide-react';
import { FormField } from '@/components/shared/FormField';
import { useProjects } from '@/hooks/api/use-projects';
import { useCreateRfq, useVendors } from '@/hooks/api/use-procurement';
import { getApiErrorMessage } from '@/lib/api/errors';
import { MAX_LINE_ITEMS, PRIORITY_OPTIONS, PROCUREMENT_CATEGORIES, PROCUREMENT_UNITS } from '../constants';
import { emptyRfqFormValues, rfqSchema, toRfqInput, type RfqFormValues } from '../validation/rfq.schema';
import { VendorChecklist } from './VendorChecklist';

interface RfqFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (rfqId: string) => void;
}

export function RfqFormDialog({ open, onOpenChange, onCreated }: RfqFormDialogProps): React.ReactElement {
  const { data: projects = [] } = useProjects();
  const { data: vendors = [] } = useVendors();
  const createRfq = useCreateRfq();
  const { register, control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<RfqFormValues>({
    resolver: zodResolver(rfqSchema),
    defaultValues: emptyRfqFormValues(),
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const category = useWatch({ control, name: 'category' });

  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) reset(emptyRfqFormValues());
    wasOpen.current = open;
  }, [open, reset]);

  async function onSubmit(values: RfqFormValues): Promise<void> {
    try {
      const created = await createRfq.mutateAsync(toRfqInput(values));
      toast.success(`${created.rfqNumber} issued to ${created.vendorsInvited} vendor${created.vendorsInvited === 1 ? '' : 's'}`);
      onOpenChange(false);
      onCreated?.(created.id);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't create the RFQ. Try again."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New RFQ</DialogTitle>
          <DialogDescription>Request quotes from vendors, then compare them and award the best one.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <FormField label="Title" htmlFor="rfq-title" error={errors.title?.message}>
            <Input id="rfq-title" placeholder="e.g. Curtain wall glazing for Block C" {...register('title')} />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Project" error={errors.projectId?.message}>
              <Controller control={control} name="projectId" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-label="Project"><SelectValue placeholder="Select a project" /></SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </FormField>
            <FormField label="Category" error={errors.category?.message}>
              <Controller control={control} name="category" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-label="Category"><SelectValue placeholder="Select a category" /></SelectTrigger>
                  <SelectContent>
                    {PROCUREMENT_CATEGORIES.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </FormField>
            <FormField label="Priority">
              <Controller control={control} name="priority" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-label="Priority"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </FormField>
            <div className="grid grid-cols-2 gap-2">
              <FormField label="Closing date" htmlFor="rfq-closing" error={errors.closingDate?.message}>
                <Input id="rfq-closing" type="date" {...register('closingDate')} />
              </FormField>
              <FormField label="Est. value (₹)" htmlFor="rfq-estimate" error={errors.estimatedValue?.message}>
                <Input id="rfq-estimate" type="number" min={0} step="1000" {...register('estimatedValue')} />
              </FormField>
            </div>
          </div>

          <FormField label="Scope (optional)" htmlFor="rfq-description" error={errors.description?.message}>
            <Textarea id="rfq-description" rows={2} placeholder="Specifications, delivery terms, site constraints" {...register('description')} />
          </FormField>

          <fieldset className="space-y-2">
            <div className="flex items-center justify-between">
              <legend className="text-sm font-medium">Items to quote</legend>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ description: '', unit: 'nos', quantity: 1 })}
                disabled={fields.length >= MAX_LINE_ITEMS}
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Add item
              </Button>
            </div>
            <datalist id="rfq-units">
              {PROCUREMENT_UNITS.map((unit) => <option key={unit} value={unit} />)}
            </datalist>
            {fields.map((field, index) => {
              const itemErrors = errors.items?.[index];
              const message = itemErrors?.description?.message ?? itemErrors?.quantity?.message ?? itemErrors?.unit?.message;
              return (
                <div key={field.id} className="space-y-1">
                  <div className="flex gap-2">
                    <Input aria-label={`Item ${index + 1} description`} placeholder="Item description" className="flex-1" {...register(`items.${index}.description`)} />
                    <Input aria-label="Quantity" type="number" step="any" min={0} className="w-24" {...register(`items.${index}.quantity`)} />
                    <Input aria-label="Unit" list="rfq-units" className="w-20" {...register(`items.${index}.unit`)} />
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
                  {message && <p className="text-xs text-destructive" role="alert">{message}</p>}
                </div>
              );
            })}
            {errors.items?.root?.message && <p className="text-xs text-destructive" role="alert">{errors.items.root.message}</p>}
          </fieldset>

          <div className="space-y-1.5">
            <Label>Invite vendors</Label>
            <Controller control={control} name="vendorIds" render={({ field }) => (
              <VendorChecklist vendors={vendors} value={field.value} onChange={field.onChange} category={category} />
            )} />
            {errors.vendorIds?.message && <p className="text-xs text-destructive" role="alert">{errors.vendorIds.message}</p>}
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Issuing…' : 'Issue RFQ'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
