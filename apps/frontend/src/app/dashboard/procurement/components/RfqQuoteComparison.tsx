'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Badge, Button } from '@sitepilot/ui';
import { Award, PencilLine, XCircle } from 'lucide-react';
import { useAwardRfq, useDeclineQuote } from '@/hooks/api/use-procurement';
import { useCan } from '@/hooks/api/use-access';
import { getApiErrorMessage } from '@/lib/api/errors';
import type { RfqDetail, RfqInvitation } from '@/features/procurement/types';
import { formatCurrency } from './procurement-format';

const INVITATION_LABEL: Record<RfqInvitation['status'], string> = {
  INVITED: 'Awaiting quote',
  QUOTED: 'Quoted',
  DECLINED: 'Declined',
};

interface RfqQuoteComparisonProps {
  rfq: RfqDetail;
  onRecordQuote: (invitation: RfqInvitation) => void;
}

/** Quoted vendors first, cheapest on top, so the award decision reads top-down. */
function compareInvitations(a: RfqInvitation, b: RfqInvitation): number {
  if (a.quotedAmount !== null && b.quotedAmount !== null) return a.quotedAmount - b.quotedAmount;
  if (a.quotedAmount !== null) return -1;
  if (b.quotedAmount !== null) return 1;
  return a.vendor.name.localeCompare(b.vendor.name);
}

export function RfqQuoteComparison({ rfq, onRecordQuote }: RfqQuoteComparisonProps): React.ReactElement {
  const awardRfq = useAwardRfq();
  const declineQuote = useDeclineQuote();
  const [confirmAwardId, setConfirmAwardId] = useState<string | null>(null);
  const can = useCan();
  const isOpenForQuotes = rfq.status === 'OPEN' || rfq.status === 'EVALUATING';
  const invitations = [...rfq.invitations].sort(compareInvitations);

  async function handleAward(invitation: RfqInvitation): Promise<void> {
    try {
      const awarded = await awardRfq.mutateAsync({ id: rfq.id, invitationId: invitation.id });
      toast.success(`${rfq.rfqNumber} awarded to ${invitation.vendor.name}`, {
        description: awarded.purchaseOrder ? `Draft ${awarded.purchaseOrder.poNumber} created at the quoted rates.` : undefined,
      });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't award the RFQ. Try again."));
    } finally {
      setConfirmAwardId(null);
    }
  }

  async function handleDecline(invitation: RfqInvitation): Promise<void> {
    try {
      await declineQuote.mutateAsync({ id: rfq.id, invitationId: invitation.id });
      toast.success(`${invitation.vendor.name} marked as declined`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't update the invitation. Try again."));
    }
  }

  if (invitations.length === 0) {
    return <p className="text-xs text-muted-foreground">No vendors invited yet.</p>;
  }

  return (
    <div className="divide-y">
      {invitations.map((invitation) => {
        const isConfirming = confirmAwardId === invitation.id;
        const isExpired = !!invitation.validUntil && new Date(invitation.validUntil) < new Date(new Date().toDateString());
        return (
          <div key={invitation.id} className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-sm font-medium truncate">{invitation.vendor.name}</p>
                  {invitation.isLowest && <Badge variant="success" className="text-[10px]">Lowest</Badge>}
                  {invitation.isAwarded && <Badge variant="default" className="text-[10px] gap-1"><Award className="h-3 w-3" /> Awarded</Badge>}
                  {invitation.vendor.status === 'INACTIVE' && <Badge variant="outline" className="text-[10px]">Inactive</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {INVITATION_LABEL[invitation.status]}
                  {invitation.leadTimeDays !== null && ` · ${invitation.leadTimeDays}d lead time`}
                  {invitation.validUntil && ` · ${isExpired ? 'expired' : 'valid until'} ${format(new Date(invitation.validUntil), 'dd MMM')}`}
                </p>
                {invitation.notes && <p className="text-xs text-muted-foreground mt-0.5 truncate">{invitation.notes}</p>}
              </div>
              <p className="text-sm font-semibold whitespace-nowrap">
                {invitation.quotedAmount !== null ? formatCurrency(invitation.quotedAmount) : '—'}
              </p>
            </div>

            {isOpenForQuotes && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {can('rfq.award') && invitation.status === 'QUOTED' && !isExpired && invitation.vendor.status === 'ACTIVE' && (
                  isConfirming ? (
                    <>
                      <Button size="sm" className="h-7 text-xs" disabled={awardRfq.isPending} onClick={() => handleAward(invitation)}>
                        {awardRfq.isPending ? 'Awarding…' : 'Confirm award'}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setConfirmAwardId(null)}>Back</Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setConfirmAwardId(invitation.id)}>
                      <Award className="h-3 w-3" /> Award
                    </Button>
                  )
                )}
                {!isConfirming && can('rfq.manage') && (
                  <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => onRecordQuote(invitation)}>
                    <PencilLine className="h-3 w-3" /> {invitation.status === 'QUOTED' ? 'Update quote' : 'Record quote'}
                  </Button>
                )}
                {!isConfirming && can('rfq.manage') && invitation.status !== 'DECLINED' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1 text-xs text-muted-foreground hover:text-destructive"
                    disabled={declineQuote.isPending}
                    onClick={() => handleDecline(invitation)}
                  >
                    <XCircle className="h-3 w-3" /> Declined
                  </Button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
