'use client';

import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sitepilot/ui';
import { Search } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { INVOICE_STATUS_OPTIONS } from '@/features/finance/constants';
import type { Invoice } from '@/features/finance/types';
import { FinanceStatusBadge } from '@/features/finance/components/FinanceStatusBadge';

interface InvoicesTabProps {
  invoices: Invoice[];
  onSelect: (invoice: Invoice) => void;
}

/** "OVERDUE" and "PAYABLE" are derived views, not stored statuses. */
function matchesStatus(invoice: Invoice, filter: string): boolean {
  if (filter === 'all') return true;
  if (filter === 'OVERDUE') return invoice.isOverdue;
  if (filter === 'PAYABLE') return invoice.balanceDue > 0;
  return invoice.status === filter;
}

export function InvoicesTab({ invoices, onSelect }: InvoicesTabProps): React.ReactElement {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [match, setMatch] = useState('all');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return invoices.filter((invoice) => {
      const haystack = [invoice.invoiceNumber, invoice.vendorName, invoice.project?.name, invoice.purchaseOrder?.poNumber, invoice.category]
        .filter(Boolean).join(' ').toLowerCase();
      return (!term || haystack.includes(term))
        && matchesStatus(invoice, status)
        && (match === 'all' || invoice.matchStatus === match);
    });
  }, [invoices, search, status, match]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search invoice, vendor, PO, project..."
            aria-label="Search invoices"
            className="pl-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-48" aria-label="Invoice status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All invoices</SelectItem>
            <SelectItem value="PAYABLE">Balance due</SelectItem>
            <SelectItem value="OVERDUE">Overdue</SelectItem>
            {INVOICE_STATUS_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={match} onValueChange={setMatch}>
          <SelectTrigger className="w-full sm:w-40" aria-label="Match status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any match</SelectItem>
            <SelectItem value="MATCHED">Matched</SelectItem>
            <SelectItem value="VARIANCE">Variance</SelectItem>
            <SelectItem value="NO_PO">No PO</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground">Showing {filtered.length} of {invoices.length} invoices</p>

      <div className="rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-muted-foreground">
                <th className="text-left px-4 py-3 font-medium whitespace-nowrap">Invoice</th>
                <th className="text-left px-4 py-3 font-medium whitespace-nowrap hidden 2xl:table-cell">Project</th>
                <th className="text-left px-4 py-3 font-medium whitespace-nowrap hidden md:table-cell">Match</th>
                <th className="text-right px-4 py-3 font-medium whitespace-nowrap">Total</th>
                <th className="text-right px-4 py-3 font-medium whitespace-nowrap hidden sm:table-cell">Balance</th>
                <th className="text-left px-4 py-3 font-medium whitespace-nowrap">Status</th>
                <th className="text-left px-4 py-3 font-medium whitespace-nowrap hidden md:table-cell">Due</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-muted-foreground">No invoices match your filters.</td>
                </tr>
              ) : filtered.map((invoice) => (
                <tr
                  key={invoice.id}
                  onClick={() => onSelect(invoice)}
                  onKeyDown={(event) => { if (event.key === 'Enter') onSelect(invoice); }}
                  tabIndex={0}
                  aria-label={`Open invoice ${invoice.invoiceNumber}`}
                  className="border-b last:border-0 hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium whitespace-nowrap">{invoice.invoiceNumber}</p>
                    <p className="text-xs text-muted-foreground max-w-[220px] truncate">
                      {invoice.vendorName}{invoice.purchaseOrder ? ` · ${invoice.purchaseOrder.poNumber}` : ''}
                    </p>
                  </td>
                  <td className="px-4 py-3 hidden 2xl:table-cell text-xs text-muted-foreground max-w-[180px] truncate">{invoice.project?.name ?? '—'}</td>
                  <td className="px-4 py-3 hidden md:table-cell"><FinanceStatusBadge kind="match" value={invoice.matchStatus} showIcon={false} /></td>
                  <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">{formatCurrency(invoice.totalAmount)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap hidden sm:table-cell">
                    {invoice.balanceDue > 0 ? formatCurrency(invoice.balanceDue) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <FinanceStatusBadge kind="invoice" value={invoice.isOverdue ? 'OVERDUE' : invoice.status} />
                  </td>
                  <td className={`px-4 py-3 hidden md:table-cell text-xs whitespace-nowrap ${invoice.isOverdue ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-muted-foreground'}`}>
                    {format(new Date(invoice.dueDate), 'dd MMM yyyy')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
