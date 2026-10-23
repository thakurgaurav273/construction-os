'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@sitepilot/ui';
import { Sparkles } from 'lucide-react';
import { useCan } from '@/hooks/api/use-access';

/** Explains why AI is off and, for people who can fix it, links to Settings → AI. */
export function AiUnavailableNotice({ reason, compact = false }: { reason: string; compact?: boolean }): React.ReactElement {
  const canManage = useCan()('ai.manage');
  return (
    <div className={`flex ${compact ? 'items-center gap-3' : 'flex-col items-center gap-3 py-10 text-center'} rounded-xl border border-dashed bg-muted/20 p-4`}>
      <Sparkles className={`${compact ? 'h-4 w-4' : 'h-8 w-8'} shrink-0 text-violet-500`} />
      <p className={`text-sm text-muted-foreground ${compact ? 'flex-1' : 'max-w-md'}`}>
        {reason}
        {!canManage && ' Ask an organization admin to set it up.'}
      </p>
      {canManage && (
        <Button asChild size="sm" variant={compact ? 'outline' : 'default'}>
          <Link href="/dashboard/settings#ai">Set up AI</Link>
        </Button>
      )}
    </div>
  );
}
