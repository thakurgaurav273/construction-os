'use client';

import React from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Lightbulb } from 'lucide-react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from '@sitepilot/ui';
import { AiInsightCard, type InsightTone } from '@/components/shared/AiInsightPanel';
import { useAiInsights, type AiInsight } from '@/hooks/api/use-ai';

const TONES: Record<AiInsight['severity'], InsightTone> = { critical: 'critical', warning: 'warning', info: 'info' };
const SHOWN = 3;

/** The latest AI Command Center snapshot; generating a new one happens on the AI Insights page. */
export function InsightsCard(): React.ReactElement {
  const { data: snapshot, isLoading } = useAiInsights();

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-3">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base text-primary"><Lightbulb className="h-4 w-4" /> AI insights</CardTitle>
          <CardDescription>
            {snapshot ? `Updated ${formatDistanceToNow(new Date(snapshot.generatedAt), { addSuffix: true })}` : 'What needs attention across your projects.'}
          </CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild><Link href="/dashboard/ai">View all</Link></Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && Array.from({ length: 2 }).map((_, index) => <Skeleton key={index} className="h-16 w-full rounded-lg" />)}
        {!isLoading && !snapshot && (
          <p className="text-sm text-muted-foreground">
            No insights yet. <Link href="/dashboard/ai" className="font-medium text-primary underline-offset-4 hover:underline">Generate them</Link> from your live data.
          </p>
        )}
        {snapshot?.insights.slice(0, SHOWN).map((insight, index) => (
          <AiInsightCard
            key={`${insight.title}-${index}`}
            insight={{ id: String(index), tone: TONES[insight.severity], title: insight.title, body: insight.detail }}
          />
        ))}
      </CardContent>
    </Card>
  );
}
