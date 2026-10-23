'use client';

import React from 'react';
import { cn } from '@sitepilot/ui';
import { ArrowUpRight, Sparkles } from 'lucide-react';

interface AiChatEmptyStateProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
}

export function AiChatEmptyState({ suggestions, onSelect }: AiChatEmptyStateProps): React.ReactElement {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 py-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/15 to-indigo-500/15 text-violet-600 ring-1 ring-violet-500/20 dark:text-violet-400">
          <Sparkles className="h-6 w-6" />
        </div>
        <h3 className="text-xl font-semibold tracking-tight">What would you like to know?</h3>
        <p className="max-w-md text-sm text-muted-foreground">
          Answers come from your live SitePilot data. The assistant says so when the data doesn&apos;t cover a question.
        </p>
      </div>
      <div className="grid w-full gap-2.5 sm:grid-cols-2">
        {suggestions.map((suggestion, index) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onSelect(suggestion)}
            className={cn(
              'group flex items-start justify-between gap-3 rounded-xl border bg-background p-3.5 text-left text-sm transition-colors hover:border-violet-500/40 hover:bg-violet-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              // An odd last card spans the row so the grid has no gap.
              suggestions.length % 2 === 1 && index === suggestions.length - 1 && 'sm:col-span-2',
            )}
          >
            <span className="text-foreground/90">{suggestion}</span>
            <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-violet-600" />
          </button>
        ))}
      </div>
    </div>
  );
}
