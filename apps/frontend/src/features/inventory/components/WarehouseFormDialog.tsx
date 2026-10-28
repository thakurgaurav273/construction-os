'use client';

import React, { useEffect, useRef } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@sitepilot/ui';
import { FormField } from '@/components/shared/FormField';
import { useSaveWarehouse, type WarehouseDetail } from '@/hooks/api/use-inventory';
import { useProjects } from '@/hooks/api/use-projects';
import { getApiErrorMessage } from '@/lib/api/errors';
import {
  WAREHOUSE_TYPES, toWarehouseFormValues, toWarehouseInput, warehouseSchema, type WarehouseFormValues,
} from '../validation/warehouse.schema';

/** Radix Select can't hold an empty value, so this stands in for "no project". */
const NO_PROJECT = 'none';

interface WarehouseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Omit to add a new store. */
  warehouse?: WarehouseDetail;
  onSaved?: (warehouseId: string) => void;
}

export function WarehouseFormDialog({ open, onOpenChange, warehouse, onSaved }: WarehouseFormDialogProps): React.ReactElement {
  const saveWarehouse = useSaveWarehouse();
  const { data: projects = [] } = useProjects();
  const { register, control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<WarehouseFormValues>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: toWarehouseFormValues(warehouse),
  });
  const type = useWatch({ control, name: 'type' });

  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) reset(toWarehouseFormValues(warehouse));
    wasOpen.current = open;
  }, [open, warehouse, reset]);

  async function onSubmit(values: WarehouseFormValues): Promise<void> {
    try {
      const saved = await saveWarehouse.mutateAsync({ id: warehouse?.id, input: toWarehouseInput(values) });
      toast.success(warehouse ? `${values.name} updated` : `${values.name} added`);
      onOpenChange(false);
      onSaved?.(saved.id);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't save the store. Try again."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{warehouse ? 'Edit Store' : 'Add Store'}</DialogTitle>
          <DialogDescription>
            {warehouse ? 'Update the store details.' : 'Add a central warehouse, yard or a project site store.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1fr]">
            <FormField label="Store name" htmlFor="store-name" error={errors.name?.message}>
              <Input id="store-name" placeholder="e.g. Whitefield Site Store" {...register('name')} />
            </FormField>
            <FormField label="Code" htmlFor="store-code" error={errors.code?.message}>
              <Input id="store-code" placeholder="SS-WF-01" className="uppercase" {...register('code')} />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Type" error={errors.type?.message}>
              <Controller control={control} name="type" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-label="Store type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {WAREHOUSE_TYPES.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
            </FormField>
            <FormField
              label={type === 'SITE_STORE' ? 'Project' : 'Project (optional)'}
              error={errors.projectId?.message}
            >
              <Controller control={control} name="projectId" render={({ field }) => (
                <Select value={field.value || NO_PROJECT} onValueChange={(value) => field.onChange(value === NO_PROJECT ? '' : value)}>
                  <SelectTrigger aria-label="Project"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_PROJECT}>No project</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
            </FormField>
          </div>

          <FormField label="Address (optional)" htmlFor="store-address" error={errors.address?.message}>
            <Input id="store-address" {...register('address')} />
          </FormField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label="City" htmlFor="store-city" error={errors.city?.message}>
              <Input id="store-city" {...register('city')} />
            </FormField>
            <FormField label="Store keeper" htmlFor="store-manager" error={errors.manager?.message}>
              <Input id="store-manager" {...register('manager')} />
            </FormField>
            <FormField label="Capacity" htmlFor="store-capacity" hint="Units, for utilisation" error={errors.capacity?.message}>
              <Input id="store-capacity" type="number" min={0} step="any" {...register('capacity')} />
            </FormField>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : warehouse ? 'Save Changes' : 'Add Store'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
