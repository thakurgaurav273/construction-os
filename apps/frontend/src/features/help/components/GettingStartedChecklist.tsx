'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle2, ChevronRight, Circle, PartyPopper, X } from 'lucide-react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Progress, cn } from '@sitepilot/ui';
import { useCan } from '@/hooks/api/use-access';
import { useDismissChecklist, useHelpProgress } from '@/hooks/api/use-help';
import { visibleChecklistSteps } from '../checklist';
import { GuideLink } from './GuideLink';

/** First steps for a new organization, ticked off from real data. Hidden once dismissed or for read-only roles. */
export function GettingStartedChecklist(): React.ReactElement | null {
  const can = useCan();
  const { data: progress } = useHelpProgress();
  const dismiss = useDismissChecklist();
  const steps = visibleChecklistSteps(can);

  if (!progress || progress.checklist.dismissed || steps.length === 0) return null;

  const doneCount = steps.filter((step) => progress.checklist.steps[step.key]).length;
  const allDone = doneCount === steps.length;

  return (
    <Card data-tour="dashboard-checklist">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-3">
        <div className="space-y-1">
          <CardTitle className="text-base">{allDone ? 'You’re all set' : 'Get started with SitePilot'}</CardTitle>
          <CardDescription>
            {allDone ? 'Your team is up and running. You can dismiss this checklist.' : `${doneCount} of ${steps.length} done. Each step ticks off when it happens.`}
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="-mr-2 -mt-1 h-8 w-8 shrink-0 text-muted-foreground"
          aria-label="Dismiss getting-started checklist"
          onClick={() => dismiss.mutate(true)}
          disabled={dismiss.isPending}
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={(doneCount / steps.length) * 100} aria-label={`${doneCount} of ${steps.length} steps done`} />
        {allDone ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <PartyPopper className="h-4 w-4 text-primary" aria-hidden="true" /> Every step is done.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {steps.map((step) => {
              const done = progress.checklist.steps[step.key];
              return (
                <li key={step.key} className={cn('flex items-start gap-3 rounded-lg border p-3', done && 'bg-muted/40')}>
                  {done
                    ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-label="Done" />
                    : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" aria-label="Not done yet" />}
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm font-medium', done && 'text-muted-foreground line-through')}>{step.label}</p>
                    {!done && (
                      <>
                        <p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>
                        <div className="mt-2 flex items-center gap-3">
                          <Link href={step.href} className="inline-flex items-center text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
                            Start <ChevronRight className="h-3 w-3" aria-hidden="true" />
                          </Link>
                          <GuideLink guideId={step.guideId} label="How" className="text-xs [&_svg]:h-3 [&_svg]:w-3" />
                        </div>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
