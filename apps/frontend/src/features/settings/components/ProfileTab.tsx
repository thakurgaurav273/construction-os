'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Skeleton } from '@sitepilot/ui';
import { Save } from 'lucide-react';
import { FormField } from '@/components/shared/FormField';
import { useCurrentAccess } from '@/hooks/api/use-access';
import { useUpdateProfile } from '@/hooks/api/use-account';
import { getApiErrorMessage } from '@/lib/api/errors';
import { useAuthHydrated, useAuthStore } from '@/store/auth.store';
import { formatRole } from '../constants';
import { ProfilePhoto } from './ProfilePhoto';
import { profileSchema, type ProfileFormValues } from '../validation/account.schema';

/** Settings → Profile: the signed-in person's own details. Shown on reports, approvals and the audit log. */
export function ProfileTab(): React.ReactElement {
  const hydrated = useAuthHydrated();
  const user = useAuthStore((state) => state.user);
  const organization = useAuthStore((state) => state.organization);
  const { data: access } = useCurrentAccess();
  const updateProfile = useUpdateProfile();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? '' },
  });

  useEffect(() => {
    if (user) reset({ name: user.name });
  }, [user, reset]);

  async function onSubmit(values: ProfileFormValues): Promise<void> {
    try {
      const saved = await updateProfile.mutateAsync(values);
      reset({ name: saved.name });
      toast.success('Profile saved');
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't save your profile. Try again."));
    }
  }

  if (!hydrated || !user) {
    return <Card><CardContent className="space-y-4 p-6"><Skeleton className="h-16 w-16 rounded-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></CardContent></Card>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your name and photo appear on daily reports, approvals, teams and the audit log.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ProfilePhoto user={user} />
          <div className="min-w-0">
            <p className="truncate font-medium">{user.name}</p>
            <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
              {access?.role && <Badge variant="outline">{formatRole(access.role)}</Badge>}
              <span className="truncate">{organization?.name}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="Full name" htmlFor="profile-name" error={errors.name?.message}>
              <Input id="profile-name" autoComplete="name" {...register('name')} />
            </FormField>
            <FormField label="Email" htmlFor="profile-email" hint="Your sign-in email can't be changed here.">
              <Input id="profile-email" value={user.email} readOnly disabled />
            </FormField>
            <FormField label="Member since" htmlFor="profile-since">
              <Input id="profile-since" value={format(new Date(user.createdAt), 'MMMM d, yyyy')} readOnly disabled />
            </FormField>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" disabled={!isDirty || isSubmitting} onClick={() => reset({ name: user.name })}>
          Discard Changes
        </Button>
        <Button type="submit" disabled={!isDirty || isSubmitting}>
          <Save className="mr-2 h-4 w-4" /> {isSubmitting ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
