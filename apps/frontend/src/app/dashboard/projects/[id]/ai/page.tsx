'use client';

import React from 'react';
import { AiChat } from '@/features/ai/components/AiChat';
import { useProject } from '@/hooks/api/use-projects';

const SUGGESTIONS = [
  'Summarise this project’s status for a client update',
  'What are the biggest risks right now?',
  'Which purchase orders are still open and when are they due?',
  'How has site attendance looked this week?',
  'What issues came up in the latest daily reports?',
];

export default function ProjectAiPage({ params }: { params: { id: string } }): React.ReactElement {
  const { data: project } = useProject(params.id);
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">AI Assistant</h2>
        <p className="text-muted-foreground">
          Ask about {project?.name ?? 'this project'}: progress, budget, daily reports, purchase orders, materials and attendance.
        </p>
      </div>
      <AiChat projectId={params.id} placeholder="Ask about this project…" suggestions={SUGGESTIONS} />
    </div>
  );
}
