'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@sitepilot/ui';
import { Ban, CheckCircle2, PackageCheck, XCircle } from 'lucide-react';
import { useTransferAction, type TransferAction, type TransferDetail } from '@/hooks/api/use-inventory';
import { useCan, useCurrentAccess } from '@/hooks/api/use-access';
import { getApiErrorMessage } from '@/lib/api/errors';
import { ReviewNoteDialog, type ReviewNoteRequest } from '@/components/shared/ReviewNoteDialog';

const SUCCESS_MESSAGE: Record<TransferAction, string> = {
  approve: 'approved',
  reject: 'rejected',
  cancel: 'cancelled',
  complete: 'received; stock has moved',
};

/**
 * Footer actions for a transfer. The requester can cancel but never approve or reject their own request
 * (the server enforces the same rule); receiving is only possible once someone has approved it.
 */
export function TransferActions({ transfer }: { transfer: TransferDetail }): React.ReactElement | null {
  const can = useCan();
  const { data: access } = useCurrentAccess();
  const transferAction = useTransferAction();
  const [noteRequest, setNoteRequest] = useState<ReviewNoteRequest | null>(null);

  if (!can('inventory.transfer') || !access) return null;
  const isRequester = transfer.requestedBy.id === access.userId;
  const isOpen = transfer.status === 'PENDING' || transfer.status === 'APPROVED';

  async function run(action: TransferAction, note?: string): Promise<void> {
    try {
      await transferAction.mutateAsync({ id: transfer.id, action, note });
      toast.success(`${transfer.code} ${SUCCESS_MESSAGE[action]}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, `Couldn't ${action} ${transfer.code}. Try again.`));
      throw error;
    }
  }

  function askToReject(): void {
    setNoteRequest({
      title: `Reject ${transfer.code}?`,
      description: 'The requester will see your note. No stock moves.',
      confirmLabel: 'Reject Transfer',
      noteRequired: true,
      destructive: true,
      onConfirm: (note) => run('reject', note),
    });
  }

  function askToCancel(): void {
    setNoteRequest({
      title: `Cancel ${transfer.code}?`,
      description: 'Withdraw your request. No stock moves.',
      confirmLabel: 'Cancel Transfer',
      noteRequired: false,
      destructive: true,
      onConfirm: (note) => run('cancel', note || undefined),
    });
  }

  const buttons: React.ReactNode[] = [];
  if (transfer.status === 'PENDING' && !isRequester) {
    buttons.push(
      <Button key="approve" size="sm" className="gap-1.5" disabled={transferAction.isPending} onClick={() => run('approve').catch(() => undefined)}>
        <CheckCircle2 className="h-3.5 w-3.5" /> Approve
      </Button>,
    );
  }
  if (transfer.status === 'APPROVED' || transfer.status === 'IN_TRANSIT') {
    buttons.push(
      <Button key="complete" size="sm" className="gap-1.5" disabled={transferAction.isPending} onClick={() => run('complete').catch(() => undefined)}>
        <PackageCheck className="h-3.5 w-3.5" /> Mark Received
      </Button>,
    );
  }
  if (isOpen && !isRequester) {
    buttons.push(
      <Button key="reject" size="sm" variant="outline" className="gap-1.5" disabled={transferAction.isPending} onClick={askToReject}>
        <XCircle className="h-3.5 w-3.5" /> Reject
      </Button>,
    );
  }
  if (isOpen && isRequester) {
    buttons.push(
      <Button key="cancel" size="sm" variant="outline" className="gap-1.5" disabled={transferAction.isPending} onClick={askToCancel}>
        <Ban className="h-3.5 w-3.5" /> Cancel Request
      </Button>,
    );
  }

  if (buttons.length === 0 && !(transfer.status === 'PENDING' && isRequester)) return null;

  return (
    <div className="shrink-0 border-t bg-background px-5 py-3 space-y-2">
      {transfer.status === 'PENDING' && isRequester && (
        <p className="text-xs text-muted-foreground">You requested this transfer, so someone else needs to approve it.</p>
      )}
      {buttons.length > 0 && <div className="grid grid-cols-2 gap-2">{buttons}</div>}
      <ReviewNoteDialog request={noteRequest} onClose={() => setNoteRequest(null)} />
    </div>
  );
}
