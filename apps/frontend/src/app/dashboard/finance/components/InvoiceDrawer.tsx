'use client';

import Link from 'next/link';
import React from 'react';
import { format } from 'date-fns';
import { Button, Progress, ScrollArea, Sheet, SheetContent, SheetTitle, Skeleton } from '@sitepilot/ui';
import { AlertTriangle, ClipboardList, GitBranch, Landmark, MessageSquareWarning, Scale, X } from 'lucide-react';
import { useInvoice } from '@/hooks/api/use-finance';
import { formatCurrency } from '@/lib/utils';
import { FinanceStatusBadge } from '@/features/finance/components/FinanceStatusBadge';
import { InvoiceActions } from './InvoiceActions';
import { InvoiceMatchTable } from './InvoiceMatchTable';
import { PaymentRowActions } from './PaymentRowActions';
import { RecordHistory } from '@/features/audit/components/RecordHistory';

interface InvoiceDrawerProps {
  invoiceId: string | null;
  onClose: () => void;
}

const formatDay = (value: string): string => format(new Date(value), 'dd MMM yyyy');

function Section({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }): React.ReactElement {
  return (
    <section className="rounded-xl border bg-card p-4">
      <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
        <Icon className="h-4 w-4 text-muted-foreground" /> {title}
      </h4>
      {children}
    </section>
  );
}

function Amount({ label, value, tone = '' }: { label: string; value: string; tone?: string }): React.ReactElement {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-sm font-semibold mt-0.5 ${tone}`}>{value}</p>
    </div>
  );
}

export function InvoiceDrawer({ invoiceId, onClose }: InvoiceDrawerProps): React.ReactElement {
  const { data: invoice, isLoading, isError, refetch } = useInvoice(invoiceId);
  const paidPercent = invoice && invoice.totalAmount > 0 ? Math.round((invoice.paidAmount / invoice.totalAmount) * 100) : 0;
  const showReviewNote = invoice?.reviewNote && ['REJECTED', 'APPROVED', 'PARTIALLY_PAID', 'PAID'].includes(invoice.status);

  return (
    <Sheet open={!!invoiceId} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col overflow-hidden [&>button:last-child]:hidden">
        <SheetTitle className="sr-only">{invoice ? `Invoice ${invoice.invoiceNumber}` : 'Invoice'}</SheetTitle>
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
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-72" />
            {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-32 w-full rounded-xl" />)}
          </div>
        )}

        {isError && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive/60" />
            <p className="text-sm font-medium">Unable to load this invoice.</p>
            <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
          </div>
        )}

        {invoice && (
          <>
            <div className="shrink-0 border-b bg-muted/30 px-5 py-4 pr-10">
              <p className="text-xl font-bold tracking-tight">{invoice.invoiceNumber}</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {invoice.vendorName} · {invoice.project?.name ?? 'No project'}
                {invoice.purchaseOrder && ` · ${invoice.purchaseOrder.poNumber}`}
              </p>
              {invoice.source && (
                <Link
                  href={invoice.source.raBillId ? `/dashboard/billing/ra-bills/${invoice.source.raBillId}` : `/dashboard/billing/contracts/${invoice.source.contractId}`}
                  className="mt-1 inline-block text-xs font-medium text-primary hover:underline"
                >
                  Raised from {invoice.source.label} in Billing
                </Link>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <FinanceStatusBadge kind="invoice" value={invoice.status} />
                {invoice.isOverdue && <FinanceStatusBadge kind="invoice" value="OVERDUE" />}
                <FinanceStatusBadge kind="match" value={invoice.match.status} />
              </div>
            </div>

            <ScrollArea className="flex-1 min-h-0">
              <div className="p-5 space-y-4">
                {showReviewNote && (
                  <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/40 dark:bg-amber-950/20">
                    <MessageSquareWarning className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold">{invoice.reviewedBy?.name ?? 'Reviewer'} {invoice.status === 'REJECTED' ? 'rejected this bill' : 'noted on approval'}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{invoice.reviewNote}</p>
                    </div>
                  </div>
                )}

                <Section icon={ClipboardList} title="Summary">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3">
                    <Amount label="Invoice total" value={formatCurrency(invoice.totalAmount)} />
                    <Amount label="Paid" value={formatCurrency(invoice.paidAmount)} />
                    <Amount label="Balance due" value={formatCurrency(invoice.balanceDue)} tone={invoice.isOverdue ? 'text-red-600 dark:text-red-400' : ''} />
                    <Amount
                      label="Due"
                      value={`${formatDay(invoice.dueDate)}${invoice.isOverdue ? ` · ${invoice.daysOverdue}d late` : ''}`}
                      tone={invoice.isOverdue ? 'text-red-600 dark:text-red-400' : ''}
                    />
                    <Amount label="Invoice date" value={formatDay(invoice.issuedDate)} />
                    <Amount label="Taxable value" value={formatCurrency(invoice.amount)} />
                    <Amount label="GST" value={formatCurrency(invoice.taxAmount)} />
                    <Amount label="Entered by" value={invoice.createdBy?.name ?? '—'} />
                  </div>
                  {invoice.paidAmount > 0 && (
                    <div className="mt-3 flex items-center gap-3">
                      <Progress value={paidPercent} className="h-1.5 flex-1" />
                      <span className="text-xs font-semibold">{paidPercent}% paid</span>
                    </div>
                  )}
                  {(invoice.description || invoice.notes) && (
                    <p className="mt-3 text-xs text-muted-foreground leading-relaxed">{[invoice.description, invoice.notes].filter(Boolean).join(' · ')}</p>
                  )}
                </Section>

                <Section icon={Scale} title={invoice.match.status === 'NO_PO' ? 'Lines' : '3-way match: PO · receipts · invoice'}>
                  <InvoiceMatchTable invoice={invoice} />
                </Section>

                <Section icon={Landmark} title="Payments">
                  {invoice.payments.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {invoice.unscheduledAmount > 0 ? 'No payments yet. Request one to start the release approval.' : 'Payments can be requested once the bill is approved.'}
                    </p>
                  ) : (
                    <div className="divide-y">
                      {invoice.payments.map((payment) => (
                        <div key={payment.id} className="py-2.5 first:pt-0 last:pb-0 space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium">{payment.paymentNumber} · {formatCurrency(payment.amount)}</p>
                              <p className="text-xs text-muted-foreground">
                                {payment.paidDate ? `Paid ${formatDay(payment.paidDate)}` : `Pay by ${formatDay(payment.dueDate)}`}
                                {payment.reference && ` · ${payment.reference}`}
                                {payment.requestedBy && ` · requested by ${payment.requestedBy.name}`}
                              </p>
                              {payment.reviewNote && <p className="text-xs text-muted-foreground">{payment.reviewNote}</p>}
                            </div>
                            <FinanceStatusBadge kind="payment" value={payment.status} />
                          </div>
                          <PaymentRowActions payment={payment} />
                        </div>
                      ))}
                    </div>
                  )}
                </Section>

                <Section icon={GitBranch} title="Activity">
                  {invoice.timeline.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No recorded activity for this bill.</p>
                  ) : invoice.timeline.map((event, index) => (
                    <div key={event.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span className="h-3 w-3 rounded-full shrink-0 bg-emerald-500 ring-4 ring-emerald-500/20" />
                        {index < invoice.timeline.length - 1 && <span className="w-0.5 flex-1 min-h-[28px] bg-border" />}
                      </div>
                      <div className="pb-4">
                        <p className="text-sm font-medium leading-none">{event.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{event.actor} · {format(new Date(event.date), 'dd MMM yyyy, HH:mm')}</p>
                        {event.description && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{event.description}</p>}
                      </div>
                    </div>
                  ))}
                </Section>
                <RecordHistory entityType="invoice" entityId={invoice.id} />
              </div>
            </ScrollArea>

            <InvoiceActions invoice={invoice} />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
