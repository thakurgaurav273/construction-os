'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@sitepilot/ui';
import { Ban, CheckCircle2, RotateCcw, Send } from 'lucide-react';
import { ReviewNoteDialog, type ReviewNoteRequest } from '@/components/shared/ReviewNoteDialog';
import { useCan } from '@/hooks/api/use-access';
import { useRaBillTransition } from '@/hooks/api/use-billing';
import { getApiErrorMessage } from '@/lib/api/errors';
import { useAuthStore } from '@/store/auth.store';
import type { RaBillDetail } from '../types';
import { CertifyBillSheet } from './CertifyBillSheet';

const OPEN_STATUSES = ['DRAFT', 'SUBMITTED', 'CHANGES_REQUESTED'];

/** The next steps this person can take on the bill. The server enforces the same rules. */
export function BillActions({ bill }: { bill: RaBillDetail }): React.ReactElement | null {
  const can = useCan();
  const userId = useAuthStore((state) => state.user?.id);
  const transition = useRaBillTransition();
  const [noteRequest, setNoteRequest] = useState<ReviewNoteRequest | null>(null);
  const [certifyOpen, setCertifyOpen] = useState(false);

  const toClient = bill.contract.direction === 'CLIENT';
  const preparedByMe = bill.preparedBy?.id === userId;
  const editable = bill.status === 'DRAFT' || bill.status === 'CHANGES_REQUESTED';
  const canSubmit = can('billing.prepare') && editable && bill.contractStatus === 'ACTIVE';
  const canReview = can('billing.certify') && bill.status === 'SUBMITTED';
  // Subcontract bills are money we owe, so their preparer can't certify them.
  const blockedAsPreparer = canReview && !toClient && preparedByMe;
  const canCancel = OPEN_STATUSES.includes(bill.status) && (preparedByMe ? can('billing.prepare') : can('billing.certify'));
  // The server also refuses once money has moved or a later bill builds on this one, and explains why.
  const canReopen = can('billing.certify') && bill.status === 'CERTIFIED' && !bill.isOpeningBalance && bill.contractStatus === 'ACTIVE';

  async function run(action: () => Promise<unknown>, success: string, failure: string): Promise<void> {
    try {
      await action();
      toast.success(success);
    } catch (error) {
      toast.error(getApiErrorMessage(error, failure));
      throw error;
    }
  }

  if (!canSubmit && !canReview && !canCancel && !canReopen) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canReopen && (
        <Button
          variant="outline"
          onClick={() => setNoteRequest({
            title: `Reopen ${bill.code} for correction?`,
            description: toClient
              ? 'The certification is withdrawn and the bill becomes editable again. Resubmit it and record the corrected certification.'
              : 'The certification is withdrawn, its vendor bill is cancelled in Finance and the bill becomes editable again. Certifying the corrected bill raises a new vendor bill.',
            confirmLabel: 'Reopen Bill',
            noteRequired: true,
            onConfirm: (note) => run(() => transition.mutateAsync({ id: bill.id, action: 'reopen', note }), `${bill.code} reopened`, "Couldn't reopen the bill."),
          })}
        >
          <RotateCcw className="mr-2 h-4 w-4" /> Reopen
        </Button>
      )}
      {canCancel && (
        <Button
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={() => setNoteRequest({
            title: `Cancel ${bill.code}?`,
            description: 'The bill stays in the history but nothing on it counts. You can start a fresh bill afterwards.',
            confirmLabel: 'Cancel Bill',
            noteRequired: false,
            destructive: true,
            onConfirm: (note) => run(() => transition.mutateAsync({ id: bill.id, action: 'cancel', note: note || undefined }), `${bill.code} cancelled`, "Couldn't cancel the bill."),
          })}
        >
          <Ban className="mr-2 h-4 w-4" /> Cancel
        </Button>
      )}
      {canReview && (
        <Button
          variant="outline"
          onClick={() => setNoteRequest({
            title: `Send ${bill.code} back?`,
            description: toClient ? 'Record what the client asked to change. The bill becomes editable again.' : 'Explain what needs to change. The preparer can edit and resubmit.',
            confirmLabel: 'Send Back',
            noteRequired: true,
            onConfirm: (note) => run(() => transition.mutateAsync({ id: bill.id, action: 'request-changes', note }), `${bill.code} sent back`, "Couldn't send the bill back."),
          })}
        >
          <RotateCcw className="mr-2 h-4 w-4" /> Send Back
        </Button>
      )}
      {canReview && (
        <Button onClick={() => setCertifyOpen(true)} disabled={blockedAsPreparer} title={blockedAsPreparer ? 'You prepared this bill. Another certifier has to certify it.' : undefined}>
          <CheckCircle2 className="mr-2 h-4 w-4" /> {toClient ? 'Record Certification' : 'Certify'}
        </Button>
      )}
      {canSubmit && (
        <Button
          onClick={() => run(() => transition.mutateAsync({ id: bill.id, action: 'submit' }), `${bill.code} submitted`, "Couldn't submit the bill.").catch(() => undefined)}
          disabled={transition.isPending}
        >
          <Send className="mr-2 h-4 w-4" /> {toClient ? 'Submit to Client' : 'Submit for Certification'}
        </Button>
      )}
      {blockedAsPreparer && <p className="w-full text-xs text-muted-foreground sm:w-auto">You prepared this bill, so another certifier has to certify it.</p>}

      <ReviewNoteDialog request={noteRequest} onClose={() => setNoteRequest(null)} />
      {canReview && <CertifyBillSheet bill={bill} open={certifyOpen} onOpenChange={setCertifyOpen} />}
    </div>
  );
}
