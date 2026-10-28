'use client';

import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@sitepilot/ui';
import { FormField } from '@/components/shared/FormField';
import { SecretInput } from '@/components/shared/SecretInput';
import { useRemoveIntegration, useSaveStorageIntegration, type PlatformIntegrationRecord } from '@/hooks/api/use-platform';
import { getApiErrorMessage } from '@/lib/api/errors';
import { STORAGE_PROVIDER_OPTIONS, storageIntegrationSchema, type StorageIntegrationFormValues } from '../validation/integration.schema';
import { SavedIntegrationNote } from './SavedIntegrationNote';

interface StorageIntegrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saved: PlatformIntegrationRecord | null;
}

function defaultValues(saved: PlatformIntegrationRecord | null): StorageIntegrationFormValues {
  const settings = saved?.settings ?? {};
  return {
    provider: saved?.provider === 's3' ? 's3' : 'r2',
    bucket: settings.bucket ?? '',
    region: settings.region ?? '',
    endpoint: settings.endpoint ?? '',
    accountId: settings.accountId ?? '',
    accessKeyId: '',
    secretAccessKey: '',
  };
}

export function StorageIntegrationDialog({ open, onOpenChange, saved }: StorageIntegrationDialogProps): React.ReactElement {
  const saveStorage = useSaveStorageIntegration();
  const removeStorage = useRemoveIntegration();
  const { register, control, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<StorageIntegrationFormValues>({
    resolver: zodResolver(storageIntegrationSchema),
    defaultValues: defaultValues(saved),
  });
  const provider = watch('provider');

  // Also on close, so typed keys don't stay in the form after the dialog is gone.
  React.useEffect(() => {
    reset(defaultValues(saved));
  }, [open, saved, reset]);

  async function onSubmit(values: StorageIntegrationFormValues): Promise<void> {
    try {
      await saveStorage.mutateAsync({
        provider: values.provider,
        bucket: values.bucket,
        region: values.provider === 's3' ? values.region || undefined : undefined,
        endpoint: values.provider === 's3' ? values.endpoint || undefined : undefined,
        accountId: values.provider === 'r2' ? values.accountId : undefined,
        accessKeyId: values.accessKeyId,
        secretAccessKey: values.secretAccessKey,
      });
      toast.success(`Connected to bucket ${values.bucket}`);
      onOpenChange(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Couldn’t connect to the bucket. Check the settings and try again.'));
    }
  }

  async function disconnect(): Promise<void> {
    try {
      await removeStorage.mutateAsync('storage');
      toast.success('Saved storage removed. Files now follow the server settings.');
      onOpenChange(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Couldn’t remove the saved storage. Try again.'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>File storage</DialogTitle>
          <DialogDescription>
            Documents, photos, logos and reports for every workspace go to this private bucket. We upload, read and delete a small test file before saving.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {saved && <SavedIntegrationNote record={saved} summary={`${saved.provider === 'r2' ? 'Cloudflare R2' : 'S3'} bucket ${saved.settings.bucket}`} />}
          <FormField label="Provider" error={errors.provider?.message}>
            <Controller control={control} name="provider" render={({ field }) => (
              <Select value={field.value} onValueChange={(value) => { if (value) field.onChange(value); }}>
                <SelectTrigger aria-label="Provider"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STORAGE_PROVIDER_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectContent>
              </Select>
            )} />
          </FormField>
          {provider === 'r2' ? (
            <FormField label="Account ID" htmlFor="storage-account" error={errors.accountId?.message} hint="Cloudflare dashboard → R2 → Account details.">
              <Input id="storage-account" autoComplete="off" spellCheck={false} {...register('accountId')} />
            </FormField>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Region" htmlFor="storage-region" error={errors.region?.message}>
                <Input id="storage-region" placeholder="ap-south-1" autoComplete="off" spellCheck={false} {...register('region')} />
              </FormField>
              <FormField label="Endpoint (optional)" htmlFor="storage-endpoint" error={errors.endpoint?.message} hint="Only for MinIO, Wasabi and other S3-compatible servers.">
                <Input id="storage-endpoint" placeholder="https://s3.example.com" autoComplete="off" spellCheck={false} {...register('endpoint')} />
              </FormField>
            </div>
          )}
          <FormField label="Bucket" htmlFor="storage-bucket" error={errors.bucket?.message} hint="Keep public access off; files are shared through expiring links.">
            <Input id="storage-bucket" placeholder="sitepilot-files" autoComplete="off" spellCheck={false} {...register('bucket')} />
          </FormField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Access key ID" htmlFor="storage-access-key" error={errors.accessKeyId?.message}>
              <Input id="storage-access-key" autoComplete="off" spellCheck={false} {...register('accessKeyId')} />
            </FormField>
            <FormField label="Secret access key" htmlFor="storage-secret" error={errors.secretAccessKey?.message}>
              <SecretInput id="storage-secret" {...register('secretAccessKey')} />
            </FormField>
          </div>
          <p className="text-xs text-muted-foreground">
            {provider === 'r2'
              ? 'Create an R2 API token with Object Read & Write on this bucket only.'
              : 'Use an IAM user limited to s3:PutObject, s3:GetObject and s3:DeleteObject on this bucket.'}
            {' '}Keys are encrypted before they’re stored. Files already uploaded aren’t moved to the new bucket.
          </p>
          <DialogFooter className="gap-2 sm:justify-between">
            {saved ? (
              <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" disabled={removeStorage.isPending || isSubmitting} onClick={() => { void disconnect(); }}>
                Remove saved storage
              </Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Testing…' : 'Test and save'}</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
