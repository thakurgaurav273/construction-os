'use client';

import React from 'react';
import { toast } from 'sonner';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from '@sitepilot/ui';
import { AlertTriangle } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  useNotificationPreferences, useUpdateNotificationPreferences, type NotificationPreference,
} from '@/hooks/api/use-notifications';
import { getApiErrorMessage } from '@/lib/api/errors';

type Channel = 'inApp' | 'email';

function Toggle({ checked, label, disabled, onChange }: { checked: boolean; label: string; disabled: boolean; onChange: (checked: boolean) => void }): React.ReactElement {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${checked ? 'bg-primary' : 'bg-muted-foreground/30'}`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-background shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  );
}

/** Settings → Notifications: per-category choice of in-app and email delivery. Saved as soon as a switch changes. */
export function NotificationPreferencesTab(): React.ReactElement {
  const { data: preferences, isLoading, isError, refetch } = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();

  async function change(preference: NotificationPreference, channel: Channel, value: boolean): Promise<void> {
    try {
      await updatePreferences.mutateAsync([{ category: preference.category, inApp: preference.inApp, email: preference.email, [channel]: value }]);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't save your preference. Try again."));
    }
  }

  if (isLoading) {
    return <Card><CardContent className="space-y-3 p-6">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-12 w-full" />)}</CardContent></Card>;
  }

  if (isError || !preferences) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Unable to load your notification settings"
        description="Check your connection and try again."
        action={<Button variant="outline" onClick={() => refetch()}>Retry</Button>}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>Choose how you hear about things in this organization. These settings are yours alone.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-[minmax(0,1fr)_64px_64px] items-center gap-x-4 border-b pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <span>Category</span>
          <span className="text-center">In app</span>
          <span className="text-center">Email</span>
        </div>
        <ul className="divide-y">
          {preferences.map((preference) => (
            <li key={preference.category} className="grid grid-cols-[minmax(0,1fr)_64px_64px] items-center gap-x-4 py-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">{preference.label}</p>
                <p className="text-xs text-muted-foreground">{preference.description}</p>
              </div>
              <div className="flex justify-center">
                <Toggle
                  checked={preference.inApp}
                  label={`${preference.label}: in-app notifications`}
                  disabled={updatePreferences.isPending}
                  onChange={(value) => { void change(preference, 'inApp', value); }}
                />
              </div>
              <div className="flex justify-center">
                <Toggle
                  checked={preference.email}
                  label={`${preference.label}: email`}
                  disabled={updatePreferences.isPending}
                  onChange={(value) => { void change(preference, 'email', value); }}
                />
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
