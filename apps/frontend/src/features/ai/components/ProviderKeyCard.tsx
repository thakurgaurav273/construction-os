'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { formatDistanceToNow } from 'date-fns';
import { Badge, Button, Card, CardContent, Input } from '@sitepilot/ui';
import { CheckCircle2, ExternalLink, KeyRound, Trash2 } from 'lucide-react';
import { FormField } from '@/components/shared/FormField';
import { SecretInput } from '@/components/shared/SecretInput';
import { providerKeySchema, type ProviderKeyValues } from '../validation/ai.schema';

export interface ProviderKeyCardData {
  id: string;
  label: string;
  defaultModel: string;
  suggestedModels: string[];
  keyUrl: string;
  configured: boolean;
  keyHint: string | null;
  model: string;
  lastVerifiedAt: string | null;
  /** In use: the tenant's active provider, or the platform's default for trials. */
  selected: boolean;
}

interface ProviderKeyCardProps {
  provider: ProviderKeyCardData;
  selectedLabel: string;
  selectLabel: string;
  disabled?: boolean;
  /** An empty apiKey means only the model changed. */
  onSave: (values: { apiKey: string; model: string }) => Promise<void>;
  onRemove: () => Promise<void>;
  onSelect: () => Promise<void>;
}

/**
 * One provider's key. The key is write-only: once saved, only its last four characters come back from the
 * server. Saving always tests the key with the provider first.
 */
export function ProviderKeyCard({ provider, selectedLabel, selectLabel, disabled, onSave, onRemove, onSelect }: ProviderKeyCardProps): React.ReactElement {
  const [editing, setEditing] = useState(!provider.configured);
  const listId = `models-${provider.id}`;
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<ProviderKeyValues>({
    resolver: zodResolver(providerKeySchema),
    defaultValues: { apiKey: '', model: provider.model },
  });

  async function submit(values: ProviderKeyValues): Promise<void> {
    if (!values.apiKey && !provider.configured) {
      setError('apiKey', { message: 'Paste your API key' });
      return;
    }
    try {
      await onSave({ apiKey: values.apiKey, model: values.model });
      reset({ apiKey: '', model: values.model || provider.defaultModel });
      setEditing(false);
    } catch {
      // The caller shows the provider's reason; keep the form open so the admin can fix it.
    }
  }

  return (
    <Card className={provider.selected ? 'border-primary/50 ring-1 ring-primary/20' : undefined}>
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <p className="flex items-center gap-2 font-semibold">
              <KeyRound className="h-4 w-4 text-muted-foreground" /> {provider.label}
              {provider.selected && <Badge className="text-[10px]">{selectedLabel}</Badge>}
            </p>
            {provider.configured ? (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Key {provider.keyHint} · {provider.model}
                {provider.lastVerifiedAt && ` · verified ${formatDistanceToNow(new Date(provider.lastVerifiedAt), { addSuffix: true })}`}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Not connected.</p>
            )}
          </div>
          <a href={provider.keyUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
            Get a key <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {editing ? (
          <form onSubmit={handleSubmit(submit)} className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_220px_auto] sm:items-start" noValidate>
            <FormField label="API key" htmlFor={`key-${provider.id}`} error={errors.apiKey?.message}>
              <SecretInput
                id={`key-${provider.id}`}
                placeholder={provider.configured ? 'Leave empty to keep the saved key' : 'Paste your key'}
                disabled={disabled}
                {...register('apiKey')}
              />
            </FormField>
            <FormField label="Model" htmlFor={`model-${provider.id}`} error={errors.model?.message}>
              <Input id={`model-${provider.id}`} list={listId} placeholder={provider.defaultModel} disabled={disabled} {...register('model')} />
              <datalist id={listId}>{provider.suggestedModels.map((model) => <option key={model} value={model} />)}</datalist>
            </FormField>
            <div className="flex gap-2 sm:pt-6">
              <Button type="submit" disabled={disabled || isSubmitting}>{isSubmitting ? 'Testing…' : 'Save & test'}</Button>
              {provider.configured && <Button type="button" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>}
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap gap-2">
            {!provider.selected && <Button size="sm" disabled={disabled} onClick={() => { void onSelect(); }}>{selectLabel}</Button>}
            <Button size="sm" variant="outline" disabled={disabled} onClick={() => setEditing(true)}>Replace key or model</Button>
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" disabled={disabled} onClick={() => { void onRemove(); }}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
