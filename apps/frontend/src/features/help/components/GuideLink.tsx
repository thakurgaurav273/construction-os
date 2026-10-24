'use client';

import React from 'react';
import { BookOpen, CircleHelp } from 'lucide-react';
import { cn } from '@sitepilot/ui';
import { useHelpStore } from '@/store/help.store';
import { findGuide } from '../help-utils';
import { useVisibleHelpModules } from '../hooks/use-visible-help';

interface GuideLinkProps {
  guideId: string;
  /** Text link such as "Learn how contracts work"; without it, a compact "?" icon button. */
  label?: string;
  className?: string;
}

/** Opens a guide in the help center. Renders nothing when the member's role hides that guide. */
export function GuideLink({ guideId, label, className }: GuideLinkProps): React.ReactElement | null {
  const openHelp = useHelpStore((state) => state.openHelp);
  const match = findGuide(useVisibleHelpModules(), guideId);
  if (!match) return null;

  if (label) {
    return (
      <button
        type="button"
        onClick={() => openHelp(guideId)}
        className={cn('inline-flex items-center gap-1.5 rounded text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', className)}
      >
        <BookOpen className="h-4 w-4" aria-hidden="true" /> {label}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => openHelp(guideId)}
      aria-label={`Help: ${match.guide.title}`}
      title={match.guide.title}
      className={cn('inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring print:hidden', className)}
    >
      <CircleHelp className="h-4 w-4" />
    </button>
  );
}
