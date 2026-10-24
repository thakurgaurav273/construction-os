'use client';

import React from 'react';
import { ArrowLeft, Lightbulb, PlayCircle } from 'lucide-react';
import { Badge, Button } from '@sitepilot/ui';
import type { GuideMatch } from '../help-utils';
import { useStartTour } from '../hooks/use-start-tour';

interface HelpGuideDetailProps {
  match: GuideMatch;
  onBack: () => void;
}

export function HelpGuideDetail({ match, onBack }: HelpGuideDetailProps): React.ReactElement {
  const { helpModule, guide } = match;
  const startTour = useStartTour();
  const tour = helpModule.tour;

  return (
    <article className="space-y-5" aria-labelledby="help-guide-title">
      <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" onClick={onBack}>
        <ArrowLeft className="mr-1.5 h-4 w-4" /> All guides
      </Button>
      <div className="space-y-2">
        <Badge variant="secondary" className="gap-1.5 font-normal">
          <helpModule.icon className="h-3 w-3" aria-hidden="true" /> {helpModule.title}
        </Badge>
        <h3 id="help-guide-title" className="text-lg font-semibold leading-snug">{guide.title}</h3>
        <p className="text-sm text-muted-foreground">{guide.summary}</p>
      </div>
      <ol className="space-y-3">
        {guide.steps.map((step, index) => (
          <li key={step} className="flex gap-3 text-sm">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary" aria-hidden="true">
              {index + 1}
            </span>
            <span className="pt-0.5 leading-relaxed">{step}</span>
          </li>
        ))}
      </ol>
      {guide.tip && (
        <p className="flex gap-2.5 rounded-lg border bg-muted/40 p-3 text-sm">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
          <span>{guide.tip}</span>
        </p>
      )}
      {tour && (
        <Button variant="outline" size="sm" onClick={() => startTour(tour)}>
          <PlayCircle className="mr-2 h-4 w-4" /> Take the {helpModule.title} tour
        </Button>
      )}
    </article>
  );
}
