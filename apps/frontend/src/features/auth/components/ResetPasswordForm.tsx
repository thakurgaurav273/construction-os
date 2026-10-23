'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button, Input } from '@sitepilot/ui';
import { FormField } from '@/components/shared/FormField';
import { getApiErrorMessage } from '@/lib/api/errors';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '../api/auth.api';
import { MIN_PASSWORD_LENGTH, resetPasswordSchema, type ResetPasswordValues } from '../validation/password.schema';

export function ResetPasswordForm(): React.ReactElement {
  const router = useRouter();
  const token = useSearchParams().get('token');
  const clearAuth = useAuthStore((state) => state.logout);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-gray-700">This reset link is incomplete. Open the link from your email again, or request a new one.</p>
        <Link href="/forgot-password" className="inline-block text-sm font-medium text-gray-900 underline underline-offset-4">
          Request a new link
        </Link>
      </div>
    );
  }

  async function onSubmit(values: ResetPasswordValues): Promise<void> {
    if (!token) return;
    try {
      await authApi.resetPassword(token, values.password);
      // Resetting signs out every session, including this browser's.
      clearAuth();
      toast.success('Password updated. Sign in with your new password.');
      router.replace('/login');
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't update the password. Try again."));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <FormField label="New password" htmlFor="password" hint={`At least ${MIN_PASSWORD_LENGTH} characters.`} error={errors.password?.message}>
        <Input id="password" type="password" autoComplete="new-password" autoFocus {...register('password')} />
      </FormField>
      <FormField label="Confirm password" htmlFor="confirm-password" error={errors.confirmPassword?.message}>
        <Input id="confirm-password" type="password" autoComplete="new-password" {...register('confirmPassword')} />
      </FormField>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : 'Set new password'}
      </Button>
      <p className="text-center text-sm text-gray-600">
        Link expired?{' '}
        <Link href="/forgot-password" className="font-medium text-gray-900 underline underline-offset-4 hover:text-black">
          Request a new one
        </Link>
      </p>
    </form>
  );
}
