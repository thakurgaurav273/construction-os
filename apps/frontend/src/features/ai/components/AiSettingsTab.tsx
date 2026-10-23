'use client';

import React from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from '@sitepilot/ui';
import { AlertTriangle, ShieldCheck, Sparkles } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { useCan } from '@/hooks/api/use-access';
import {
  useAiSettings, useRemoveAiKey, useSaveAiKey, useSelectAiProvider, useUpdateAiModel, type AiProviderId, type AiStatus,
} from '@/hooks/api/use-ai';
import { getApiErrorMessage } from '@/lib/api/errors';
import { ProviderKeyCard } from './ProviderKeyCard';
import { AiAccessRequestCard } from './AiAccessRequestCard';

function StatusSummary({ status }: { status: AiStatus }): React.ReactElement {
  if (status.mode === 'OWN_KEY') {
    return <p className="text-sm">AI is on, using <span className="font-medium">your own {status.provider?.toLowerCase()} key</span> ({status.model}). Usage is billed by your provider.</p>;
  }
  if (status.mode === 'PLATFORM') {
    return (
      <p className="text-sm">
        AI is on, using <span className="font-medium">SitePilot&apos;s key</span>: {status.allowance.remaining} of {status.allowance.granted} requests left
        {status.allowance.expiresAt && ` until ${format(new Date(status.allowance.expiresAt), 'dd MMM yyyy')}`}.
      </p>
    );
  }
  return <p className="text-sm text-muted-foreground">{status.blockedReason}</p>;
}

/** Settings → AI: bring your own provider key, or request SitePilot's AI on a trial / top-up. */
export function AiSettingsTab(): React.ReactElement {
  const canManage = useCan()('ai.manage');
  const { data: settings, isLoading, isError, refetch } = useAiSettings(canManage);
  const saveKey = useSaveAiKey();
  const updateModel = useUpdateAiModel();
  const removeKey = useRemoveAiKey();
  const selectProvider = useSelectAiProvider();

  if (!canManage) {
    return <EmptyState icon={Sparkles} title="AI settings are managed by admins" description="Ask an organization owner or admin to connect an AI provider or request a trial." />;
  }
  if (isLoading) return <div className="space-y-4">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-32 w-full rounded-xl" />)}</div>;
  if (isError || !settings) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Unable to load AI settings"
        description="Check your connection and try again."
        action={<Button variant="outline" onClick={() => refetch()}>Retry</Button>}
      />
    );
  }

  async function run(action: () => Promise<unknown>, success: string, fallback: string): Promise<void> {
    try {
      await action();
      toast.success(success);
    } catch (error) {
      toast.error(getApiErrorMessage(error, fallback));
      throw error;
    }
  }

  const label = (provider: AiProviderId): string => settings.providers.find((card) => card.id === provider)?.label ?? provider;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-violet-500" /> AI</CardTitle>
          <CardDescription>Powers the project assistant, daily report summaries and AI insights.</CardDescription>
        </CardHeader>
        <CardContent><StatusSummary status={settings.status} /></CardContent>
      </Card>

      <div className="space-y-3">
        <div>
          <h3 className="text-base font-semibold">Your own API keys</h3>
          <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            Keys are tested with the provider, encrypted before they&apos;re stored, and never shown again; only the last four characters are displayed.
          </p>
        </div>
        {!settings.encryptionReady && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200" role="alert">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Keys can&apos;t be saved until the server has an encryption key (AI_KEYS_ENCRYPTION_KEY). Ask whoever runs SitePilot for your company.
          </div>
        )}
        {settings.providers.map((card) => (
          <ProviderKeyCard
            key={card.id}
            disabled={!settings.encryptionReady}
            selectedLabel="In use"
            selectLabel="Use this provider"
            provider={{ ...card, ...card.credential, selected: card.credential.active }}
            onSave={({ apiKey, model }) => (apiKey
              ? run(() => saveKey.mutateAsync({ provider: card.id, apiKey, model }), `${card.label} key saved and verified`, `Couldn’t save the ${card.label} key.`)
              : run(() => updateModel.mutateAsync({ provider: card.id, model: model || card.defaultModel }), 'Model updated', 'Couldn’t change the model.'))}
            onRemove={() => run(() => removeKey.mutateAsync(card.id), `${card.label} key removed`, 'Couldn’t remove the key.').catch(() => undefined)}
            onSelect={() => run(() => selectProvider.mutateAsync(card.id), `Now using ${label(card.id)}`, 'Couldn’t switch provider.').catch(() => undefined)}
          />
        ))}
      </div>

      <AiAccessRequestCard settings={settings} />
    </div>
  );
}
