'use client';

import React, { useState } from 'react';
import { Badge, Button, cn } from '@sitepilot/ui';
import { AlertTriangle, ChevronDown, ChevronRight, XCircle } from 'lucide-react';
import type { MeasurementImportItem } from '../../import-types';
import { formatQuantity } from '../../utils/format';

const dims = (values: (number | null)[]): string => values.filter((value): value is number => value !== null).join(' × ');

/** One BOQ item from the sheet: where it lands, what it adds up to, and anything worth checking. */
export function MeasurementImportItemRow({ item }: { item: MeasurementImportItem }): React.ReactElement {
  const [open, setOpen] = useState(false);
  const unit = item.contractItem?.unit ?? '';
  return (
    <li className={cn('space-y-2 px-4 py-3', item.error && 'bg-destructive/5')}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-start gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          disabled={item.rows.length === 0}
        >
          {open ? <ChevronDown className="mt-0.5 h-4 w-4 shrink-0" /> : <ChevronRight className="mt-0.5 h-4 w-4 shrink-0" />}
          <span className="min-w-0">
            <span className="block text-sm font-medium">Item {item.itemNo}</span>
            <span className="line-clamp-1 block text-xs text-muted-foreground">{item.contractItem?.description ?? item.heading}</span>
          </span>
        </button>
        <div className="flex flex-wrap items-center gap-2 pl-6 text-sm sm:pl-0">
          <span className="text-xs text-muted-foreground">{item.rows.length} rows</span>
          {item.replacesRows > 0 && <Badge variant="outline">replaces {item.replacesRows}</Badge>}
          <span className="font-medium tabular-nums">{formatQuantity(item.measuredQuantity)} {unit}</span>
          {item.sheetTotals.payable !== null && <span className="text-xs text-muted-foreground">sheet {formatQuantity(item.sheetTotals.payable)}</span>}
        </div>
      </div>
      {item.error && <p className="flex items-start gap-1.5 pl-6 text-xs text-destructive"><XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {item.error}</p>}
      {item.warnings.map((warning) => (
        <p key={warning} className="flex items-start gap-1.5 pl-6 text-xs text-amber-700 dark:text-amber-400"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {warning}</p>
      ))}
      {open && (
        <div className="ml-6 overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[520px] text-xs">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr><th className="px-3 py-2 text-left font-medium">Row</th><th className="px-3 py-2 text-left font-medium">Description</th><th className="px-3 py-2 text-left font-medium">Measured as</th><th className="px-3 py-2 text-right font-medium">Quantity</th></tr>
            </thead>
            <tbody className="divide-y">
              {item.rows.map((row) => (
                <tr key={row.rowNumber} className={row.isDeduction ? 'text-destructive' : ''}>
                  <td className="px-3 py-1.5 tabular-nums text-muted-foreground">{row.rowNumber}</td>
                  <td className="px-3 py-1.5">{row.description}{row.note && <span className="block text-muted-foreground">{row.note}</span>}</td>
                  <td className="px-3 py-1.5 text-muted-foreground">{row.type === 'DIMENSIONS' ? dims([row.nos, row.length, row.breadth, row.height]) : 'Quantity'}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{row.isDeduction ? '−' : ''}{formatQuantity(row.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </li>
  );
}
