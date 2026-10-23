'use client';

import React, { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Button, Input, Skeleton, cn } from '@sitepilot/ui';
import { AlertTriangle, ChevronLeft, ChevronRight, History, Search } from 'lucide-react';
import { useCan } from '@/hooks/api/use-access';
import { useAiConversations, type ConversationScope, type ConversationSummary } from '@/hooks/api/use-ai';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

interface AiChatHistoryProps {
  /** Limit the list to one project's chats. */
  projectId?: string;
  activeId: string | null;
  onOpen: (conversationId: string) => void;
}

const SCOPE_OPTIONS: { value: ConversationScope; label: string }[] = [
  { value: 'organization', label: 'Everyone' },
  { value: 'mine', label: 'Mine' },
];

function ConversationRow({ conversation, active, showAuthor, showProject, onOpen }: {
  conversation: ConversationSummary;
  active: boolean;
  showAuthor: boolean;
  showProject: boolean;
  onOpen: () => void;
}): React.ReactElement {
  const questionCount = Math.ceil(conversation.messageCount / 2);
  const details = [
    showAuthor ? (conversation.isOwn ? 'You' : conversation.user.name) : null,
    showProject ? conversation.project?.name ?? 'Organization-wide' : null,
    `${questionCount} ${questionCount === 1 ? 'question' : 'questions'}`,
    formatDistanceToNow(new Date(conversation.updatedAt), { addSuffix: true }),
  ].filter(Boolean);

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'w-full rounded-lg border px-3.5 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active ? 'border-violet-500/40 bg-violet-500/5' : 'border-transparent',
      )}
    >
      <p className="truncate text-sm font-medium">{conversation.title}</p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{details.join(' · ')}</p>
    </button>
  );
}

export function AiChatHistory({ projectId, activeId, onOpen }: AiChatHistoryProps): React.ReactElement {
  const canViewAll = useCan()('ai.history.view');
  const [scope, setScope] = useState<ConversationScope>('mine');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const search = useDebouncedValue(searchInput.trim());

  // Access loads after first render; people who can see everyone's chats start on "Everyone".
  useEffect(() => {
    if (canViewAll) setScope('organization');
  }, [canViewAll]);

  useEffect(() => setPage(1), [scope, search]);

  const { data, isLoading, isError, isFetching, refetch } = useAiConversations({ scope, projectId, search, page });
  const showAuthor = scope === 'organization';

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-2 border-b px-4 py-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={showAuthor ? 'Search questions, answers or people…' : 'Search your questions and answers…'}
            aria-label="Search chat history"
            className="h-9 pl-9"
          />
        </div>
        {canViewAll && (
          <div className="inline-flex rounded-lg border bg-muted/40 p-0.5" role="group" aria-label="Whose chats to show">
            {SCOPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={scope === option.value}
                onClick={() => setScope(option.value)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  scope === option.value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={cn('flex-1 overflow-y-auto p-2 transition-opacity', isFetching && !isLoading && 'opacity-70')}>
        {isLoading ? (
          <div className="space-y-2 p-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="space-y-2 px-1.5 py-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
            ))}
          </div>
        ) : isError ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            <div>
              <p className="text-sm font-medium">Unable to load chat history</p>
              <p className="text-xs text-muted-foreground">Check your connection and try again.</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => { void refetch(); }}>Retry</Button>
          </div>
        ) : data && data.items.length > 0 ? (
          <div className="space-y-0.5">
            {data.items.map((conversation) => (
              <ConversationRow
                key={conversation.id}
                conversation={conversation}
                active={conversation.id === activeId}
                showAuthor={showAuthor}
                showProject={!projectId}
                onOpen={() => onOpen(conversation.id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <History className="h-6 w-6 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{search ? 'No chats match your search' : 'No chats yet'}</p>
              <p className="max-w-xs text-xs text-muted-foreground">
                {search ? 'Try different words, or clear the search.' : 'Questions you ask the assistant are saved here so you can pick them up later.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
          <span>Page {data.page} of {data.totalPages} · {data.total} chats</span>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Next page" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
