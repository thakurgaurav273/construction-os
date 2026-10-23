'use client';

import React, { useEffect, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Skeleton,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@sitepilot/ui';
import { AlertTriangle, Save } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { FormField } from '@/components/shared/FormField';
import { useCan } from '@/hooks/api/use-access';
import {
  useOrganizationSettings, useUpdateOrganizationSettings,
} from '@/hooks/api/use-settings';
import { getApiErrorMessage } from '@/lib/api/errors';
import { useAuthStore } from '@/store/auth.store';
import {
  CURRENCIES, TIMEZONES, organizationSchema, toOrganizationFormValues, toOrganizationInput, type OrganizationFormValues,
} from '../validation/organization.schema';

/** Settings → Organization: company details used on purchase orders, invoices and reports. The logo lives under Branding. */
export function OrganizationSettingsTab(): React.ReactElement {
  const canManage = useCan()('organization.manage');
  const { data: organization, isLoading, isError, refetch } = useOrganizationSettings();
  const updateOrganization = useUpdateOrganizationSettings();

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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
          <CardDescription>Shown on purchase orders, invoices and reports.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
