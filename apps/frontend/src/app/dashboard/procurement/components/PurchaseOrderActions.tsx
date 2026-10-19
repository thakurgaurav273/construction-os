'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@sitepilot/ui';
import {
  Ban, CalendarPlus, CheckCircle2, Copy, Loader2, PackageCheck, Pencil, Receipt, RotateCcw, Send, XCircle,
} from 'lucide-react';
import { usePurchaseOrderTransition, type PurchaseOrderTransition } from '@/hooks/api/use-procurement';
import { getApiErrorMessage } from '@/lib/api/errors';
import { useAuthStore } from '@/store/auth.store';
import { getOrderPermissions } from '@/features/procurement/utils/order-rules';
import type { PurchaseOrderDetail } from '@/features/procurement/types';
import { PurchaseOrderFormDialog } from '@/features/procurement/components/PurchaseOrderFormDialog';
import { ReviewNoteDialog, type ReviewNoteRequest } from '@/components/shared/ReviewNoteDialog';
import { ScheduleDeliveryDialog } from '@/features/procurement/components/ScheduleDeliveryDialog';
import { InvoiceFormDialog } from '@/features/finance/components/InvoiceFormDialog';

interface PurchaseOrderActionsProps {
  order: PurchaseOrderDetail;
  onReceive: () => void;
  /** Switches the drawer to another order, e.g. the copy created by Duplicate. */
  onOpenOrder: (orderId: string) => void;
}

export function PurchaseOrderActions({ order, onReceive, onOpenOrder }: PurchaseOrderActionsProps): React.ReactElement {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const transition = usePurchaseOrderTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [noteRequest, setNoteRequest] = useState<ReviewNoteRequest | null>(null);
  const permissions = getOrderPermissions(order, currentUserId);
  // Vendors bill for what arrived, so billing opens once anything has been received.
  const canRecordInvoice = order.status === 'APPROVED' && order.receivedPercent > 0 && !!order.vendor;

  async function runTransition(kind: PurchaseOrderTransition, successMessage: string, note?: string): Promise<void> {
    try {
      const updated = await transition.mutateAsync({ id: order.id, transition: kind, note });
      toast.success(successMessage.replace('{po}', updated.poNumber));
      if (kind === 'duplicate') onOpenOrder(updated.id);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't update the purchase order. Try again."));
      throw error;
    }
  }

  function askForNote(kind: PurchaseOrderTransition, request: Omit<ReviewNoteRequest, 'onConfirm'>, successMessage: string): void {
    setNoteRequest({ ...request, onConfirm: (note) => runTransition(kind, successMessage, note || undefined) });
  }

  const busy = transition.isPending;
  const spinner = <Loader2 className="h-3.5 w-3.5 animate-spin" />;

  return (
    <div className="shrink-0 border-t bg-background px-5 py-3 space-y-2">
      {permissions.canReview && (
        <div className="grid grid-cols-3 gap-2">
          <Button
            size="sm"
            className="gap-1.5"
            disabled={busy}
            onClick={() => askForNote('approve', {
              title: `Approve ${order.poNumber}?`,
              description: 'The vendor can be sent the order and deliveries scheduled.',
              confirmLabel: 'Approve',
              noteRequired: false,
            }, '{po} approved')}
          >
            {busy ? spinner : <CheckCircle2 className="h-3.5 w-3.5" />} Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={busy}
            onClick={() => askForNote('request-changes', {
              title: 'Request changes',
              description: 'The order returns to the requester for edits and resubmission.',
              confirmLabel: 'Send back',
              noteRequired: true,
            }, 'Changes requested on {po}')}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Changes
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-destructive hover:text-destructive"
            disabled={busy}
            onClick={() => askForNote('reject', {
              title: `Reject ${order.poNumber}?`,
              description: 'Rejected orders are closed. The requester can duplicate it to start again.',
              confirmLabel: 'Reject',
              noteRequired: true,
              destructive: true,
            }, '{po} rejected')}
          >
            <XCircle className="h-3.5 w-3.5" /> Reject
          </Button>
        </div>
      )}

      {order.status === 'PENDING' && permissions.isOwnOrder && (
        <p className="text-xs text-muted-foreground">Awaiting approval. Another team member must review orders you raise.</p>
      )}

      {permissions.canSubmit && (
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            className="gap-1.5"
            disabled={busy}
            onClick={() => runTransition('submit', '{po} submitted for approval').catch(() => undefined)}
          >
            {busy ? spinner : <Send className="h-3.5 w-3.5" />} Submit for approval
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditOpen(true)}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
        </div>
      )}

      {permissions.canRecordDelivery && (
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" className="gap-1.5" onClick={onReceive}>
            <PackageCheck className="h-3.5 w-3.5" /> Receive goods
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setScheduleOpen(true)}>
            <CalendarPlus className="h-3.5 w-3.5" /> Schedule delivery
          </Button>
        </div>
      )}

      {canRecordInvoice && (
        <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={() => setInvoiceOpen(true)}>
          <Receipt className="h-3.5 w-3.5" /> Record vendor invoice
        </Button>
      )}

      <div className="flex items-center justify-between gap-2">
        <Button
          size="sm"
          variant="ghost"
          className="gap-1.5"
          disabled={busy}
          onClick={() => runTransition('duplicate', 'Duplicated as {po}').catch(() => undefined)}
        >
          <Copy className="h-3.5 w-3.5" /> Duplicate
        </Button>
        {permissions.canCancel && (
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 text-muted-foreground hover:text-destructive"
            disabled={busy}
            onClick={() => askForNote('cancel', {
              title: `Cancel ${order.poNumber}?`,
              description: 'Open deliveries are cancelled too. This cannot be undone.',
              confirmLabel: 'Cancel order',
              noteRequired: false,
              destructive: true,
            }, '{po} cancelled')}
          >
            <Ban className="h-3.5 w-3.5" /> Cancel order
          </Button>
        )}
      </div>

      <PurchaseOrderFormDialog open={editOpen} onOpenChange={setEditOpen} order={order} />
      <ScheduleDeliveryDialog order={scheduleOpen ? order : null} onClose={() => setScheduleOpen(false)} />
      {order.vendor && (
        <InvoiceFormDialog
          open={invoiceOpen}
          onOpenChange={setInvoiceOpen}
          defaults={{ vendorId: order.vendor.id, purchaseOrderId: order.id }}
        />
      )}
      <ReviewNoteDialog request={noteRequest} onClose={() => setNoteRequest(null)} />
    </div>
  );
}
