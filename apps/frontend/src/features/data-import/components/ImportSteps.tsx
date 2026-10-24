import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@sitepilot/ui';

export type WizardStep = 'upload' | 'map' | 'review' | 'done';

const STEPS: { id: WizardStep; label: string }[] = [
  { id: 'upload', label: 'Upload' },
  { id: 'map', label: 'Map columns' },
  { id: 'review', label: 'Review' },
  { id: 'done', label: 'Done' },
];

export function ImportSteps({ current }: { current: WizardStep }): React.ReactElement {
  const currentIndex = STEPS.findIndex((step) => step.id === current);
  return (
    <ol className="flex flex-wrap items-center gap-2 text-sm" aria-label="Import progress">
      {STEPS.map((step, index) => {
        const complete = index < currentIndex;
        const active = index === currentIndex;
        return (
          <li key={step.id} className="flex items-center gap-2" aria-current={active ? 'step' : undefined}>
            <span
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full border text-xs font-medium',
                complete && 'border-primary bg-primary text-primary-foreground',
                active && 'border-primary text-primary',
                !complete && !active && 'text-muted-foreground',
              )}
            >
              {complete ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </span>
            <span className={cn(active ? 'font-medium text-foreground' : 'text-muted-foreground')}>{step.label}</span>
            {index < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-border" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}
