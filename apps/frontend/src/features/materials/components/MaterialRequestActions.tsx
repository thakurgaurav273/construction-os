'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@sitepilot/ui';
import { ArrowUpRight, Ban, CheckCircle2, CircleSlash, XCircle } from 'lucide-react';
import { useCan, useCurrentAccess } from '@/hooks/api/use-access';
import {
  useMaterialRequestAction, type MaterialRequestAction, type MaterialRequestDetail,
} from '@/hooks/api/use-material-requests';
import { useProjectOpenForWork } from '@/hooks/api/use-projects';
import { getApiErrorMessage } from '@/lib/api/errors';
import { ReviewNoteDialog, type ReviewNoteRequest } from '@/components/shared/ReviewNoteDialog';
import { IssueRequestDialog } from './IssueRequestDialog';

const SUCCESS_MESSAGE: Record<MaterialRequestAction, string> = {
  approve: 'approved; it can be issued now',
  reject: 'rejected',
  cancel: 'cancelled',
  close: 'closed',
};

/**
 * Footer actions for a material request. The requester can cancel until something is issued, but never
 * approve or reject their own request (the server enforces the same rule). The stores issue it once approved,
 * possibly in parts, and close it if the rest won't come.
 */
export function MaterialRequestActions({ request }: { request: MaterialRequestDetail }): React.ReactElement | null {
  const can = useCan();
  const { data: access } = useCurrentAccess();
  const isProjectOpen = useProjectOpenForWork(request.projectId);
  const requestAction = useMaterialRequestAction();
  const [noteRequest, setNoteRequest] = useState<ReviewNoteRequest | null>(null);
  const [issueOpen, setIssueOpen] = useState(false);

  if (!access) return null;
  const isRequester = request.requestedBy.id === access.userId;
  const isStores = can('material.issue');
  const isIssuable = request.status === 'APPROVED' || request.status === 'PARTLY_ISSUED';
  const canCancel = isRequester && (request.status === 'PENDING' || request.status === 'APPROVED');

  async function run(action: MaterialRequestAction, note?: string): Promise<void> {
    try {
      await requestAction.mutateAsync({ id: request.id, action, note });
      toast.success(`${request.code} ${SUCCESS_MESSAGE[action]}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, `Couldn't ${action} ${request.code}. Try again.`));
      throw error;
    }
  }

  function askForNote(action: Exclude<MaterialRequestAction, 'approve'>): void {
    const copy = {
      reject: { title: `Reject ${request.code}?`, description: 'The requester will see your note. No stock moves.', confirmLabel: 'Reject Request', required: true },
      cancel: { title: `Cancel ${request.code}?`, description: 'Withdraw your request. No stock moves.', confirmLabel: 'Cancel Request', required: false },
      close: {
        title: `Close ${request.code}?`,
        description: 'What was issued stays issued; the rest won’t be sent. The requester will see your note.',
        confirmLabel: 'Close Request',
        required: true,
      },
    }[action];
    setNoteRequest({
      title: copy.title,
      description: copy.description,
      confirmLabel: copy.confirmLabel,
      noteRequired: copy.required,
      destructive: true,
      onConfirm: (note) => run(action, note || undefined),
    });
  }

  const busy = requestAction.isPending;
  const buttons: React.ReactNode[] = [];
  if (request.status === 'PENDING' && isStores && !isRequester && isProjectOpen) {
    buttons.push(
      <Button key="approve" size="sm" className="gap-1.5" disabled={busy} onClick={() => run('approve').catch(() => undefined)}>
        <CheckCircle2 className="h-3.5 w-3.5" /> Approve
      </Button>,
    );
  }
  if (request.status === 'PENDING' && isStores && !isRequester) {
    buttons.push(
      <Button key="reject" size="sm" variant="outline" className="gap-1.5" disabled={busy} onClick={() => askForNote('reject')}>
        <XCircle className="h-3.5 w-3.5" /> Reject
      </Button>,
    );
  }
  if (isIssuable && isStores && isProjectOpen) {
    buttons.push(
      <Button key="issue" size="sm" className="gap-1.5" disabled={busy} onClick={() => setIssueOpen(true)}>
        <ArrowUpRight className="h-3.5 w-3.5" /> {request.status === 'PARTLY_ISSUED' ? 'Issue Rest' : 'Issue'}
      </Button>,
    );
  }
  if (isIssuable && isStores) {
    buttons.push(
      <Button key="close" size="sm" variant="outline" className="gap-1.5" disabled={busy} onClick={() => askForNote('close')}>
        <CircleSlash className="h-3.5 w-3.5" /> Close
      </Button>,
    );
  }
  if (canCancel) {
    buttons.push(
      <Button key="cancel" size="sm" variant="outline" className="gap-1.5" disabled={busy} onClick={() => askForNote('cancel')}>
        <Ban className="h-3.5 w-3.5" /> Cancel Request
      </Button>,
    );
  }

  const waitingOnOthers = request.status === 'PENDING' && isRequester;
  if (buttons.length === 0 && !waitingOnOthers) return null;

  return (
    <div className="shrink-0 border-t bg-background px-5 py-3 space-y-2">
      {waitingOnOthers && (
        <p className="text-xs text-muted-foreground">You raised this request, so someone in the stores needs to approve it.</p>
      )}
      {buttons.length > 0 && <div className="grid grid-cols-2 gap-2">{buttons}</div>}
      <ReviewNoteDialog request={noteRequest} onClose={() => setNoteRequest(null)} />
      {isIssuable && <IssueRequestDialog request={request} open={issueOpen} onOpenChange={setIssueOpen} />}
    </div>
  );
}
