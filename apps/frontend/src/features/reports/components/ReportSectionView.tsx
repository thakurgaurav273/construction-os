import React from 'react';
import { cn } from '@sitepilot/ui';
import { formatCell } from '../report-presentation';
import type { ReportSection, ValueKind } from '../types';

/** The preview stays light; every row is in the downloaded files. */
const PREVIEW_ROWS = 50;

/** Names wrap; dates and figures stay on one line. */
const CELL_CLASSES: Record<ValueKind, string> = {
  text: 'text-left',
  date: 'whitespace-nowrap text-left',
  number: 'whitespace-nowrap text-right',
  money: 'whitespace-nowrap text-right',
  percent: 'whitespace-nowrap text-right',
};

export function ReportSectionView({ section, currency }: { section: ReportSection; currency: string }): React.ReactElement {
  const table = section.table;
  return (
    <section className="space-y-2">
      <div>
        <h3 className="font-semibold">{section.title}</h3>
        {section.description && <p className="text-xs text-muted-foreground">{section.description}</p>}
      </div>
      {section.bullets && (
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
        </ul>
      )}
      {table && table.rows.length === 0 && <p className="text-sm italic text-muted-foreground">{table.emptyText}</p>}
      {table && table.rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>{table.columns.map((column) => <th key={column.key} className={cn('whitespace-nowrap px-3 py-2 font-medium', CELL_CLASSES[column.kind])}>{column.label}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {table.rows.slice(0, PREVIEW_ROWS).map((row, index) => (
                <tr key={index}>
                  {table.columns.map((column) => (
                    <td key={column.key} className={cn('px-3 py-1.5 tabular-nums', CELL_CLASSES[column.kind])}>{formatCell(row[column.key], column.kind, currency)}</td>
                  ))}
                </tr>
              ))}
              {table.totals && (
                <tr className="bg-muted/30 font-semibold">
                  {table.columns.map((column) => (
                    <td key={column.key} className={cn('px-3 py-1.5 tabular-nums', CELL_CLASSES[column.kind])}>
                      {table.totals?.[column.key] === undefined ? '' : formatCell(table.totals[column.key], column.kind, currency)}
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {table && table.rows.length > PREVIEW_ROWS && (
        <p className="text-xs text-muted-foreground">Showing {PREVIEW_ROWS} of {table.rows.length} rows. Download the report for the rest.</p>
      )}
    </section>
  );
}
