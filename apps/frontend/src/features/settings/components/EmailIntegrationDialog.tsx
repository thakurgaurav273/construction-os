'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input,
} from '@sitepilot/ui';
import { FormField } from '@/components/shared/FormField';
import { SecretInput } from '@/components/shared/SecretInput';
import { useRemoveIntegration, useSaveEmailIntegration, type PlatformIntegrationRecord } from '@/hooks/api/use-platform';
import { getApiErrorMessage } from '@/lib/api/errors';
import { emailIntegrationSchema, type EmailIntegrationFormValues } from '../validation/integration.schema';
import { SavedIntegrationNote } from './SavedIntegrationNote';

interface EmailIntegrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saved: PlatformIntegrationRecord | null;
  /** The signed-in admin, who receives the test email. */
  adminEmail: string;
}

export function EmailIntegrationDialog({ open, onOpenChange, saved, adminEmail }: EmailIntegrationDialogProps): React.ReactElement {
  const saveEmail = useSaveEmailIntegration();
  const removeEmail = useRemoveIntegration();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<EmailIntegrationFormValues>({
    resolver: zodResolver(emailIntegrationSchema),
    defaultValues: { apiKey: '', fromAddress: saved?.settings.fromAddress ?? '' },
  });

  // Also on close, so typed keys don't stay in the form after the dialog is gone.
  React.useEffect(() => {
    reset({ apiKey: '', fromAddress: saved?.settings.fromAddress ?? '' });
  }, [open, saved, reset]);

  async function onSubmit(values: EmailIntegrationFormValues): Promise<void> {
    try {
      await saveEmail.mutateAsync(values);
      toast.success(`Email connected. A test email is on its way to ${adminEmail}.`);
      onOpenChange(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Couldn’t send the test email. Check the key and sender, then try again.'));
    }
  }

  async function disconnect(): Promise<void> {
    try {
      await removeEmail.mutateAsync('email');
      toast.success('Saved email settings removed. Email now follows the server settings.');
      onOpenChange(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Couldn’t remove the saved email settings. Try again.'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Email delivery</DialogTitle>
          <DialogDescription>
            Invitations, password resets and notifications for every workspace are sent through Resend. We send a test email to {adminEmail} before saving.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {saved && <SavedIntegrationNote record={saved} summary={`Resend, sending from ${saved.settings.fromAddress}`} />}
          <FormField label="Resend API key" htmlFor="email-api-key" error={errors.apiKey?.message} hint="Resend → API Keys. Sending access is enough.">
            <SecretInput id="email-api-key" placeholder="re_…" {...register('apiKey')} />
          </FormField>
          <FormField label="Send from" htmlFor="email-from" error={errors.fromAddress?.message} hint="An address on a domain you’ve verified in Resend.">
            <Input id="email-from" placeholder="SitePilot <noreply@yourcompany.com>" autoComplete="off" {...register('fromAddress')} />
          </FormField>
          <DialogFooter className="gap-2 sm:justify-between">
            {saved ? (
              <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" disabled={removeEmail.isPending || isSubmitting} onClick={() => { void disconnect(); }}>
                Remove saved email
              </Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Sending test…' : 'Test and save'}</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
