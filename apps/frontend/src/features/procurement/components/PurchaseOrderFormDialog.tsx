'use client';

import React, { useEffect, useRef } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Textarea,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@sitepilot/ui';
import { FormField } from '@/components/shared/FormField';
import { useProjects } from '@/hooks/api/use-projects';
import { useCreatePurchaseOrder, useUpdatePurchaseOrder, useVendors } from '@/hooks/api/use-procurement';
import { getApiErrorMessage } from '@/lib/api/errors';
import { PRIORITY_OPTIONS, PROCUREMENT_CATEGORIES } from '../constants';
import { CategorySelect } from '@/features/finance/components/CategorySelect';
import type { PurchaseOrder, Vendor } from '../types';
import {
  purchaseOrderSchema, toPurchaseOrderFormValues, toPurchaseOrderInput, type PurchaseOrderFormValues,
} from '../validation/purchase-order.schema';
import { LineItemsEditor } from './LineItemsEditor';

interface PurchaseOrderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Omit to raise a new order. */
  order?: PurchaseOrder;
  /** Pre-selects the vendor when raising an order from a vendor profile. */
  vendor?: Vendor;
  /** Pre-selects the project when raising an order from a project page. */
  projectId?: string;
  /** Prefilled values for a new order, e.g. a reorder suggestion. */
  prefill?: Partial<PurchaseOrderFormValues>;
  /** Short explanation shown above the form, e.g. why this quantity was suggested. */
  context?: React.ReactNode;
  /** Called with the saved order, e.g. to open it in the drawer. */
  onSaved?: (orderId: string) => void;
}

export function PurchaseOrderFormDialog({
  open, onOpenChange, order, vendor, projectId, prefill, context, onSaved,
}: PurchaseOrderFormDialogProps): React.ReactElement {
  const { data: projects = [] } = useProjects();
  const { data: vendors = [] } = useVendors();
  const createOrder = useCreatePurchaseOrder();
  const updateOrder = useUpdatePurchaseOrder();
  const { register, control, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: { ...toPurchaseOrderFormValues(order, vendor, projectId), ...prefill },
  });

  const activeVendors = vendors.filter((option) => option.status === 'ACTIVE' || option.id === order?.vendor?.id);
  const categories = [...new Set([order?.category, prefill?.category, ...PROCUREMENT_CATEGORIES].filter((value): value is string => !!value))];
  const selectedProjectId = useWatch({ control, name: 'projectId' });

  // Reset only as the dialog opens; background refetches must not wipe in-progress edits.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) reset({ ...toPurchaseOrderFormValues(order, vendor, projectId), ...prefill });
    wasOpen.current = open;
  }, [open, order, vendor, projectId, prefill, reset]);

  async function onSubmit(values: PurchaseOrderFormValues): Promise<void> {
    const input = toPurchaseOrderInput(values);
    try {
      const saved = order
        ? await updateOrder.mutateAsync({ id: order.id, input })
        : await createOrder.mutateAsync(input);
      toast.success(order ? `${saved.poNumber} updated` : `${saved.poNumber} saved as draft`, {
        description: order ? undefined : 'Submit it for approval when ready.',
      });
      onOpenChange(false);
      onSaved?.(saved.id);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't save the purchase order. Try again."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{order ? `Edit ${order.poNumber}` : 'New Purchase Order'}</DialogTitle>
          <DialogDescription>
            {order ? 'Update the order, then resubmit it for approval.' : 'Saved as a draft. Submit it for approval from the order drawer.'}
          </DialogDescription>
        </DialogHeader>

        {context && <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">{context}</div>}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
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
            <FormField label="Vendor" error={errors.vendorId?.message}>
              <Controller control={control} name="vendorId" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-label="Vendor"><SelectValue placeholder="Select a vendor" /></SelectTrigger>
                  <SelectContent>
                    {activeVendors.map((option) => <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </FormField>
            <FormField label="Category" error={errors.category?.message}>
              <Controller control={control} name="category" render={({ field }) => (
                <CategorySelect projectId={selectedProjectId || undefined} value={field.value} onChange={field.onChange} fallbackCategories={categories} />
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
            <FormField label="Expected delivery" htmlFor="po-expected" error={errors.expectedDelivery?.message}>
              <Input id="po-expected" type="date" {...register('expectedDelivery')} />
            </FormField>
            <FormField label="Delivery address" htmlFor="po-address" error={errors.deliveryAddress?.message}>
              <Input id="po-address" placeholder="Site store, gate 2" {...register('deliveryAddress')} />
            </FormField>
          </div>

          <LineItemsEditor control={control} register={register} errors={errors} setValue={setValue} />

          <FormField label="Notes (optional)" htmlFor="po-notes" error={errors.notes?.message}>
            <Textarea id="po-notes" rows={2} placeholder="Context for the approver" {...register('notes')} />
          </FormField>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : order ? 'Save Changes' : 'Save Draft'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
