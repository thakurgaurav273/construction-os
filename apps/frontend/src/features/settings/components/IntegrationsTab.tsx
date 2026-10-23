'use client';

import React from 'react';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from '@sitepilot/ui';
import { AlertTriangle, HardDrive, Mail, ShieldAlert, Sparkles, type LucideIcon } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { useCan } from '@/hooks/api/use-access';
import { useAiStatus, type AiProviderId, type AiStatus } from '@/hooks/api/use-ai';
import { useIntegrations, type Integration, type IntegrationState } from '@/hooks/api/use-settings';

const STATE_BADGES: Record<IntegrationState, { label: string; variant: 'success' | 'warning' | 'secondary' }> = {
  connected: { label: 'Connected', variant: 'success' },
  development: { label: 'Development only', variant: 'warning' },
  not_configured: { label: 'Not connected', variant: 'secondary' },
};

const ICONS: Record<Integration['id'], LucideIcon> = { email: Mail, storage: HardDrive };

const AI_PROVIDERS: Record<AiProviderId, string> = { GEMINI: 'Google Gemini', GROQ: 'Groq', HUGGINGFACE: 'Hugging Face' };

interface IntegrationRowProps {
  icon: LucideIcon;
  name: string;
  provider: string | null;
  state: IntegrationState;
  detail: string;
  action?: React.ReactNode;
}

function IntegrationRow({ icon: Icon, name, provider, state, detail, action }: IntegrationRowProps): React.ReactElement {
  const badge = STATE_BADGES[state];
  return (
    <li className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-background">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">{name}</p>
          {provider && <span className="text-xs text-muted-foreground">· {provider}</span>}
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{detail}</p>
      </div>
      {action}
    </li>
  );
}

function aiRow(status: AiStatus): IntegrationRowProps {
  const provider = status.provider ? AI_PROVIDERS[status.provider] : null;
  if (status.mode === 'OWN_KEY') {
    return { icon: Sparkles, name: 'AI assistant', provider, state: 'connected', detail: `Using your organization’s own key${status.model ? ` (${status.model})` : ''}.` };
  }
  if (status.mode === 'PLATFORM') {
    return {
      icon: Sparkles, name: 'AI assistant', provider, state: 'connected',
      detail: `Using SitePilot’s shared AI access: ${status.allowance.remaining} of ${status.allowance.granted} requests left.`,
    };
  }
  return { icon: Sparkles, name: 'AI assistant', provider: null, state: 'not_configured', detail: status.blockedReason ?? 'Add an API key or request trial access to turn on AI features.' };
}

/**
 * Settings → Integrations: the outside services SitePilot relies on and whether they're working. Email and
 * storage are set up on the server; AI is set up per organization in the AI tab.
 */
export function IntegrationsTab(): React.ReactElement {
  const canView = useCan()('organization.manage');
  const integrations = useIntegrations({ enabled: canView });
  const aiStatus = useAiStatus();

  if (!canView) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Integrations are restricted"
        description="Only owners and admins can see how this workspace is connected. Ask one of them if emails or uploads aren’t working."
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Integrations</CardTitle>
        <CardDescription>Services this workspace uses to send email, store files and power AI.</CardDescription>
      </CardHeader>
      <CardContent>
        {integrations.isLoading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-16 w-full" />)}</div>
        ) : integrations.isError || !integrations.data ? (
          <EmptyState
            icon={AlertTriangle}
            title="Unable to load integrations"
            description="Check your connection and try again."
            action={<Button variant="outline" onClick={() => integrations.refetch()}>Retry</Button>}
          />
        ) : (
          <>
            <ul className="divide-y rounded-xl border">
              {integrations.data.map((integration) => (
                <IntegrationRow key={integration.id} icon={ICONS[integration.id]} {...integration} />
              ))}
              {aiStatus.data && (
                <IntegrationRow
                  {...aiRow(aiStatus.data)}
                  action={<Button variant="outline" size="sm" className="self-start" asChild><a href="#ai">Manage</a></Button>}
                />
              )}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">Email and storage are configured by whoever hosts SitePilot for you, through server settings.</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
