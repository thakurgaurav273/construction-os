'use client';

import React from 'react';
import { AlertTriangle, TrendingUp, Sparkles, Info } from 'lucide-react';
import type { AiInsight, InsightTone } from '@/data/procurement-demo';

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

interface AiInsightCardProps {
  insight: AiInsight;
}

export function AiInsightCard({ insight }: AiInsightCardProps): React.ReactElement {
  const Icon = TONE_ICON[insight.tone];
  return (
    <div className="bg-card border rounded-lg p-3 shadow-sm">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className={`h-3.5 w-3.5 shrink-0 ${TONE_ICON_COLOR[insight.tone]}`} />
        <span className="text-xs font-semibold">{insight.title}</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{insight.body}</p>
    </div>
  );
}

interface AiInsightPanelProps {
  insights: AiInsight[];
  title?: string;
  subtitle?: string;
  className?: string;
}

/** Sticky right-rail panel that matches the Workforce "AI Insights" signature block. */
export function AiInsightPanel({
  insights,
  title = 'AI Procurement Insights',
  subtitle = 'Real-time procurement intelligence',
  className = '',
}: AiInsightPanelProps): React.ReactElement {
  return (
    <div className={`border border-primary/20 bg-primary/5 rounded-xl overflow-hidden relative ${className}`}>
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <Sparkles size={100} />
      </div>
      <div className="p-4 pb-2 relative z-10">
        <div className="flex items-center gap-2 text-primary text-sm font-semibold">
          <Sparkles className="h-4 w-4" />
          {title}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </div>
      <div className="p-4 pt-2 space-y-3 relative z-10">
        {insights.map((insight) => (
          <AiInsightCard key={insight.id} insight={insight} />
        ))}
      </div>
    </div>
  );
}
