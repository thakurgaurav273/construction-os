'use client';

import React, { useEffect, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { Button, Skeleton, Textarea, cn } from '@sitepilot/ui';
import { AlertTriangle, ArrowUp, RotateCcw, Sparkles, SquarePen, User } from 'lucide-react';
import { useAiChat, useAiStatus, type ChatTurn } from '@/hooks/api/use-ai';
import { getApiErrorMessage } from '@/lib/api/errors';
import { SafeMarkdown } from './SafeMarkdown';
import { AiUnavailableNotice } from './AiUnavailableNotice';
import { AiChatEmptyState } from './AiChatEmptyState';

interface AiChatProps {
  /** Scope to one project; omit for questions across the whole organization. */
  projectId?: string;
  placeholder: string;
  suggestions: string[];
  /** Sizing classes; defaults to a fixed-height panel. */
  className?: string;
}

/** Access problems ("not set up", "allowance used") get the set-up notice instead of a generic error. */
function accessProblem(error: unknown): string | null {
  if (!isAxiosError<{ code?: string; message?: string }>(error)) return null;
  const code = error.response?.data?.code;
  return code && ['NOT_CONFIGURED', 'ALLOWANCE_USED', 'ALLOWANCE_EXPIRED', 'PLATFORM_UNAVAILABLE'].includes(code)
    ? error.response?.data?.message ?? null
    : null;
}

export function AiChat({ projectId, placeholder, suggestions, className }: AiChatProps): React.ReactElement {
  const { data: status, isLoading: statusLoading } = useAiStatus();
  const chat = useAiChat(projectId);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState('');
  const [failure, setFailure] = useState<{ message: string; access: boolean } | null>(null);
  const [caption, setCaption] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [turns, chat.isPending]);

  async function send(question: string, history: ChatTurn[] = turns): Promise<void> {
    const text = question.trim();
    if (!text || chat.isPending) return;
    const conversation: ChatTurn[] = [...history, { role: 'user', content: text }];
    setTurns(conversation);
    setDraft('');
    setFailure(null);
    try {
      const answer = await chat.mutateAsync(conversation);
      setTurns([...conversation, { role: 'assistant', content: answer.answer }]);
      setCaption(`${answer.model} · ${answer.provider.toLowerCase()}`);
    } catch (error) {
      const access = accessProblem(error);
      setFailure({ message: access ?? getApiErrorMessage(error, 'The assistant couldn’t answer. Try again.'), access: !!access });
    }
  }

  function retry(): void {
    const lastQuestion = [...turns].reverse().find((turn) => turn.role === 'user');
    if (!lastQuestion) return;
    void send(lastQuestion.content, turns.slice(0, turns.lastIndexOf(lastQuestion)));
  }

  function startNewChat(): void {
    setTurns([]);
    setFailure(null);
    setCaption(null);
  }

  if (statusLoading) return <Skeleton className={cn('w-full rounded-xl', className ?? 'h-[480px]')} />;
  if (status && status.mode === 'NONE' && turns.length === 0) return <AiUnavailableNotice reason={status.blockedReason ?? 'AI isn’t available.'} />;

  return (
    <div className={cn('flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm', className ?? 'h-[min(70vh,640px)]')}>
      <div className="flex items-center justify-between gap-3 border-b px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-violet-500" />
          {projectId ? 'Project assistant' : 'Organization-wide'}
        </div>
        <Button variant="ghost" size="sm" className="h-8" disabled={turns.length === 0 || chat.isPending} onClick={startNewChat}>
          <SquarePen className="mr-1.5 h-3.5 w-3.5" /> New chat
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto" aria-live="polite">
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col space-y-5 px-4 py-6">
          {turns.length === 0 && <AiChatEmptyState suggestions={suggestions} onSelect={(suggestion) => { void send(suggestion); }} />}
          {turns.map((turn, index) => (
            <div key={index} className={cn('flex gap-3', turn.role === 'user' && 'flex-row-reverse')}>
              <div className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full', turn.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-violet-500/10 text-violet-600')}>
                {turn.role === 'user' ? <User className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
              </div>
              <div className={cn('max-w-[85%] rounded-2xl px-4 py-2.5', turn.role === 'user' ? 'rounded-tr-sm bg-primary text-primary-foreground' : 'rounded-tl-sm bg-muted/60')}>
                {turn.role === 'user' ? <p className="whitespace-pre-wrap text-sm">{turn.content}</p> : <SafeMarkdown content={turn.content} />}
              </div>
            </div>
          ))}
          {chat.isPending && (
            <div className="flex gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500/10 text-violet-600"><Sparkles className="h-3.5 w-3.5 animate-pulse" /></div>
              <div className="w-2/3 space-y-2 rounded-2xl rounded-tl-sm bg-muted/60 p-3"><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-4/5" /></div>
            </div>
          )}
          {failure && (failure.access ? <AiUnavailableNotice reason={failure.message} compact /> : (
            <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200" role="alert">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="flex-1">{failure.message}</span>
              <Button size="sm" variant="outline" onClick={retry}><RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Retry</Button>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </div>
      <div className="border-t bg-muted/20 px-4 pb-2.5 pt-3">
        <form
          className="mx-auto flex w-full max-w-3xl items-end gap-2 rounded-2xl border bg-background p-2 shadow-sm transition-shadow focus-within:ring-2 focus-within:ring-ring"
          onSubmit={(event) => { event.preventDefault(); void send(draft); }}
        >
          <Textarea
            rows={1}
            value={draft}
            maxLength={4000}
            aria-label="Ask a question"
            placeholder={placeholder}
            className="max-h-32 min-h-[40px] resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send(draft); }
            }}
          />
          <Button type="submit" size="icon" className="h-9 w-9 shrink-0 rounded-xl" aria-label="Send" disabled={!draft.trim() || chat.isPending}><ArrowUp className="h-4 w-4" /></Button>
        </form>
        <p className="mx-auto mt-2 flex w-full max-w-3xl flex-wrap justify-between gap-x-4 gap-y-1 px-1 text-[11px] text-muted-foreground">
          <span>AI can be wrong; check important figures in SitePilot.{caption ? ` Answered by ${caption}.` : ''}</span>
          <span className="hidden sm:inline">Enter to send · Shift + Enter for a new line</span>
        </p>
      </div>
    </div>
  );
}
