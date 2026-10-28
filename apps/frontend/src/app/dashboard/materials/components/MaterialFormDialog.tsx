'use client';

import React, { useEffect, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@sitepilot/ui';
import { FormField } from '@/components/shared/FormField';
import {
  useCreateMaterial, useMaterialCategories, useMaterialSuppliers, useUpdateMaterial, type MaterialListItem,
} from '@/hooks/api/use-materials';
import { getApiErrorMessage } from '@/lib/api/errors';
import {
  materialSchema, toMaterialFormValues, toMaterialInput, type MaterialFormValues,
} from '@/features/materials/validation/material.schema';

/** Radix Select can't hold an empty value, so "none" stands in for a cleared choice. */
const NONE = 'none';

interface MaterialFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** Omit to add a new material. */
  material?: MaterialListItem;
}

export function MaterialFormDialog({ open, onClose, material }: MaterialFormDialogProps): React.ReactElement {
  const createMaterial = useCreateMaterial();
  const updateMaterial = useUpdateMaterial();
  const { data: categories = [] } = useMaterialCategories();
  const { data: suppliers = [] } = useMaterialSuppliers();

  const { register, control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<MaterialFormValues>({
    resolver: zodResolver(materialSchema),
    defaultValues: toMaterialFormValues(material),
  });

  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) reset(toMaterialFormValues(material));
    wasOpen.current = open;
  }, [open, material, reset]);

  async function onSubmit(values: MaterialFormValues): Promise<void> {
    const input = toMaterialInput(values);
    try {
      const saved = material
        ? await updateMaterial.mutateAsync({ id: material.id, input })
        : await createMaterial.mutateAsync(input);
      toast.success(material ? `${saved.name} updated` : `${saved.name} added to the catalogue`);
      onClose();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't save the material. Try again."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{material ? 'Edit Material' : 'Add Material'}</DialogTitle>
          <DialogDescription>
            {material
              ? 'Update catalogue details. Stock changes through receipts, issues, transfers and adjustments.'
              : 'Add a material to your catalogue. Stock arrives through goods receipts or an opening adjustment.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormField label="Material name" htmlFor="material-name" error={errors.name?.message}>
            <Input id="material-name" placeholder="e.g. OPC 53 Grade Cement" {...register('name')} />
          </FormField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="SKU" htmlFor="material-sku" error={errors.sku?.message}>
              <Input id="material-sku" placeholder="CEM-OPC-53" {...register('sku')} />
            </FormField>
            <FormField label="Unit" htmlFor="material-unit" error={errors.unit?.message}>
              <Input id="material-unit" placeholder="e.g. Bags, MT, Nos" {...register('unit')} />
            </FormField>

            <FormField label="Category (optional)" error={errors.categoryId?.message}>
              <Controller control={control} name="categoryId" render={({ field }) => (
                <Select value={field.value || NONE} onValueChange={(value) => field.onChange(value === NONE ? '' : value)}>
                  <SelectTrigger aria-label="Category"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>No category</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
            </FormField>
            <FormField label="Preferred supplier (optional)" error={errors.supplierId?.message}>
              <Controller control={control} name="supplierId" render={({ field }) => (
                <Select value={field.value || NONE} onValueChange={(value) => field.onChange(value === NONE ? '' : value)}>
                  <SelectTrigger aria-label="Preferred supplier"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>No supplier</SelectItem>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField
              label="Unit cost (₹)"
              htmlFor="material-cost"
              error={errors.unitCost?.message}
              hint={material ? 'Receipts update this to the moving average.' : undefined}
            >
              <Input id="material-cost" type="number" step="0.01" min={0} {...register('unitCost')} />
            </FormField>
            <FormField label="Min stock" htmlFor="material-min" error={errors.minStock?.message}>
              <Input id="material-min" type="number" step="any" min={0} {...register('minStock')} />
            </FormField>
            <FormField label="Max stock" htmlFor="material-max" error={errors.maxStock?.message}>
              <Input id="material-max" type="number" step="any" min={0} {...register('maxStock')} />
            </FormField>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : material ? 'Save Changes' : 'Add Material'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
