'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Badge, Button, ScrollArea, Sheet, SheetContent, SheetTitle, Skeleton } from '@sitepilot/ui';
import { AlertTriangle, ClipboardList, ExternalLink, Package, Scale, Users, X, Ban, Lock } from 'lucide-react';
import { useRfq, useRfqTransition } from '@/hooks/api/use-procurement';
import { useCan } from '@/hooks/api/use-access';
import { getApiErrorMessage } from '@/lib/api/errors';
import type { RfqDetail } from '@/features/procurement/types';
import { InviteVendorsDialog } from '@/features/procurement/components/InviteVendorsDialog';
import { RecordQuoteDialog, type RecordQuoteRequest } from '@/features/procurement/components/RecordQuoteDialog';
import { RfqQuoteComparison } from './RfqQuoteComparison';
import { StatusBadge } from './StatusBadge';
import { formatCurrency } from './procurement-format';
import { RecordHistory } from '@/features/audit/components/RecordHistory';

interface RfqDrawerProps {
  rfqId: string | null;
  open: boolean;
  onClose: () => void;
  onOpenOrder: (orderId: string) => void;
}

const formatDay = (value: string): string => format(new Date(value), 'dd MMM yyyy');

export function RfqDrawer({ rfqId, open, onClose, onOpenOrder }: RfqDrawerProps): React.ReactElement {
  const { data: rfq, isLoading, isError, refetch } = useRfq(open ? rfqId : null);
  const transition = useRfqTransition();
  const canManage = useCan()('rfq.manage');
  const [inviteRfq, setInviteRfq] = useState<RfqDetail | null>(null);
  const [quoteRequest, setQuoteRequest] = useState<RecordQuoteRequest | null>(null);

  async function runTransition(kind: 'close' | 'cancel'): Promise<void> {
    if (!rfq) return;
    try {
      await transition.mutateAsync({ id: rfq.id, transition: kind });
      toast.success(kind === 'close' ? `${rfq.rfqNumber} closed for evaluation` : `${rfq.rfqNumber} cancelled`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't update the RFQ. Try again."));
    }
  }

  return (
    <Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col overflow-hidden [&>button:last-child]:hidden">
        <SheetTitle className="sr-only">{rfq ? `RFQ ${rfq.rfqNumber}` : 'RFQ'}</SheetTitle>
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-20 rounded-md p-1.5 text-muted-foreground hover:bg-muted transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {isLoading && (
          <div className="p-5 space-y-4">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-72" />
            {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-28 w-full rounded-xl" />)}
          </div>
        )}

        {isError && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive/60" />
            <p className="text-sm font-medium">Unable to load this RFQ.</p>
            <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
          </div>
        )}

        {rfq && (
          <>
            <div className="shrink-0 border-b bg-muted/30 px-5 py-4 pr-10">
              <p className="text-xl font-bold tracking-tight">{rfq.rfqNumber}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{rfq.title}</p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <StatusBadge kind="rfq" value={rfq.status} />
                <StatusBadge kind="priority" value={rfq.priority} />
                <Badge variant="secondary">{rfq.category}</Badge>
                {rfq.isClosingSoon && <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Closing soon</span>}
                {rfq.isPastClosing && <span className="text-xs font-semibold text-red-600 dark:text-red-400">Past closing date</span>}
              </div>
            </div>

            <ScrollArea className="flex-1 min-h-0">
              <div className="p-5 space-y-4">
                {rfq.purchaseOrder && (
                  <button
                    type="button"
                    onClick={() => rfq.purchaseOrder && onOpenOrder(rfq.purchaseOrder.id)}
                    className="flex w-full items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-left transition-colors hover:bg-emerald-100 dark:border-emerald-800/40 dark:bg-emerald-950/20"
                  >
                    <span className="text-sm">
                      Awarded to <span className="font-semibold">{rfq.awardedVendor?.name}</span> · {rfq.purchaseOrder.poNumber}
                    </span>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}

                <section className="rounded-xl border bg-card p-4">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                    <ClipboardList className="h-4 w-4 text-muted-foreground" /> Details
                  </h4>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <div><dt className="text-xs text-muted-foreground">Project</dt><dd className="font-medium">{rfq.project?.name ?? '—'}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Raised By</dt><dd className="font-medium">{rfq.createdBy?.name ?? '—'}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Issued</dt><dd className="font-medium">{formatDay(rfq.issuedDate)}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Closing</dt><dd className="font-medium">{formatDay(rfq.closingDate)}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Estimated Value</dt><dd className="font-medium">{rfq.estimatedValue ? formatCurrency(rfq.estimatedValue) : '—'}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Lowest Quote</dt><dd className="font-medium">{rfq.lowestQuote !== null ? formatCurrency(rfq.lowestQuote) : '—'}</dd></div>
                  </dl>
                  {rfq.description && <p className="mt-3 text-xs text-muted-foreground leading-relaxed">{rfq.description}</p>}
                </section>

                <section className="rounded-xl border bg-card p-4">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                    <Package className="h-4 w-4 text-muted-foreground" /> Items
                  </h4>
                  <ul className="space-y-1.5 text-sm">
                    {rfq.items.map((item) => (
                      <li key={item.id} className="flex justify-between gap-3">
                        <span className="truncate">{item.description}</span>
                        <span className="whitespace-nowrap text-muted-foreground">{item.quantity} {item.unit}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="rounded-xl border bg-card p-4">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                    <Scale className="h-4 w-4 text-muted-foreground" /> Quotes · {rfq.quotesReceived}/{rfq.vendorsInvited}
                  </h4>
                  <RfqQuoteComparison rfq={rfq} onRecordQuote={(invitation) => setQuoteRequest({ rfq, invitation })} />
                </section>
                <RecordHistory entityType="rfq" entityId={rfq.id} />
              </div>
            </ScrollArea>

            {canManage && (rfq.status === 'OPEN' || rfq.status === 'EVALUATING') && (
              <div className="shrink-0 border-t bg-background px-5 py-3 flex flex-wrap items-center gap-2">
                {rfq.status === 'OPEN' && (
                  <>
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setInviteRfq(rfq)}>
                      <Users className="h-3.5 w-3.5" /> Invite vendors
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5" disabled={transition.isPending} onClick={() => runTransition('close')}>
                      <Lock className="h-3.5 w-3.5" /> Close for evaluation
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto gap-1.5 text-muted-foreground hover:text-destructive"
                  disabled={transition.isPending}
                  onClick={() => runTransition('cancel')}
                >
                  <Ban className="h-3.5 w-3.5" /> Cancel RFQ
                </Button>
              </div>
            )}

            <InviteVendorsDialog rfq={inviteRfq} onClose={() => setInviteRfq(null)} />
            <RecordQuoteDialog request={quoteRequest} onClose={() => setQuoteRequest(null)} />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
