'use client';

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@sitepilot/ui';
import { Brain, Radar, CheckCircle2, FileText, Wand2 } from 'lucide-react';
import type { TimelineEvent, TimelineKind } from '../data/command-center-demo';

const KIND_ICON: Record<TimelineKind, React.ComponentType<{ className?: string }>> = {
  prediction: Brain,
  detection: Radar,
  approval: CheckCircle2,
  report: FileText,
  optimization: Wand2,
};

const KIND_COLOR: Record<TimelineKind, string> = {
  prediction: 'text-violet-500',
  detection: 'text-amber-500',
  approval: 'text-emerald-500',
  report: 'text-blue-500',
  optimization: 'text-primary',
};

interface OrganizationTimelineProps {
  events: TimelineEvent[];
}

/**
 * Chronological org-wide feed of AI activity. Relative timestamps are rendered
 * client-side only (the page gates on mount), so `formatDistanceToNow` never
 * causes a hydration mismatch.
 */
export function OrganizationTimeline({ events }: OrganizationTimelineProps): React.ReactElement {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Organization Timeline</CardTitle>
        <CardDescription>AI activity across every project</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-0">
          {events.map((event, index) => {
            const Icon = KIND_ICON[event.kind];
            const isLast = index === events.length - 1;
            return (
              <div key={event.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-muted">
                    <Icon className={`h-4 w-4 ${KIND_COLOR[event.kind]}`} />
                  </div>
                  {!isLast && <span className="w-px flex-1 bg-border" />}
                </div>
                <div className={`min-w-0 flex-1 ${isLast ? 'pb-0' : 'pb-5'}`}>
                  <p className="text-sm font-medium leading-snug">{event.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{event.detail}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {event.project} · {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
