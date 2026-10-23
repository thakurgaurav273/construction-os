'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Progress } from '@sitepilot/ui';
import { ExternalLink, HandCoins, Undo2 } from 'lucide-react';
import { ReviewNoteDialog, type ReviewNoteRequest } from '@/components/shared/ReviewNoteDialog';
import { useCan } from '@/hooks/api/use-access';
import { useVoidReceipt } from '@/hooks/api/use-billing';
import { getApiErrorMessage } from '@/lib/api/errors';
import type { RaBillDetail, Settlement } from '../types';
import { formatAmount } from '../utils/format';
import { PAYMENT_METHODS } from '../validation/settlement.schema';
import { RecordReceiptDialog } from './RecordReceiptDialog';

const day = (value: string): string => new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
const methodLabel = (method: string): string => PAYMENT_METHODS.find((option) => option.value === method)?.label ?? method;

const INVOICE_STATUS: Record<string, string> = {
  APPROVED: 'Approved, awaiting payment',
  PARTIALLY_PAID: 'Partly paid',
  PAID: 'Paid',
  CANCELLED: 'Cancelled',
};

function Figures({ items }: { items: { label: string; value: string; tone?: string }[] }): React.ReactElement {
  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <p className="text-xs text-muted-foreground">{item.label}</p>
          <p className={`truncate text-sm font-semibold tabular-nums ${item.tone ?? ''}`}>{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function PayableView({ settlement }: { settlement: Extract<Settlement, { kind: 'payable' }> }): React.ReactElement {
  const canViewFinance = useCan()('finance.view');
  const { invoice } = settlement;
  if (!invoice) return <p className="text-sm text-muted-foreground">Nothing was owed on this bill, so no vendor bill was raised.</p>;
  const paidPercent = invoice.totalAmount > 0 ? Math.round((invoice.paidAmount / invoice.totalAmount) * 100) : 0;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">Vendor bill {invoice.invoiceNumber}</p>
          <p className="text-xs text-muted-foreground">{INVOICE_STATUS[invoice.status] ?? invoice.status}{settlement.dueDate && ` · due ${day(settlement.dueDate)}`}</p>
        </div>
        {canViewFinance && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/finance?invoice=${invoice.id}`}><ExternalLink className="mr-1 h-3.5 w-3.5" /> Finance</Link>
          </Button>
        )}
      </div>
      <Figures items={[
        { label: 'To pay', value: formatAmount(invoice.totalAmount) },
        { label: 'Paid', value: formatAmount(invoice.paidAmount) },
        { label: 'Balance', value: formatAmount(invoice.balanceDue) },
      ]} />
      <Progress value={paidPercent} aria-label="Paid" className="h-1.5" />
      <p className="text-xs text-muted-foreground">Payments are requested, approved and released in Finance.</p>
    </div>
  );
}

function ReceivableView({ bill, settlement }: { bill: RaBillDetail; settlement: Extract<Settlement, { kind: 'receivable' }> }): React.ReactElement {
  const canRecord = useCan()('billing.receipts');
  const voidReceipt = useVoidReceipt();
  const [recordOpen, setRecordOpen] = useState(false);
  const [noteRequest, setNoteRequest] = useState<ReviewNoteRequest | null>(null);
  const receivedPercent = bill.netAmount > 0 ? Math.round((settlement.received / bill.netAmount) * 100) : 0;

  function askToVoid(receiptId: string, amount: number): void {
    setNoteRequest({
      title: `Void the receipt of ${formatAmount(amount)}?`,
      description: 'The receipt stays in the history but no longer counts. The amount becomes outstanding again.',
      confirmLabel: 'Void Receipt',
      noteRequired: true,
      destructive: true,
      onConfirm: async (note) => {
        try {
          await voidReceipt.mutateAsync({ billId: bill.id, receiptId, note });
          toast.success('Receipt voided');
        } catch (error) {
          toast.error(getApiErrorMessage(error, "Couldn't void the receipt. Try again."));
          throw error;
        }
      },
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {settlement.invoiceNumber && <span>Invoice {settlement.invoiceNumber}</span>}
        {settlement.dueDate && <span>Due {day(settlement.dueDate)}</span>}
        {settlement.daysOverdue > 0 && <Badge variant="destructive">{settlement.daysOverdue} days overdue</Badge>}
        {settlement.outstanding === 0 && <Badge variant="success">Fully received</Badge>}
      </div>
      <Figures items={[
        { label: 'Receivable', value: formatAmount(bill.netAmount) },
        { label: 'Received', value: formatAmount(settlement.received) },
        { label: 'Outstanding', value: formatAmount(settlement.outstanding), tone: settlement.daysOverdue > 0 ? 'text-destructive' : '' },
      ]} />
      <Progress value={receivedPercent} aria-label="Received" className="h-1.5" />

      {settlement.receipts.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {settlement.receipts.map((receipt) => (
            <li key={receipt.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <div className={`min-w-0 flex-1 ${receipt.voided ? 'text-muted-foreground line-through' : ''}`}>
                <p className="font-medium tabular-nums">{formatAmount(receipt.amount)}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {day(receipt.receivedDate)} · {methodLabel(receipt.method)}{receipt.reference && ` · ${receipt.reference}`}
                </p>
              </div>
              {receipt.voided ? (
                <span className="text-xs text-muted-foreground" title={receipt.voidNote ?? undefined}>Voided</span>
              ) : canRecord && (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" aria-label={`Void receipt of ${formatAmount(receipt.amount)}`} onClick={() => askToVoid(receipt.id, receipt.amount)}>
                  <Undo2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canRecord && settlement.outstanding > 0 && (
        <Button className="w-full" variant="outline" onClick={() => setRecordOpen(true)}>
          <HandCoins className="mr-2 h-4 w-4" /> Record Money Received
        </Button>
      )}
      <RecordReceiptDialog billId={bill.id} billCode={bill.code} outstanding={settlement.outstanding} open={recordOpen} onOpenChange={setRecordOpen} />
      <ReviewNoteDialog request={noteRequest} onClose={() => setNoteRequest(null)} />
    </div>
  );
}

/** Where the money stands once a bill is certified: a vendor bill to pay, or money to collect from the client. */
export function SettlementCard({ bill }: { bill: RaBillDetail }): React.ReactElement | null {
  const { settlement } = bill;
  if (!settlement) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{settlement.kind === 'payable' ? 'Payment to subcontractor' : 'Payment from client'}</CardTitle>
        <CardDescription>{settlement.kind === 'payable' ? 'Raised in Finance as an approved bill.' : 'Track what the client has paid against this bill.'}</CardDescription>
      </CardHeader>
      <CardContent>
        {settlement.kind === 'payable' ? <PayableView settlement={settlement} /> : <ReceivableView bill={bill} settlement={settlement} />}
      </CardContent>
    </Card>
  );
}
