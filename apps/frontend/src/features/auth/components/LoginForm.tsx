'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

import { Button, Input, Label } from '@sitepilot/ui';

import { authApi } from '../api/auth.api';
import { useAuthStore } from '@/store/auth.store';

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
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
      
      // Store in Zustand
      setAuth(data.user, data.accessToken, data.organization);
      
      // We also need to set the refresh token somewhere (e.g., localStorage or cookies)
      // Usually nextjs middleware expects `access_token` in cookies
      document.cookie = `access_token=${data.accessToken}; path=/; max-age=86400`;
      localStorage.setItem('access_token', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);

      toast.success('Logged in successfully');
      router.push('/dashboard');
      router.refresh(); // Important for middleware to pick up the new cookie
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to login');
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
        <Label htmlFor="password">Password</Label>
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
