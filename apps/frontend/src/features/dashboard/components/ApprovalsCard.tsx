import React from 'react';
import Link from 'next/link';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@sitepilot/ui';
import type { ApprovalQueue } from '../types';

export function ApprovalsCard({ queues }: { queues: ApprovalQueue[] }): React.ReactElement {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Waiting for you</CardTitle>
        <CardDescription>Requests from your team that need your decision.</CardDescription>
      </CardHeader>
      <CardContent>
        {queues.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Nothing needs your approval right now.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {queues.map((queue) => (
              <li key={queue.kind}>
                <Link
                  href={queue.href}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span>{queue.label}</span>
                  <span className="flex items-center gap-2">
                    <Badge variant="warning">{queue.count}</Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
