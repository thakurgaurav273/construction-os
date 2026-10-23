'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button, Input } from '@sitepilot/ui';
import { MailCheck } from 'lucide-react';
import { FormField } from '@/components/shared/FormField';
import { getApiErrorMessage } from '@/lib/api/errors';
import { authApi } from '../api/auth.api';
import { forgotPasswordSchema, type ForgotPasswordValues } from '../validation/password.schema';

export function ForgotPasswordForm(): React.ReactElement {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  async function onSubmit(values: ForgotPasswordValues): Promise<void> {
    try {
      await authApi.forgotPassword(values.email);
      setSentTo(values.email);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't send the reset link. Try again."));
    }
  }

  if (sentTo) {
    return (
      <div className="space-y-4 text-center">
        <MailCheck className="mx-auto h-10 w-10 text-emerald-600" />
        <p className="text-sm text-gray-700">
          If an account exists for <span className="font-medium">{sentTo}</span>, a reset link is on its way.
          It works once and expires in an hour.
        </p>
        <Link href="/login" className="inline-block text-sm font-medium text-gray-900 underline underline-offset-4">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <FormField label="Email" htmlFor="email" error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" placeholder="name@company.com" autoFocus {...register('email')} />
      </FormField>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Sending…' : 'Send reset link'}
      </Button>
      <p className="text-center text-sm text-gray-600">
        Remembered it?{' '}
        <Link href="/login" className="font-medium text-gray-900 underline underline-offset-4 hover:text-black">
          Sign in
        </Link>
      </p>
    </form>
  );
}
