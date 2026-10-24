'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@sitepilot/ui';
import { Ban, CheckCircle2, HandCoins, Loader2, Pencil, Send, XCircle } from 'lucide-react';
import { useInvoiceTransition, type InvoiceTransition } from '@/hooks/api/use-finance';
import { getApiErrorMessage } from '@/lib/api/errors';
import { useAuthStore } from '@/store/auth.store';
import { useCan } from '@/hooks/api/use-access';
import { ReviewNoteDialog, type ReviewNoteRequest } from '@/components/shared/ReviewNoteDialog';
import { InvoiceFormDialog } from '@/features/finance/components/InvoiceFormDialog';
import { PaymentRequestDialog } from '@/features/finance/components/PaymentRequestDialog';
import type { InvoiceDetail } from '@/features/finance/types';

const CANCELLABLE = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED'];

export function InvoiceActions({ invoice }: { invoice: InvoiceDetail }): React.ReactElement {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const transition = useInvoiceTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [noteRequest, setNoteRequest] = useState<ReviewNoteRequest | null>(null);

  const can = useCan();
  const isOwnInvoice = !!currentUserId && invoice.createdBy?.id === currentUserId;
  const canReview = invoice.status === 'PENDING_APPROVAL' && !isOwnInvoice && can('invoice.approve');
  const hasVariance = invoice.match.status === 'VARIANCE';
  const hasOpenPayments = invoice.payments.some((payment) => ['PENDING', 'APPROVED', 'PAID'].includes(payment.status));
  // Whoever entered a bill withdraws it until approval; anyone else's, or an approved bill, needs approver rights.
  const canWithdraw = can('invoice.approve') || (isOwnInvoice && invoice.status !== 'APPROVED' && can('invoice.create'));
  // Bills raised by Billing are changed there, never cancelled here.
  const canCancel = CANCELLABLE.includes(invoice.status) && !hasOpenPayments && canWithdraw && !invoice.source;
  const busy = transition.isPending;

  async function run(kind: InvoiceTransition, message: string, note?: string): Promise<void> {
    try {
      await transition.mutateAsync({ id: invoice.id, transition: kind, note });
      toast.success(message);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't update the invoice. Try again."));
      throw error;
    }
  }

  function ask(kind: InvoiceTransition, request: Omit<ReviewNoteRequest, 'onConfirm'>, message: string): void {
    setNoteRequest({ ...request, onConfirm: (note) => run(kind, message, note || undefined) });
  }

  return (
    <div className="shrink-0 border-t bg-background px-5 py-3 space-y-2">
      {invoice.status === 'DRAFT' && can('invoice.create') && (
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" className="gap-1.5" disabled={busy} onClick={() => run('submit', `${invoice.invoiceNumber} sent for approval`).catch(() => undefined)}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Submit for approval
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditOpen(true)}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
        </div>
      )}

      {canReview && (
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" className="gap-1.5" disabled={busy} onClick={() => ask('approve', {
            title: hasVariance ? `Approve ${invoice.invoiceNumber} with variance?` : `Approve ${invoice.invoiceNumber}?`,
            description: hasVariance
              ? "This bill doesn't match the PO and receipts. Explain why it should be paid anyway."
              : 'The bill matches the PO and receipts. Payments can be requested once approved.',
            confirmLabel: 'Approve',
            noteRequired: hasVariance,
          }, `${invoice.invoiceNumber} approved`)}>
            <CheckCircle2 className="h-3.5 w-3.5" /> Approve
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive" disabled={busy} onClick={() => ask('reject', {
            title: `Reject ${invoice.invoiceNumber}?`,
            description: 'Tell the team what is wrong so the vendor can send a corrected bill.',
            confirmLabel: 'Reject',
            noteRequired: true,
            destructive: true,
          }, `${invoice.invoiceNumber} rejected`)}>
            <XCircle className="h-3.5 w-3.5" /> Reject
          </Button>
        </div>
      )}
      {invoice.status === 'PENDING_APPROVAL' && !canReview && (
        <p className="text-xs text-muted-foreground">
          Awaiting approval.{isOwnInvoice ? ' Another team member must review bills you enter.' : ''}
        </p>
      )}

      {invoice.unscheduledAmount > 0 && can('payment.request') && (
        <Button size="sm" className="w-full gap-1.5" onClick={() => setPaymentOpen(true)}>
          <HandCoins className="h-3.5 w-3.5" /> Request payment
        </Button>
      )}

      {canCancel && (
        <Button size="sm" variant="ghost" className="w-full gap-1.5 text-muted-foreground hover:text-destructive" disabled={busy} onClick={() => ask('cancel', {
          title: `Cancel ${invoice.invoiceNumber}?`,
          description: 'Use this for duplicates or bills entered by mistake. Cancelled bills free their PO quantities.',
          confirmLabel: 'Cancel invoice',
          noteRequired: false,
          destructive: true,
        }, `${invoice.invoiceNumber} cancelled`)}>
          <Ban className="h-3.5 w-3.5" /> Cancel invoice
        </Button>
      )}

      <InvoiceFormDialog open={editOpen} onOpenChange={setEditOpen} invoice={invoice} />
      <PaymentRequestDialog invoice={paymentOpen ? invoice : null} onClose={() => setPaymentOpen(false)} />
      <ReviewNoteDialog request={noteRequest} onClose={() => setNoteRequest(null)} />
    </div>
  );
}
