'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { thinkingSteps } from '../utils/thinking-steps';

/** Long enough to read each step; the last one ("Writing the answer") stays until the reply lands. */
const STEP_INTERVAL_MS = 1600;

export function AiThinkingIndicator({ question }: { question: string }): React.ReactElement {
  const steps = useMemo(() => thinkingSteps(question), [question]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    setCurrent(0);
    const timer = setInterval(() => {
      setCurrent((index) => Math.min(index + 1, steps.length - 1));
    }, STEP_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [steps]);

  return (
    <div className="flex gap-3" role="status" aria-live="polite">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-violet-600">
        <Sparkles className="h-3.5 w-3.5 animate-pulse" />
      </div>
      <div className="min-w-0 space-y-1.5 pt-1">
        {steps.slice(0, current).map((step) => (
          <p key={step} className="flex items-center gap-2 text-xs text-muted-foreground">
            <Check className="h-3 w-3 text-emerald-600" /> {step}
          </p>
        ))}
        <p key={steps[current]} className="animate-in fade-in slide-in-from-bottom-1 text-sm font-medium text-foreground duration-200">
          <span className="animate-pulse">{steps[current]}…</span>
        </p>
      </div>
    </div>
  );
}
