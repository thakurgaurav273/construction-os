'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '@sitepilot/ui';
import { FormField } from '@/components/shared/FormField';
import { useChangePassword } from '@/hooks/api/use-account';
import { getApiErrorMessage } from '@/lib/api/errors';
import { changePasswordSchema, type ChangePasswordFormValues } from '../validation/account.schema';

const EMPTY: ChangePasswordFormValues = { currentPassword: '', newPassword: '', confirmPassword: '' };

export function ChangePasswordCard(): React.ReactElement {
  const changePassword = useChangePassword();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: EMPTY,
  });

  async function onSubmit({ currentPassword, newPassword }: ChangePasswordFormValues): Promise<void> {
    try {
      const { endedSessions } = await changePassword.mutateAsync({ currentPassword, newPassword });
      reset(EMPTY);
      toast.success(endedSessions > 0
        ? `Password changed. ${endedSessions} other ${endedSessions === 1 ? 'device was' : 'devices were'} signed out.`
        : 'Password changed');
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't change your password. Try again."));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>Changing your password signs you out on every other device. You stay signed in here.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="Current password" htmlFor="current-password" error={errors.currentPassword?.message} className="md:col-span-2 md:max-w-[calc(50%-0.5rem)]">
              <Input id="current-password" type="password" autoComplete="current-password" {...register('currentPassword')} />
            </FormField>
            <FormField label="New password" htmlFor="new-password" error={errors.newPassword?.message} hint="At least 8 characters.">
              <Input id="new-password" type="password" autoComplete="new-password" {...register('newPassword')} />
            </FormField>
            <FormField label="Confirm new password" htmlFor="confirm-password" error={errors.confirmPassword?.message}>
              <Input id="confirm-password" type="password" autoComplete="new-password" {...register('confirmPassword')} />
            </FormField>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Changing…' : 'Change Password'}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
