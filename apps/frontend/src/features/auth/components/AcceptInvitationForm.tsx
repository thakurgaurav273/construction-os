'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button, Input, Skeleton } from '@sitepilot/ui';
import { AlertTriangle } from 'lucide-react';
import { FormField } from '@/components/shared/FormField';
import { getApiErrorMessage } from '@/lib/api/errors';
import { useAuthStore } from '@/store/auth.store';
import { authApi, type InvitationPreview } from '../api/auth.api';
import { MIN_PASSWORD_LENGTH, acceptInvitationSchema, type AcceptInvitationValues } from '../validation/password.schema';

function formatRole(role: string): string {
  return role.replace(/_/g, ' ').toLowerCase();
}

function InvitationForm({ token, invitation }: { token: string; invitation: InvitationPreview }): React.ReactElement {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<AcceptInvitationValues>({
    resolver: zodResolver(acceptInvitationSchema(invitation.hasAccount)),
    defaultValues: { name: '', password: '', confirmPassword: '' },
  });

  async function onSubmit(values: AcceptInvitationValues): Promise<void> {
    try {
      const session = await authApi.acceptInvitation(token, {
        name: invitation.hasAccount ? undefined : values.name,
        password: values.password,
      });
      setAuth(session.user, session.organization);
      toast.success(`Welcome to ${invitation.organizationName}`);
      router.replace('/dashboard');
      router.refresh();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't accept the invitation. Try again."));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
        <span className="font-medium text-gray-900">{invitation.invitedByName}</span> invited{' '}
        <span className="font-medium text-gray-900">{invitation.email}</span> to join{' '}
        <span className="font-medium text-gray-900">{invitation.organizationName}</span> as{' '}
        <span className="font-medium text-gray-900">{formatRole(invitation.role)}</span>.
      </div>

      {invitation.hasAccount ? (
        <FormField label="Your SitePilot password" htmlFor="password" hint="This email already has an account. Confirm it's you to join." error={errors.password?.message}>
          <Input id="password" type="password" autoComplete="current-password" autoFocus {...register('password')} />
        </FormField>
      ) : (
        <>
          <FormField label="Full name" htmlFor="name" error={errors.name?.message}>
            <Input id="name" autoComplete="name" autoFocus {...register('name')} />
          </FormField>
          <FormField label="Choose a password" htmlFor="password" hint={`At least ${MIN_PASSWORD_LENGTH} characters.`} error={errors.password?.message}>
            <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
          </FormField>
          <FormField label="Confirm password" htmlFor="confirm-password" error={errors.confirmPassword?.message}>
            <Input id="confirm-password" type="password" autoComplete="new-password" {...register('confirmPassword')} />
          </FormField>
        </>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Joining…' : `Join ${invitation.organizationName}`}
      </Button>
      {invitation.hasAccount && (
        <p className="text-center text-sm text-gray-600">
          Forgot it?{' '}
          <Link href="/forgot-password" className="font-medium text-gray-900 underline underline-offset-4">Reset your password</Link>
          , then open this link again.
        </p>
      )}
    </form>
  );
}

export function AcceptInvitationForm({ token }: { token: string }): React.ReactElement {
  const { data: invitation, isLoading, isError, error } = useQuery({
    queryKey: ['invitation', token],
    queryFn: () => authApi.getInvitation(token),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (isError || !invitation) {
    return (
      <div className="space-y-4 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
        <p className="text-sm text-gray-700">
          {getApiErrorMessage(error, 'This invitation link is invalid or has expired. Ask your administrator to send a new one.')}
        </p>
        <Link href="/login" className="inline-block text-sm font-medium text-gray-900 underline underline-offset-4">
          Go to sign in
        </Link>
      </div>
    );
  }

  return <InvitationForm token={token} invitation={invitation} />;
}
