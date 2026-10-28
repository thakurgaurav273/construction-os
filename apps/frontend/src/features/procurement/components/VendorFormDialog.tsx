'use client';

import React, { useEffect, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label, cn,
} from '@sitepilot/ui';
import { FormField } from '@/components/shared/FormField';
import { useCreateVendor, useUpdateVendor } from '@/hooks/api/use-procurement';
import { getApiErrorMessage } from '@/lib/api/errors';
import { PROCUREMENT_CATEGORIES } from '../constants';
import type { Vendor } from '../types';
import { toVendorFormValues, toVendorInput, vendorSchema, type VendorFormValues } from '../validation/vendor.schema';

interface VendorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Omit to add a new vendor. */
  vendor?: Vendor;
}

export function VendorFormDialog({ open, onOpenChange, vendor }: VendorFormDialogProps): React.ReactElement {
  const createVendor = useCreateVendor();
  const updateVendor = useUpdateVendor();
  const { register, control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<VendorFormValues>({
    resolver: zodResolver(vendorSchema),
    defaultValues: toVendorFormValues(vendor),
  });

  const categoryOptions = [...new Set([...PROCUREMENT_CATEGORIES, ...(vendor?.categories ?? [])])];

  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) reset(toVendorFormValues(vendor));
    wasOpen.current = open;
  }, [open, vendor, reset]);

  async function onSubmit(values: VendorFormValues): Promise<void> {
    const input = toVendorInput(values);
    try {
      const saved = vendor
        ? await updateVendor.mutateAsync({ id: vendor.id, input })
        : await createVendor.mutateAsync(input);
      toast.success(vendor ? `${saved.name} updated` : `${saved.name} added as ${saved.code}`);
      onOpenChange(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't save the vendor. Try again."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{vendor ? 'Edit Vendor' : 'Add Vendor'}</DialogTitle>
          <DialogDescription>
            {vendor ? 'Update contact details, terms and supply categories.' : 'Add a supplier to your approved vendor panel.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Vendor name" htmlFor="vendor-name" error={errors.name?.message}>
              <Input id="vendor-name" placeholder="e.g. Tata Steel Ltd" {...register('name')} />
            </FormField>
            <FormField label="Vendor code" htmlFor="vendor-code" hint="Leave blank to generate one." error={errors.code?.message}>
              <Input id="vendor-code" placeholder="VN-0009" {...register('code')} />
            </FormField>
          </div>

          <div className="space-y-1.5">
            <Label>Supply categories</Label>
            <Controller control={control} name="categories" render={({ field }) => (
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Supply categories">
                {categoryOptions.map((category) => {
                  const selected = field.value.includes(category);
                  return (
                    <button
                      key={category}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => field.onChange(
                        selected ? field.value.filter((value) => value !== category) : [...field.value, category],
                      )}
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        selected ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted',
                      )}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
            )} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Contact person" htmlFor="vendor-contact" error={errors.contactPerson?.message}>
              <Input id="vendor-contact" {...register('contactPerson')} />
            </FormField>
            <FormField label="Phone" htmlFor="vendor-phone" error={errors.phone?.message}>
              <Input id="vendor-phone" type="tel" placeholder="+91 98450 11001" {...register('phone')} />
            </FormField>
            <FormField label="Email" htmlFor="vendor-email" error={errors.email?.message}>
              <Input id="vendor-email" type="email" {...register('email')} />
            </FormField>
            <FormField label="GSTIN" htmlFor="vendor-gst" error={errors.gstNumber?.message}>
              <Input id="vendor-gst" placeholder="29AAACT2803M1ZK" className="uppercase" {...register('gstNumber')} />
            </FormField>
            <FormField label="Payment terms" htmlFor="vendor-terms" error={errors.paymentTerms?.message}>
              <Input id="vendor-terms" placeholder="Net 30" {...register('paymentTerms')} />
            </FormField>
            <div className="grid grid-cols-2 gap-2">
              <FormField label="City" htmlFor="vendor-city" error={errors.city?.message}>
                <Input id="vendor-city" {...register('city')} />
              </FormField>
              <FormField label="State" htmlFor="vendor-state" error={errors.state?.message}>
                <Input id="vendor-state" {...register('state')} />
              </FormField>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : vendor ? 'Save Changes' : 'Add Vendor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
