'use client';

import React from 'react';
import { AiChat } from '@/features/ai/components/AiChat';

const SUGGESTIONS = [
  'Which projects are over budget or behind schedule?',
  'What is waiting for approval across the company?',
  'Which approved deliveries are overdue?',
  'What stock is running low and where?',
  'Give me a one-paragraph status for the leadership meeting',
];

export default function AiAssistantPage(): React.ReactElement {
  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col gap-4 p-4 md:p-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">AI Assistant</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ask across all your projects. For questions about one site, open the project&apos;s AI tab for more detail.
        </p>
      </div>
      <AiChat
        className="min-h-[480px] flex-1"
        placeholder="Ask about your projects, approvals, deliveries or stock…"
        suggestions={SUGGESTIONS}
      />
    </div>
  );
}
