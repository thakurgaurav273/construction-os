'use client';

import React, { useEffect, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { format } from 'date-fns';
import { Button, Skeleton, cn } from '@sitepilot/ui';
import { AlertTriangle, Eye, History, MessageSquare, RotateCcw, SquarePen } from 'lucide-react';
import { useAiChat, useAiConversation, useAiStatus, type ChatTurn } from '@/hooks/api/use-ai';
import { getApiErrorMessage } from '@/lib/api/errors';
import { AiUnavailableNotice } from './AiUnavailableNotice';
import { AiChatEmptyState } from './AiChatEmptyState';
import { AiChatHistory } from './AiChatHistory';
import { AiChatTurn } from './AiChatTurn';
import { AiChatComposer } from './AiChatComposer';
import { AiThinkingIndicator } from './AiThinkingIndicator';

interface AiChatProps {
  /** Scope to one project; omit for questions across the whole organization. */
  projectId?: string;
  placeholder: string;
  suggestions: string[];
  /** Sizing classes; defaults to a fixed-height panel. */
  className?: string;
}

type ChatView = 'chat' | 'history';

const VIEWS: { value: ChatView; label: string; icon: typeof MessageSquare }[] = [
  { value: 'chat', label: 'Chat', icon: MessageSquare },
  { value: 'history', label: 'History', icon: History },
];

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
  const [view, setView] = useState<ChatView>('chat');
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  /** Set when reading someone else's saved chat: it can be read but not continued. */
  const [viewingOther, setViewingOther] = useState<{ name: string; at: string } | null>(null);
  const [failure, setFailure] = useState<{ message: string; access: boolean } | null>(null);
  const [caption, setCaption] = useState<string | null>(null);
  const opened = useAiConversation(openingId);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [turns, chat.isPending, view]);

  useEffect(() => {
    const conversation = opened.data;
    if (!conversation || conversation.id !== openingId) return;
    setTurns(conversation.messages.map(({ role, content }) => ({ role, content })));
    setConversationId(conversation.id);
    setViewingOther(conversation.isOwn ? null : { name: conversation.user.name, at: conversation.createdAt });
    setFailure(null);
    setCaption(null);
    setOpeningId(null);
  }, [opened.data, openingId]);

  async function send(question: string, history: ChatTurn[] = turns): Promise<void> {
    const text = question.trim();
    if (!text || chat.isPending) return;
    setTurns([...history, { role: 'user', content: text }]);
    setFailure(null);
    try {
      const reply = await chat.mutateAsync({ question: text, conversationId: conversationId ?? undefined });
      setTurns([...history, { role: 'user', content: text }, { role: 'assistant', content: reply.answer }]);
      setConversationId(reply.conversationId);
      setCaption(`${reply.model} · ${reply.provider.toLowerCase()}`);
    } catch (error) {
      const access = accessProblem(error);
      setFailure({ message: access ?? getApiErrorMessage(error, 'The assistant couldn’t answer. Try again.'), access: !!access });
    }
  }

  /** The failed question was never saved, so it is sent again on top of the turns before it. */
  function retry(): void {
    const lastQuestion = [...turns].reverse().find((turn) => turn.role === 'user');
    if (!lastQuestion) return;
    void send(lastQuestion.content, turns.slice(0, turns.lastIndexOf(lastQuestion)));
  }

  function startNewChat(): void {
    setTurns([]);
    setConversationId(null);
    setViewingOther(null);
    setFailure(null);
    setCaption(null);
    setView('chat');
  }

  function openConversation(id: string): void {
    setView('chat');
    if (id !== conversationId) setOpeningId(id);
  }

  if (statusLoading) return <Skeleton className={cn('w-full rounded-xl', className ?? 'h-[480px]')} />;
  if (status && status.mode === 'NONE' && turns.length === 0 && view === 'chat') return <AiUnavailableNotice reason={status.blockedReason ?? 'AI isn’t available.'} />;

  const pendingQuestion = chat.isPending ? turns[turns.length - 1]?.content ?? '' : null;
  const isOpening = !!openingId && opened.isLoading;

  return (
    <div className={cn('flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm', className ?? 'h-[min(70vh,640px)]')}>
      <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
        <div className="inline-flex rounded-lg bg-muted/60 p-0.5" role="tablist" aria-label="Assistant views">
          {VIEWS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={view === value}
              onClick={() => setView(value)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                view === value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-muted-foreground sm:inline">{projectId ? 'This project' : 'All projects'}</span>
          <Button variant="ghost" size="sm" className="h-8" disabled={(turns.length === 0 && view === 'chat') || chat.isPending} onClick={startNewChat}>
            <SquarePen className="mr-1.5 h-3.5 w-3.5" /> New chat
          </Button>
        </div>
      </div>

      {view === 'history' ? (
        <div className="min-h-0 flex-1">
          <AiChatHistory projectId={projectId} activeId={conversationId} onOpen={openConversation} />
        </div>
      ) : (
        <>
          {viewingOther && (
            <div className="flex items-center gap-2 border-b bg-amber-50/70 px-4 py-2 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              <Eye className="h-3.5 w-3.5 shrink-0" />
              <span>Viewing {viewingOther.name}&apos;s chat from {format(new Date(viewingOther.at), 'd MMM yyyy, h:mm a')}. Start a new chat to ask your own questions.</span>
            </div>
          )}
          <div className="flex-1 overflow-y-auto" aria-live="polite">
            <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col space-y-5 px-4 py-6">
              {isOpening ? (
                <div className="space-y-5">
                  <Skeleton className="ml-auto h-10 w-1/2 rounded-2xl" />
                  <Skeleton className="h-24 w-3/4 rounded-2xl" />
                </div>
              ) : opened.isError && openingId ? (
                <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200" role="alert">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span className="flex-1">Unable to open that chat. It may have been removed, or you may no longer have access.</span>
                  <Button size="sm" variant="outline" onClick={() => { void opened.refetch(); }}><RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Retry</Button>
                </div>
              ) : (
                <>
                  {turns.length === 0 && <AiChatEmptyState suggestions={suggestions} onSelect={(suggestion) => { void send(suggestion); }} />}
                  {turns.map((turn, index) => <AiChatTurn key={index} turn={turn} />)}
                  {pendingQuestion !== null && <AiThinkingIndicator question={pendingQuestion} />}
                  {failure && (failure.access ? <AiUnavailableNotice reason={failure.message} compact /> : (
                    <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200" role="alert">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span className="flex-1">{failure.message}</span>
                      <Button size="sm" variant="outline" onClick={retry}><RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Retry</Button>
                    </div>
                  ))}
                </>
              )}
              <div ref={endRef} />
            </div>
          </div>
          {viewingOther ? (
            <div className="flex justify-center border-t bg-muted/20 px-4 py-3">
              <Button variant="outline" onClick={startNewChat}><SquarePen className="mr-1.5 h-4 w-4" /> Start a new chat</Button>
            </div>
          ) : (
            <AiChatComposer placeholder={placeholder} busy={chat.isPending} caption={caption} onSend={(question) => { void send(question); }} />
          )}
        </>
      )}
    </div>
  );
}
