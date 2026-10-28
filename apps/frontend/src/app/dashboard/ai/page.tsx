'use client';

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { Badge, Button, Card, CardContent, Skeleton, cn } from '@sitepilot/ui';
import { AlertOctagon, AlertTriangle, Info, MessageSquare, RefreshCw, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { AiUnavailableNotice } from '@/features/ai/components/AiUnavailableNotice';
import { useAiInsights, useAiStatus, useRefreshAiInsights, type AiInsight } from '@/hooks/api/use-ai';
import { getApiErrorMessage } from '@/lib/api/errors';
import { PageAction, PageHeader } from '@/components/shared/PageHeader';

const SEVERITY: Record<AiInsight['severity'], { icon: LucideIcon; label: string; className: string }> = {
  critical: { icon: AlertOctagon, label: 'Critical', className: 'border-red-200 bg-red-50/60 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300' },
  warning: { icon: AlertTriangle, label: 'Needs attention', className: 'border-amber-200 bg-amber-50/60 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300' },
  info: { icon: Info, label: 'FYI', className: 'border-blue-200 bg-blue-50/60 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300' },
};

const ORDER: AiInsight['severity'][] = ['critical', 'warning', 'info'];

function InsightCard({ insight }: { insight: AiInsight }): React.ReactElement {
  const severity = SEVERITY[insight.severity];
  const Icon = severity.icon;
  return (
    <Card className={cn('border', severity.className)}>
      <CardContent className="flex gap-3 p-4">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-foreground">{insight.title}</p>
            <Badge variant="outline" className="text-[10px] capitalize">{insight.area}</Badge>
            {insight.project && <Badge variant="secondary" className="text-[10px]">{insight.project}</Badge>}
          </div>
          <p className="text-sm text-foreground/80">{insight.detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/** AI Command Center: model-written insights from the organization's live data, refreshed on demand. */
export default function AiCommandCenterPage(): React.ReactElement {
  const { data: status, isLoading: statusLoading } = useAiStatus();
  const { data: snapshot, isLoading, isError, refetch } = useAiInsights();
  const refresh = useRefreshAiInsights();

  async function regenerate(): Promise<void> {
    try {
      await refresh.mutateAsync();
      toast.success('Insights updated');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Couldn’t generate insights. Try again.'));
    }
  }

  const sorted = [...(snapshot?.insights ?? [])].sort((a, b) => ORDER.indexOf(a.severity) - ORDER.indexOf(b.severity));
  const unavailable = status?.mode === 'NONE' ? status.blockedReason : null;

  return (
    <div className="mx-auto max-w-5xl flex-1 space-y-6 p-4 pt-6 md:p-8">
      <PageHeader
        title={<span className="flex items-center gap-2"><Sparkles className="h-6 w-6 text-violet-500" /> AI Command Center</span>}
        description="What needs attention across your projects, written by AI from live budgets, schedules, approvals, deliveries, stock and attendance."
        actions={(
          <>
            <PageAction icon={MessageSquare} label="Ask a question" href="/dashboard/ai-assistant" />
            {!unavailable && (
              <PageAction
                primary
                icon={RefreshCw}
                label={snapshot ? 'Refresh' : 'Generate insights'}
                onClick={() => { void regenerate(); }}
                disabled={refresh.isPending}
                className={cn(refresh.isPending && '[&_svg]:animate-spin')}
              />
            )}
          </>
        )}
      />

      {snapshot && (
        <p className="text-xs text-muted-foreground">
          Generated {formatDistanceToNow(new Date(snapshot.generatedAt), { addSuffix: true })} by {snapshot.model}. AI can be wrong; check figures before acting.
        </p>
      )}

      {statusLoading || isLoading || refresh.isPending ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-24 w-full rounded-xl" />)}</div>
      ) : isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="Unable to load insights"
          description="Check your connection and try again."
          action={<Button variant="outline" onClick={() => refetch()}>Retry</Button>}
        />
      ) : sorted.length > 0 ? (
        <div className="space-y-3">{sorted.map((insight, index) => <InsightCard key={`${insight.title}-${index}`} insight={insight} />)}</div>
      ) : unavailable ? (
        <AiUnavailableNotice reason={unavailable} />
      ) : (
        <EmptyState
          icon={Sparkles}
          title="No insights yet"
          description="Generate insights to see budget, schedule, procurement and stock risks across your projects."
          action={<Button onClick={() => { void regenerate(); }}>Generate insights</Button>}
        />
      )}
    </div>
  );
}
