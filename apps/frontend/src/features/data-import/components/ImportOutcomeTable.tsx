'use client';

import React, { useState } from 'react';
import {
  Badge, Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@sitepilot/ui';
import type { RowAction, RowOutcome } from '@/hooks/api/use-data-import';

/** Rendering thousands of rows adds nothing; problems are listed first and the full list is downloadable. */
const MAX_VISIBLE_ROWS = 300;

const ACTION_BADGES: Record<RowAction, { label: string; variant: 'success' | 'secondary' | 'outline' | 'destructive' }> = {
  create: { label: 'New', variant: 'success' },
  update: { label: 'Update', variant: 'secondary' },
  skip: { label: 'Skip', variant: 'outline' },
  error: { label: 'Problem', variant: 'destructive' },
};

export function ImportOutcomeTable({ rows }: { rows: RowOutcome[] }): React.ReactElement {
  const problemCount = rows.filter((row) => row.action === 'error').length;
  const [onlyProblems, setOnlyProblems] = useState(problemCount > 0);
  const visible = (onlyProblems ? rows.filter((row) => row.action === 'error') : rows).slice(0, MAX_VISIBLE_ROWS);

  return (
    <div className="space-y-3">
      {problemCount > 0 && (
        <div className="flex gap-2" role="group" aria-label="Filter rows">
          <Button type="button" size="sm" variant={onlyProblems ? 'secondary' : 'ghost'} onClick={() => setOnlyProblems(true)}>
            Problems ({problemCount})
          </Button>
          <Button type="button" size="sm" variant={onlyProblems ? 'ghost' : 'secondary'} onClick={() => setOnlyProblems(false)}>
            All rows ({rows.length})
          </Button>
        </div>
      )}
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Row</TableHead>
              <TableHead>Record</TableHead>
              <TableHead className="w-28">Result</TableHead>
              <TableHead className="hidden md:table-cell">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((row) => {
              const badge = ACTION_BADGES[row.action];
              return (
                <TableRow key={`${row.rowNumber}-${row.label}`}>
                  <TableCell className="tabular-nums text-muted-foreground">{row.rowNumber}</TableCell>
                  <TableCell>
                    <span className="font-medium">{row.label}</span>
                    {row.messages.length > 0 && (
                      <span className="mt-1 block text-xs text-muted-foreground md:hidden">{row.messages.join(' ')}</span>
                    )}
                  </TableCell>
                  <TableCell><Badge variant={badge.variant}>{badge.label}</Badge></TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground md:table-cell">{row.messages.join(' ')}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {(onlyProblems ? problemCount : rows.length) > MAX_VISIBLE_ROWS && (
        <p className="text-xs text-muted-foreground">Showing the first {MAX_VISIBLE_ROWS} rows. Download the issues for the full list.</p>
      )}
    </div>
  );
}
