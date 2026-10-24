'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input } from '@sitepilot/ui';
import { FormField } from '@/components/shared/FormField';
import { useSaveClient } from '@/hooks/api/use-billing';
import { getApiErrorMessage } from '@/lib/api/errors';
import type { Client } from '../types';
import { clientSchema, toClientFormValues, toClientInput, type ClientFormValues } from '../validation/client.schema';

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Omit to add a new client. */
  client?: Client;
  onSaved?: (client: Client) => void;
}

export function ClientFormDialog({ open, onOpenChange, client, onSaved }: ClientFormDialogProps): React.ReactElement {
  const saveClient = useSaveClient();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: toClientFormValues(client),
  });

  useEffect(() => {
    if (open) reset(toClientFormValues(client));
  }, [open, client, reset]);

  async function onSubmit(values: ClientFormValues): Promise<void> {
    try {
      const saved = await saveClient.mutateAsync({ id: client?.id, input: toClientInput(values) });
      toast.success(client ? `${saved.name} updated` : `${saved.name} added`);
      onOpenChange(false);
      onSaved?.(saved);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't save the client. Try again."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{client ? `Edit ${client.name}` : 'New Client'}</DialogTitle>
          <DialogDescription>The owner or main contractor you bill on client contracts. Shown on RA bills.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Name" htmlFor="client-name" error={errors.name?.message} className="sm:col-span-2">
              <Input id="client-name" placeholder="NTPC Ltd" autoFocus {...register('name')} />
            </FormField>
            <FormField label="Contact person (optional)" htmlFor="client-contact" error={errors.contactPerson?.message}>
              <Input id="client-contact" {...register('contactPerson')} />
            </FormField>
            <FormField label="Phone (optional)" htmlFor="client-phone" error={errors.phone?.message}>
              <Input id="client-phone" type="tel" {...register('phone')} />
            </FormField>
            <FormField label="Billing email (optional)" htmlFor="client-email" error={errors.email?.message}>
              <Input id="client-email" type="email" {...register('email')} />
            </FormField>
            <FormField label="GSTIN (optional)" htmlFor="client-gst" error={errors.gstNumber?.message}>
              <Input id="client-gst" className="uppercase" {...register('gstNumber')} />
            </FormField>
            <FormField label="Address (optional)" htmlFor="client-address" error={errors.address?.message} className="sm:col-span-2">
              <Input id="client-address" {...register('address')} />
            </FormField>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : client ? 'Save Changes' : 'Add Client'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
