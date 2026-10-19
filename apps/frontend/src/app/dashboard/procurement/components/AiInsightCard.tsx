'use client';

import React from 'react';
import { Skeleton } from '@sitepilot/ui';
import { AlertTriangle, TrendingUp, Sparkles, Info, ChevronRight } from 'lucide-react';
import type { InsightTone, ProcurementInsight } from '@/features/procurement/utils/insights';

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
  insight: ProcurementInsight;
  onSelect?: (insight: ProcurementInsight) => void;
}

export function AiInsightCard({ insight, onSelect }: AiInsightCardProps): React.ReactElement {
  const Icon = TONE_ICON[insight.tone];
  const content = (
    <>
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className={`h-3.5 w-3.5 shrink-0 ${TONE_ICON_COLOR[insight.tone]}`} />
        <span className="text-xs font-semibold flex-1">{insight.title}</span>
        {insight.target && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{insight.body}</p>
    </>
  );

  if (insight.target && onSelect) {
    return (
      <button
        type="button"
        onClick={() => onSelect(insight)}
        className="w-full text-left bg-card border rounded-lg p-3 shadow-sm transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {content}
      </button>
    );
  }
  return <div className="bg-card border rounded-lg p-3 shadow-sm">{content}</div>;
}

interface AiInsightPanelProps {
  insights: ProcurementInsight[] | undefined;
  onSelect?: (insight: ProcurementInsight) => void;
  title?: string;
  subtitle?: string;
  className?: string;
}

/** Sticky right-rail panel that matches the Workforce "AI Insights" signature block. */
export function AiInsightPanel({
  insights,
  onSelect,
  title = 'AI Procurement Insights',
  subtitle = 'What needs your attention right now',
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
        {insights
          ? insights.map((insight) => <AiInsightCard key={insight.id} insight={insight} onSelect={onSelect} />)
          : Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-20 w-full rounded-lg" />)}
      </div>
    </div>
  );
}
