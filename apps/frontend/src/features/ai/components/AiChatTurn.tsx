'use client';

import React from 'react';
import { cn } from '@sitepilot/ui';
import { Sparkles, User } from 'lucide-react';
import type { ChatTurn } from '@/hooks/api/use-ai';
import { SafeMarkdown } from './SafeMarkdown';

export function AiChatTurn({ turn }: { turn: ChatTurn }): React.ReactElement {
  const isUser = turn.role === 'user';
  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      <div className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full', isUser ? 'bg-primary text-primary-foreground' : 'bg-violet-500/10 text-violet-600')}>
        {isUser ? <User className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
      </div>
      <div className={cn('max-w-[85%] rounded-2xl px-4 py-2.5', isUser ? 'rounded-tr-sm bg-primary text-primary-foreground' : 'rounded-tl-sm bg-muted/60')}>
        {isUser ? <p className="whitespace-pre-wrap text-sm">{turn.content}</p> : <SafeMarkdown content={turn.content} />}
      </div>
    </div>
  );
}
