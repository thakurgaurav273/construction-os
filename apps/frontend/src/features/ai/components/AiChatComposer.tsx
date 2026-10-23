'use client';

import React, { useState } from 'react';
import { Button, Textarea } from '@sitepilot/ui';
import { ArrowUp } from 'lucide-react';

interface AiChatComposerProps {
  placeholder: string;
  busy: boolean;
  caption: string | null;
  onSend: (question: string) => void;
}

export function AiChatComposer({ placeholder, busy, caption, onSend }: AiChatComposerProps): React.ReactElement {
  const [draft, setDraft] = useState('');

  function submit(): void {
    if (!draft.trim() || busy) return;
    onSend(draft);
    setDraft('');
  }

  return (
    <div className="border-t bg-muted/20 px-4 pb-2.5 pt-3">
      <form
        className="mx-auto flex w-full max-w-3xl items-end gap-2 rounded-2xl border bg-background p-2 shadow-sm transition-shadow focus-within:ring-2 focus-within:ring-ring"
        onSubmit={(event) => { event.preventDefault(); submit(); }}
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
            if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit(); }
          }}
        />
        <Button type="submit" size="icon" className="h-9 w-9 shrink-0 rounded-xl" aria-label="Send" disabled={!draft.trim() || busy}><ArrowUp className="h-4 w-4" /></Button>
      </form>
      <p className="mx-auto mt-2 flex w-full max-w-3xl flex-wrap justify-between gap-x-4 gap-y-1 px-1 text-[11px] text-muted-foreground">
        <span>AI can be wrong; check important figures in SitePilot.{caption ? ` Answered by ${caption}.` : ''}</span>
        <span className="hidden sm:inline">Enter to send · Shift + Enter for a new line</span>
      </p>
    </div>
  );
}
