'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Badge, Button, Card, CardContent, Skeleton } from '@sitepilot/ui';
import { AlertTriangle, Inbox } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { ReviewNoteDialog, type ReviewNoteRequest } from '@/components/shared/ReviewNoteDialog';
import type { AiAccessRequest } from '@/hooks/api/use-ai';
import { usePlatformRequests, useRejectAiRequest } from '@/hooks/api/use-platform';
import { getApiErrorMessage } from '@/lib/api/errors';
import { ApproveRequestDialog } from './ApproveRequestDialog';

/** Trial and top-up requests from every tenant, waiting ones first. */
export function AccessRequestsPanel(): React.ReactElement {
  const { data: requests = [], isLoading, isError, refetch } = usePlatformRequests();
  const reject = useRejectAiRequest();
  const [approving, setApproving] = useState<AiAccessRequest | null>(null);
  const [noteRequest, setNoteRequest] = useState<ReviewNoteRequest | null>(null);

  function askToReject(request: AiAccessRequest): void {
    setNoteRequest({
      title: `Decline ${request.organizationName}'s request?`,
      description: 'The tenant sees your note and can still use their own API key.',
      confirmLabel: 'Decline',
      noteRequired: true,
      destructive: true,
      onConfirm: async (note) => {
        try {
          await reject.mutateAsync({ id: request.id, note });
          toast.success('Request declined');
        } catch (error) {
          toast.error(getApiErrorMessage(error, 'Couldn’t decline the request.'));
          throw error;
        }
      },
    });
  }

  if (isLoading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-24 w-full rounded-xl" />)}</div>;
  if (isError) {
    return <EmptyState icon={AlertTriangle} title="Unable to load requests" description="Check your connection and try again." action={<Button variant="outline" onClick={() => refetch()}>Retry</Button>} />;
  }
  if (requests.length === 0) return <EmptyState icon={Inbox} title="No requests yet" description="When a tenant asks for a free trial or more AI usage, it shows up here." />;

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <Card key={request.id} className={request.status === 'PENDING' ? 'border-amber-300 dark:border-amber-800' : undefined}>
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{request.organizationName}</p>
                <Badge variant="outline">{request.kind === 'TRIAL' ? 'Free trial' : 'Top-up'}</Badge>
                <Badge variant={request.status === 'PENDING' ? 'default' : 'secondary'} className="capitalize">{request.status.toLowerCase()}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {request.requestedRequests} requests · by {request.requestedBy.name} ({request.requestedBy.email}) · {format(new Date(request.createdAt), 'dd MMM yyyy, HH:mm')}
              </p>
              {request.reason && <p className="text-sm">&ldquo;{request.reason}&rdquo;</p>}
              {request.status === 'APPROVED' && (
                <p className="text-xs text-muted-foreground">
                  Granted {request.grantedRequests} until {request.expiresAt ? format(new Date(request.expiresAt), 'dd MMM yyyy') : '—'} by {request.decidedByEmail}
                </p>
              )}
              {request.status === 'REJECTED' && <p className="text-xs text-muted-foreground">Declined by {request.decidedByEmail}: {request.decisionNote}</p>}
            </div>
            {request.status === 'PENDING' && (
              <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="outline" onClick={() => askToReject(request)}>Decline</Button>
                <Button size="sm" onClick={() => setApproving(request)}>Approve</Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
      <ApproveRequestDialog request={approving} onClose={() => setApproving(null)} />
      <ReviewNoteDialog request={noteRequest} onClose={() => setNoteRequest(null)} />
    </div>
  );
}
