'use client';

import React, { useEffect, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Skeleton,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@sitepilot/ui';
import { AlertTriangle, Building2, Save, Trash2, Upload } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { FormField } from '@/components/shared/FormField';
import { useCan } from '@/hooks/api/use-access';
import {
  useOrganizationSettings, useRemoveOrganizationLogo, useUpdateOrganizationSettings, useUploadOrganizationLogo,
} from '@/hooks/api/use-settings';
import { getApiErrorMessage } from '@/lib/api/errors';
import { useAuthStore } from '@/store/auth.store';
import {
  CURRENCIES, TIMEZONES, organizationSchema, toOrganizationFormValues, toOrganizationInput, type OrganizationFormValues,
} from '../validation/organization.schema';

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/** Settings → Organization: company details used on purchase orders, invoices and reports, plus the logo. */
export function OrganizationSettingsTab(): React.ReactElement {
  const canManage = useCan()('organization.manage');
  const { data: organization, isLoading, isError, refetch } = useOrganizationSettings();
  const updateOrganization = useUpdateOrganizationSettings();
  const uploadLogo = useUploadOrganizationLogo();
  const removeLogo = useRemoveOrganizationLogo();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, control, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationSchema),
    defaultValues: toOrganizationFormValues(organization),
  });

  // Load server values once they arrive, and again after a save, without wiping edits on background refetches.
  const loadedFor = useRef<string | null>(null);
  useEffect(() => {
    if (organization && loadedFor.current !== organization.id) {
      reset(toOrganizationFormValues(organization));
      loadedFor.current = organization.id;
    }
  }, [organization, reset]);

  /** The sidebar shows the organization name from the session, so keep it in step. */
  function syncSessionName(name: string): void {
    const { user, organization: sessionOrganization, setAuth } = useAuthStore.getState();
    if (user && sessionOrganization) setAuth(user, { ...sessionOrganization, name });
  }

  async function onSubmit(values: OrganizationFormValues): Promise<void> {
    try {
      const saved = await updateOrganization.mutateAsync(toOrganizationInput(values));
      reset(toOrganizationFormValues(saved));
      syncSessionName(saved.name);
      toast.success('Organization settings saved');
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't save the settings. Try again."));
    }
  }

  async function handleLogoSelect(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type)) {
      toast.error('Upload a PNG, JPG or WebP image.');
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error('The logo must be 2 MB or smaller.');
      return;
    }
    try {
      await uploadLogo.mutateAsync(file);
      toast.success('Logo updated');
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't upload the logo. Try again."));
    }
  }

  async function handleRemoveLogo(): Promise<void> {
    try {
      await removeLogo.mutateAsync();
      toast.success('Logo removed');
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't remove the logo. Try again."));
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="space-y-4 p-6">
          <Skeleton className="h-20 w-20 rounded-xl" />
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-10 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError || !organization) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Unable to load organization settings"
        description="Check your connection and try again."
        action={<Button variant="outline" onClick={() => refetch()}>Retry</Button>}
      />
    );
  }

  const logoBusy = uploadLogo.isPending || removeLogo.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
          <CardDescription>Shown on purchase orders, invoices and reports.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6 border-b pb-6">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted">
              {organization.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- signed storage URL, not a Next.js static asset
                <img src={organization.logoUrl} alt={`${organization.name} logo`} className="h-full w-full object-contain" />
              ) : (
                <Building2 className="h-8 w-8 text-muted-foreground opacity-50" />
              )}
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Organization logo</h4>
              {canManage && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={LOGO_TYPES.join(',')}
                    className="hidden"
                    aria-label="Upload logo"
                    onChange={(event) => { void handleLogoSelect(event); }}
                  />
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" disabled={logoBusy} onClick={() => fileInputRef.current?.click()}>
                      <Upload className="mr-2 h-4 w-4" /> {uploadLogo.isPending ? 'Uploading…' : 'Upload'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive/90"
                      disabled={!organization.logoUrl || logoBusy}
                      onClick={() => { void handleRemoveLogo(); }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Remove
                    </Button>
                  </div>
                </>
              )}
              <p className="text-xs text-muted-foreground">PNG, JPG or WebP, up to 2 MB. A square image works best.</p>
            </div>
          </div>

          {/* Radix Select can report an empty value while its options re-render; those calls are ignored below. */}
          <fieldset disabled={!canManage} className="grid gap-4 md:grid-cols-2">
            <FormField label="Organization name" htmlFor="org-name" error={errors.name?.message}>
              <Input id="org-name" {...register('name')} />
            </FormField>
            <FormField label="Workspace ID" htmlFor="org-slug" hint="Fixed when the workspace was created.">
              <Input id="org-slug" value={organization.slug} readOnly disabled />
            </FormField>
            <FormField label="GSTIN (optional)" htmlFor="org-gst" error={errors.gstNumber?.message}>
              <Input id="org-gst" className="uppercase" placeholder="29AAACT2803M1ZK" {...register('gstNumber')} />
            </FormField>
            <FormField label="Currency" error={errors.currency?.message}>
              <Controller control={control} name="currency" render={({ field }) => (
                <Select value={field.value} onValueChange={(value) => { if (value) field.onChange(value); }} disabled={!canManage}>
                  <SelectTrigger aria-label="Currency"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((code) => <SelectItem key={code} value={code}>{code}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </FormField>
            <FormField label="Registered address (optional)" htmlFor="org-address" error={errors.address?.message} className="md:col-span-2">
              <Input id="org-address" {...register('address')} />
            </FormField>
            <FormField label="Time zone" hint="Used for attendance days and report schedules." error={errors.timezone?.message}>
              <Controller control={control} name="timezone" render={({ field }) => (
                <Select value={field.value} onValueChange={(value) => { if (value) field.onChange(value); }} disabled={!canManage}>
                  <SelectTrigger aria-label="Time zone"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[...new Set([field.value, ...TIMEZONES])].map((zone) => <SelectItem key={zone} value={zone}>{zone}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </FormField>
          </fieldset>
        </CardContent>
      </Card>

      {canManage && (
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={!isDirty || isSubmitting} onClick={() => reset(toOrganizationFormValues(organization))}>
            Discard Changes
          </Button>
          <Button type="submit" disabled={!isDirty || isSubmitting}>
            <Save className="mr-2 h-4 w-4" /> {isSubmitting ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      )}
    </form>
  );
}
