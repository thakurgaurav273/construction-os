'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@sitepilot/ui';
import { Ban, CheckCircle2, Landmark, XCircle } from 'lucide-react';
import { usePaymentTransition, type PaymentTransition } from '@/hooks/api/use-finance';
import { getApiErrorMessage } from '@/lib/api/errors';
import { useAuthStore } from '@/store/auth.store';
import { ReviewNoteDialog, type ReviewNoteRequest } from '@/components/shared/ReviewNoteDialog';
import { MarkPaidDialog } from '@/features/finance/components/MarkPaidDialog';
import type { Payment } from '@/features/finance/types';

/** Approve / reject / release / cancel for one payment, offered according to its status and who requested it. */
export function PaymentRowActions({ payment }: { payment: Payment }): React.ReactElement | null {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const transition = usePaymentTransition();
  const [noteRequest, setNoteRequest] = useState<ReviewNoteRequest | null>(null);
  const [paying, setPaying] = useState(false);
  const isOwnRequest = !!currentUserId && payment.requestedBy?.id === currentUserId;

  async function run(kind: PaymentTransition, message: string, note?: string): Promise<void> {
    try {
      await transition.mutateAsync({ id: payment.id, transition: kind, note });
      toast.success(message);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't update the payment. Try again."));
      throw error;
    }
  }

  function ask(kind: PaymentTransition, request: Omit<ReviewNoteRequest, 'onConfirm'>, message: string): void {
    setNoteRequest({ ...request, onConfirm: (note) => run(kind, message, note || undefined) });
  }

  if (payment.status !== 'PENDING' && payment.status !== 'APPROVED') return null;
  const busy = transition.isPending;

  return (
    <div className="flex flex-wrap items-center gap-1" onClick={(event) => event.stopPropagation()}>
      {payment.status === 'PENDING' && !isOwnRequest && (
        <>
          <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" disabled={busy} onClick={() => ask('approve', {
            title: `Approve ${payment.paymentNumber}?`,
            description: 'Approved payments are cleared for release by your accounts team.',
            confirmLabel: 'Approve',
            noteRequired: false,
          }, `${payment.paymentNumber} approved`)}>
            <CheckCircle2 className="h-3 w-3" /> Approve
          </Button>
          <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-destructive hover:text-destructive" disabled={busy} onClick={() => ask('reject', {
            title: `Reject ${payment.paymentNumber}?`,
            description: 'The amount goes back to the invoice balance so a new payment can be requested.',
            confirmLabel: 'Reject',
            noteRequired: true,
            destructive: true,
          }, `${payment.paymentNumber} rejected`)}>
            <XCircle className="h-3 w-3" /> Reject
          </Button>
        </>
      )}
      {payment.status === 'PENDING' && isOwnRequest && (
        <span className="text-xs text-muted-foreground">Awaiting another approver</span>
      )}
      {payment.status === 'APPROVED' && (
        <Button size="sm" className="h-7 gap-1 text-xs" onClick={() => setPaying(true)}>
          <Landmark className="h-3 w-3" /> Mark paid
        </Button>
      )}
      <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-muted-foreground hover:text-destructive" disabled={busy} onClick={() => ask('cancel', {
        title: `Cancel ${payment.paymentNumber}?`,
        description: 'The amount returns to the invoice balance.',
        confirmLabel: 'Cancel payment',
        noteRequired: false,
        destructive: true,
      }, `${payment.paymentNumber} cancelled`)}>
        <Ban className="h-3 w-3" /> Cancel
      </Button>

      <ReviewNoteDialog request={noteRequest} onClose={() => setNoteRequest(null)} />
      <MarkPaidDialog payment={paying ? payment : null} onClose={() => setPaying(false)} />
    </div>
  );
}
