'use client';

import React from 'react';
import { toast } from 'sonner';
import { Button, Skeleton } from '@sitepilot/ui';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { ProviderKeyCard } from '@/features/ai/components/ProviderKeyCard';
import { useMakePlatformDefault, usePlatformProviders, useRemovePlatformKey, useSavePlatformKey } from '@/hooks/api/use-platform';
import { getApiErrorMessage } from '@/lib/api/errors';

/** SitePilot's own provider keys. The default one pays for every approved trial and top-up. */
export function PlatformKeysPanel(): React.ReactElement {
  const { data, isLoading, isError, refetch } = usePlatformProviders();
  const save = useSavePlatformKey();
  const makeDefault = useMakePlatformDefault();
  const remove = useRemovePlatformKey();

  if (isLoading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-28 w-full rounded-xl" />)}</div>;
  if (isError || !data) return <EmptyState icon={AlertTriangle} title="Unable to load platform keys" description="Check your connection and try again." action={<Button variant="outline" onClick={() => refetch()}>Retry</Button>} />;

  async function run(action: () => Promise<unknown>, success: string, fallback: string): Promise<void> {
    try {
      await action();
      toast.success(success);
    } catch (error) {
      toast.error(getApiErrorMessage(error, fallback));
      throw error;
    }
  }

  return (
    <div className="space-y-3">
      <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        Tenants on an approved trial or top-up use the default key below. Keys are encrypted at rest and never shown again.
      </p>
      {!data.encryptionReady && (
        <p className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200" role="alert">
          Set AI_KEYS_ENCRYPTION_KEY on the server (e.g. <code>openssl rand -base64 32</code>) before saving keys.
        </p>
      )}
      {data.providers.map((provider) => (
        <ProviderKeyCard
          key={provider.id}
          disabled={!data.encryptionReady}
          selectedLabel="Default for trials"
          selectLabel="Make default"
          provider={{ ...provider, selected: provider.isDefault }}
          onSave={({ apiKey, model }) => run(
            () => save.mutateAsync({ provider: provider.id, apiKey, model }),
            `${provider.label} key saved and verified`,
            `Couldn’t save the ${provider.label} key.`,
          )}
          onRemove={() => run(() => remove.mutateAsync(provider.id), 'Key removed', 'Couldn’t remove the key.').catch(() => undefined)}
          onSelect={() => run(() => makeDefault.mutateAsync(provider.id), `${provider.label} is now the trial default`, 'Couldn’t change the default.').catch(() => undefined)}
        />
      ))}
    </div>
  );
}
