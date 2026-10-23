'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import { useCan } from '@/hooks/api/use-access';

interface AiSummaryToggleProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** Only offered to members who can use AI; the summary uses the organization's AI allowance. */
export function AiSummaryToggle({ id, checked, onChange }: AiSummaryToggleProps): React.ReactElement | null {
  const canUseAi = useCan()('ai.use');
  if (!canUseAi) return null;
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3">
      <input id={id} type="checkbox" className="mt-0.5 h-4 w-4 rounded" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="space-y-0.5">
        <span className="flex items-center gap-1.5 text-sm font-medium"><Sparkles className="h-3.5 w-3.5 text-primary" /> Add an AI summary</span>
        <span className="block text-xs text-muted-foreground">A short narrative of the key findings at the top of the report. Skipped if AI isn’t available.</span>
      </span>
    </label>
  );
}
