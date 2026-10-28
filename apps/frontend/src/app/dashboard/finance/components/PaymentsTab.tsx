'use client';

import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sitepilot/ui';
import { formatCurrency } from '@/lib/utils';
import { PAYMENT_METHODS, PAYMENT_STATUS_OPTIONS } from '@/features/finance/constants';
import type { Payment } from '@/features/finance/types';
import { FinanceStatusBadge } from '@/features/finance/components/FinanceStatusBadge';
import { MobileCard, MobileCardList, useIncrementalItems } from '@/components/shared/MobileList';
import { PaymentRowActions } from './PaymentRowActions';

const METHOD_LABEL = new Map<string, string>(PAYMENT_METHODS.map((method) => [method.value, method.label.split(' (')[0]]));

interface PaymentsTabProps {
  payments: Payment[];
  onOpenInvoice: (invoiceId: string) => void;
}

export function PaymentsTab({ payments, onOpenInvoice }: PaymentsTabProps): React.ReactElement {
  const [status, setStatus] = useState('open');
  const filtered = useMemo(() => payments.filter((payment) => {
    if (status === 'all') return true;
    if (status === 'open') return payment.status === 'PENDING' || payment.status === 'APPROVED';
    return payment.status === status;
  }), [payments, status]);
  const phoneList = useIncrementalItems(filtered, status);
  const emptyMessage = status === 'open' ? 'Nothing waiting. Payments appear here once requested against an approved invoice.' : 'No payments match this filter.';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Showing {filtered.length} of {payments.length} payments</p>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-48" aria-label="Payment status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Needs action</SelectItem>
            <SelectItem value="all">All payments</SelectItem>
            {PAYMENT_STATUS_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <MobileCardList
        items={phoneList.visible}
        getKey={(payment) => payment.id}
        hasMore={phoneList.hasMore}
        onLoadMore={phoneList.loadMore}
        empty={<div className="rounded-xl border py-16 text-center text-sm text-muted-foreground">{emptyMessage}</div>}
        renderCard={(payment) => {
          const invoiceId = payment.invoice?.id;
          const hasActions = payment.status === 'PENDING' || payment.status === 'APPROVED';
          return (
            <MobileCard
              onClick={invoiceId ? () => onOpenInvoice(invoiceId) : undefined}
              title={payment.paymentNumber}
              subtitle={`${payment.vendorName}${payment.invoice ? ` · ${payment.invoice.invoiceNumber}` : ''}`}
              aside={<span className="text-sm font-semibold">{formatCurrency(payment.amount)}</span>}
              meta={[
                { label: 'Status', value: <FinanceStatusBadge kind="payment" value={payment.status} /> },
                {
                  label: payment.paidDate ? 'Paid' : 'Due',
                  value: (
                    <span className={payment.isOverdue ? 'text-red-600 dark:text-red-400 font-semibold' : undefined}>
                      {format(new Date(payment.paidDate ?? payment.dueDate), 'dd MMM yyyy')}
                    </span>
                  ),
                },
                { label: 'Method', value: METHOD_LABEL.get(payment.method) ?? payment.method },
                { label: 'Project', value: payment.project?.name ?? '—' },
              ]}
              footer={hasActions ? <PaymentRowActions payment={payment} /> : undefined}
            />
          );
        }}
      />

      <div className="hidden rounded-xl border overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-muted-foreground">
                <th className="text-left px-4 py-3 font-medium whitespace-nowrap">Payment</th>
                <th className="text-left px-4 py-3 font-medium whitespace-nowrap hidden 2xl:table-cell">Project</th>
                <th className="text-right px-4 py-3 font-medium whitespace-nowrap">Amount</th>
                <th className="text-left px-4 py-3 font-medium whitespace-nowrap">Status</th>
                <th className="text-left px-4 py-3 font-medium whitespace-nowrap hidden md:table-cell">Date</th>
                <th className="text-left px-4 py-3 font-medium whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-muted-foreground">
                    {emptyMessage}
                  </td>
                </tr>
              ) : filtered.map((payment) => {
                const invoiceId = payment.invoice?.id;
                return (
                  <tr
                    key={payment.id}
                    onClick={() => invoiceId && onOpenInvoice(invoiceId)}
                    className={`border-b last:border-0 transition-colors ${invoiceId ? 'hover:bg-muted/40 cursor-pointer' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium whitespace-nowrap">{payment.paymentNumber}</p>
                      <p className="text-xs text-muted-foreground max-w-[220px] truncate">
                        {payment.vendorName}{payment.invoice ? ` · ${payment.invoice.invoiceNumber}` : ''}
                      </p>
                    </td>
                    <td className="px-4 py-3 hidden 2xl:table-cell text-xs text-muted-foreground max-w-[180px] truncate">{payment.project?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">{formatCurrency(payment.amount)}</td>
                    <td className="px-4 py-3"><FinanceStatusBadge kind="payment" value={payment.status} /></td>
                    <td className={`px-4 py-3 hidden md:table-cell text-xs whitespace-nowrap ${payment.isOverdue ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-muted-foreground'}`}>
                      {payment.paidDate ? `Paid ${format(new Date(payment.paidDate), 'dd MMM')}` : `Due ${format(new Date(payment.dueDate), 'dd MMM')}`}
                      <span className="block font-normal text-muted-foreground">{METHOD_LABEL.get(payment.method) ?? payment.method}{payment.reference ? ` · ${payment.reference}` : ''}</span>
                    </td>
                    <td className="px-4 py-3"><PaymentRowActions payment={payment} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
