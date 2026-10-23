'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

import { Button, Input, Label } from '@sitepilot/ui';

import { authApi } from '../api/auth.api';
import { useAuthStore } from '@/store/auth.store';
import { getApiErrorMessage } from '@/lib/api/errors';

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(1, { message: 'Enter your password' }),
});

/** Only same-site paths, so a crafted login link can't send people to another site after signing in. */
function safeRedirect(target: string | null): string {
  return target && target.startsWith('/') && !target.startsWith('//') ? target : '/dashboard';
}

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    try {
      setIsLoading(true);
      const data = await authApi.login(values);
      
      setAuth(data.user, data.organization);
      toast.success('Signed in');
      router.push(safeRedirect(searchParams.get('redirect')));
      router.refresh();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't sign in. Try again."));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input 
          id="email" 
          placeholder="name@company.com" 
          {...register('email')} 
          aria-invalid={!!errors.email}
        />
        {errors.email && (
          <p className="text-sm font-medium text-red-500">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link href="/forgot-password" className="text-sm font-medium text-gray-600 underline-offset-4 hover:text-gray-900 hover:underline">
            Forgot password?
          </Link>
        </div>
        <Input 
          id="password" 
          type="password" 
          placeholder="••••••••" 
          {...register('password')} 
          aria-invalid={!!errors.password}
        />
        {errors.password && (
          <p className="text-sm font-medium text-red-500">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Signing in...' : 'Sign in'}
      </Button>

      <p className="text-center text-sm text-gray-600">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-medium text-gray-900 underline underline-offset-4 hover:text-black">
          Create one
        </Link>
      </p>
    </form>
  );
}
