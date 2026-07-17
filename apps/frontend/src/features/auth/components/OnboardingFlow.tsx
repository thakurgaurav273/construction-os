'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Building2, Globe, CheckCircle2 } from 'lucide-react';

import { Button, Input, Label } from '@sitepilot/ui';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '@/store/auth.store';

const CURRENCIES = [
  { value: 'INR', label: 'INR - Indian Rupee' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'AED', label: 'AED - UAE Dirham' },
  { value: 'SGD', label: 'SGD - Singapore Dollar' },
  { value: 'GBP', label: 'GBP - British Pound' },
];

const TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'IST - India (UTC+5:30)' },
  { value: 'Asia/Dubai', label: 'GST - Dubai (UTC+4)' },
  { value: 'Asia/Singapore', label: 'SGT - Singapore (UTC+8)' },
  { value: 'Europe/London', label: 'GMT - London (UTC+0)' },
  { value: 'America/New_York', label: 'EST - New York (UTC-5)' },
];

const detailsSchema = z.object({
  address: z.string().optional(),
  gstNumber: z.string().optional(),
  currency: z.string().min(1, 'Select a currency'),
  timezone: z.string().min(1, 'Select a timezone'),
});

type DetailsForm = z.infer<typeof detailsSchema>;

const STEPS = [
  { id: 1, label: 'Company details', icon: Building2 },
  { id: 2, label: 'Preferences', icon: Globe },
  { id: 3, label: 'All set', icon: CheckCircle2 },
];

export function OnboardingFlow() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const { register, handleSubmit, formState: { errors }, watch } = useForm<DetailsForm>({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      currency: 'INR',
      timezone: 'Asia/Kolkata',
    },
  });

  const formValues = watch();

  async function onSubmit(values: DetailsForm) {
    try {
      setIsLoading(true);
      await authApi.updateOrganization({
        address: values.address || undefined,
        gstNumber: values.gstNumber || undefined,
        currency: values.currency,
        timezone: values.timezone,
      });
      setStep(3);
    } catch {
      toast.error('Failed to save settings. You can update these later in Settings.');
      setStep(3);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Progress header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <span className="font-semibold text-gray-900">SitePilot</span>
          <div className="flex items-center gap-6">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isComplete = step > s.id;
              const isActive = step === s.id;
              return (
                <div key={s.id} className="flex items-center gap-2">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                      isComplete
                        ? 'bg-black text-white'
                        : isActive
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {isComplete ? <Icon className="h-3.5 w-3.5" /> : s.id}
                  </div>
                  <span
                    className={`hidden sm:block text-sm ${
                      isActive ? 'text-gray-900 font-medium' : 'text-gray-400'
                    }`}
                  >
                    {s.label}
                  </span>
                  {i < STEPS.length - 1 && (
                    <div className={`ml-2 h-px w-8 ${step > s.id ? 'bg-black' : 'bg-gray-200'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">

          {/* Step 1: Company details */}
          {step === 1 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                  Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
                </h1>
                <p className="mt-1 text-gray-500">
                  Let&apos;s set up your organization. This takes about a minute.
                </p>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="address">Office address</Label>
                  <textarea
                    id="address"
                    {...register('address')}
                    rows={3}
                    placeholder="123 Business Park, Mumbai, Maharashtra 400001"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
                  />
                  <p className="text-xs text-gray-400">Used on invoices and documents</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gstNumber">
                    GST / Tax number{' '}
                    <span className="text-gray-400 font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="gstNumber"
                    placeholder="22AAAAA0000A1Z5"
                    {...register('gstNumber')}
                    className="uppercase"
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <Button onClick={() => setStep(2)}>
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Preferences */}
          {step === 2 && (
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                <div className="mb-6">
                  <h1 className="text-2xl font-bold text-gray-900">Regional settings</h1>
                  <p className="mt-1 text-gray-500">
                    Set your currency and timezone for accurate reporting.
                  </p>
                </div>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <select
                      id="currency"
                      {...register('currency')}
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    {errors.currency && (
                      <p className="text-sm text-red-500">{errors.currency.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <select
                      id="timezone"
                      {...register('timezone')}
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    >
                      {TIMEZONES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    {errors.timezone && (
                      <p className="text-sm text-red-500">{errors.timezone.message}</p>
                    )}
                  </div>
                </div>

                <div className="mt-8 flex justify-between">
                  <Button type="button" variant="outline" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Saving...' : 'Finish setup'}
                  </Button>
                </div>
              </div>
            </form>
          )}

          {/* Step 3: Welcome */}
          {step === 3 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gray-900">
                <CheckCircle2 className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">You&apos;re all set!</h1>
              <p className="mt-2 text-gray-500 max-w-sm mx-auto">
                Your workspace is ready. Start by creating your first project.
              </p>

              <div className="mt-8 space-y-3">
                <Button className="w-full" onClick={() => router.push('/dashboard')}>
                  Go to dashboard
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push('/dashboard/projects')}
                >
                  Create first project
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
