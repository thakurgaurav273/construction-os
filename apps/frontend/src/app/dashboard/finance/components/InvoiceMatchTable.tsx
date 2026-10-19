'use client';

import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { MATCH_ISSUE_LABELS } from '@/features/finance/constants';
import type { InvoiceDetail, MatchIssue } from '@/features/finance/types';

const qty = (value: number | null, unit: string): string => (value === null ? '—' : `${value} ${unit}`);

function cellTone(issues: MatchIssue[], issue: MatchIssue): string {
  return issues.includes(issue) ? 'text-amber-700 dark:text-amber-400 font-semibold' : '';
}

/** Ordered vs received vs billed, per line: the three documents a payable is checked against. */
export function InvoiceMatchTable({ invoice }: { invoice: InvoiceDetail }): React.ReactElement {
  const matchByItem = new Map(invoice.match.lines.map((line) => [line.invoiceItemId, line]));
  const isMatched = invoice.match.status !== 'NO_PO';

  if (invoice.items.length === 0) {
    return <p className="text-xs text-muted-foreground">No line detail was recorded for this bill (entered before line-level invoicing).</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="text-left py-2 pr-2 font-medium">Line</th>
            {isMatched && <th className="text-right py-2 px-2 font-medium whitespace-nowrap">Received</th>}
            {isMatched && <th className="text-right py-2 px-2 font-medium whitespace-nowrap">Billable</th>}
            <th className="text-right py-2 px-2 font-medium whitespace-nowrap">Billed</th>
            {isMatched && <th className="text-right py-2 px-2 font-medium whitespace-nowrap">PO rate</th>}
            <th className="text-right py-2 px-2 font-medium whitespace-nowrap">Rate</th>
            <th className="text-right py-2 pl-2 font-medium whitespace-nowrap">Total</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item) => {
            const line = matchByItem.get(item.id);
            const issues = line?.issues ?? [];
            return (
              <tr key={item.id} className="border-b last:border-0 align-top">
                <td className="py-2 pr-2">
                  <p className="font-medium text-foreground">{item.description}</p>
                  {isMatched && (issues.length > 0 ? (
                    <p className="text-amber-700 dark:text-amber-400">{issues.map((issue) => MATCH_ISSUE_LABELS[issue]).join(' · ')}</p>
                  ) : (
                    <p className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-3 w-3" /> Matches</p>
                  ))}
                </td>
                {isMatched && <td className="text-right py-2 px-2 whitespace-nowrap">{qty(line?.receivedQuantity ?? null, item.unit)}</td>}
                {isMatched && <td className="text-right py-2 px-2 whitespace-nowrap">{qty(line?.billableQuantity ?? null, item.unit)}</td>}
                <td className={`text-right py-2 px-2 whitespace-nowrap ${cellTone(issues, 'QTY_EXCEEDS_RECEIVED')}`}>{item.quantity} {item.unit}</td>
                {isMatched && <td className="text-right py-2 px-2 whitespace-nowrap">{line?.poRate !== null && line?.poRate !== undefined ? formatCurrency(line.poRate) : '—'}</td>}
                <td className={`text-right py-2 px-2 whitespace-nowrap ${cellTone(issues, 'RATE_ABOVE_PO')}`}>
                  {formatCurrency(item.rate)}
                  <span className={`block text-muted-foreground ${cellTone(issues, 'TAX_MISMATCH')}`}>GST {item.taxPercent}%</span>
                </td>
                <td className="text-right py-2 pl-2 font-semibold whitespace-nowrap">{formatCurrency(item.total)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
