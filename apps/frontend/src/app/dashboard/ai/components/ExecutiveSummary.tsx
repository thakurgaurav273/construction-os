'use client';

import React from 'react';
import { Button } from '@sitepilot/ui';
import { Sparkles, ArrowRight } from 'lucide-react';
import type { ExecutiveSummaryData } from '../data/command-center-demo';

interface ExecutiveSummaryProps {
  data: ExecutiveSummaryData;
  onAsk?: () => void;
}

/**
 * Full-width AI narrative banner - the signature "executive summary" block.
 * Reuses the primary-tinted gradient + Sparkles motif from the dashboard and
 * procurement AI panels so it reads as one system.
 */
export function ExecutiveSummary({ data, onAsk }: ExecutiveSummaryProps): React.ReactElement {
  return (
    <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 md:p-6">
      <div className="absolute -right-6 -top-6 opacity-[0.07] pointer-events-none">
        <Sparkles size={160} />
      </div>
      <div className="relative z-10 space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="h-4 w-4" />
          <span className="text-sm font-semibold">Executive Summary</span>
          <span className="text-xs text-muted-foreground">· {data.generatedAtLabel}</span>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg md:text-xl font-semibold tracking-tight max-w-3xl">
            {data.headline}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
            {data.narrative}
          </p>
        </div>

        <ul className="grid gap-2 sm:grid-cols-2 max-w-4xl">
          {data.highlights.map((highlight) => (
            <li key={highlight} className="flex items-start gap-2 text-sm">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span className="text-muted-foreground leading-relaxed">{highlight}</span>
            </li>
          ))}
        </ul>

        <div className="pt-1">
          <Button size="sm" onClick={onAsk}>
            Ask AI a follow-up
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
