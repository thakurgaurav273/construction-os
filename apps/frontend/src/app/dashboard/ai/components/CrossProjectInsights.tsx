'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge } from '@sitepilot/ui';
import { AlertTriangle, TrendingUp, Info, Building2, Sparkles } from 'lucide-react';
import type { CrossProjectInsight, InsightTone } from '../data/command-center-demo';

const TONE_ICON: Record<InsightTone, React.ComponentType<{ className?: string }>> = {
  critical: AlertTriangle,
  warning: AlertTriangle,
  positive: TrendingUp,
  info: Info,
};

const TONE_ICON_COLOR: Record<InsightTone, string> = {
  critical: 'text-red-500',
  warning: 'text-amber-500',
  positive: 'text-emerald-500',
  info: 'text-blue-500',
};

const TONE_ACCENT: Record<InsightTone, string> = {
  critical: 'border-l-red-500',
  warning: 'border-l-amber-500',
  positive: 'border-l-emerald-500',
  info: 'border-l-blue-500',
};

function InsightRow({ insight }: { insight: CrossProjectInsight }): React.ReactElement {
  const Icon = TONE_ICON[insight.tone];
  return (
    <div className={`rounded-lg border border-l-2 bg-card p-3.5 shadow-sm transition-colors hover:bg-accent/40 ${TONE_ACCENT[insight.tone]}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className={`h-4 w-4 shrink-0 ${TONE_ICON_COLOR[insight.tone]}`} />
          <span className="text-sm font-semibold truncate">{insight.title}</span>
        </div>
        <Badge variant="secondary" className="h-5 shrink-0 text-[10px] font-medium">
          {insight.impact}
        </Badge>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{insight.body}</p>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-xs text-muted-foreground min-w-0">
          <Building2 className="h-3 w-3 shrink-0" />
          <span className="truncate">{insight.project}</span>
        </span>
        <span className="text-[11px] font-medium text-muted-foreground shrink-0">
          {insight.confidence}% confidence
        </span>
      </div>
    </div>
  );
}

interface CrossProjectInsightsProps {
  insights: CrossProjectInsight[];
}

export function CrossProjectInsights({ insights }: CrossProjectInsightsProps): React.ReactElement {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          Cross-Project AI Insights
        </CardTitle>
        <CardDescription>Signals detected across the portfolio, ranked by urgency</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2">
          {insights.map((insight) => (
            <InsightRow key={insight.id} insight={insight} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
