'use client';

import React, { useState } from 'react';
import {
  Badge, Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@sitepilot/ui';
import type { RowAction, RowOutcome } from '@/hooks/api/use-data-import';
import { MobileCard, MobileCardList, useIncrementalItems } from '@/components/shared/MobileList';

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
  const phoneRows = useIncrementalItems(visible, onlyProblems ? 'problems' : 'all');

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
      <MobileCardList
        items={phoneRows.visible}
        getKey={(row) => `${row.rowNumber}-${row.label}`}
        hasMore={phoneRows.hasMore}
        onLoadMore={phoneRows.loadMore}
        renderCard={(row) => {
          const badge = ACTION_BADGES[row.action];
          return (
            <MobileCard
              title={row.label}
              subtitle={`Row ${row.rowNumber}`}
              aside={<Badge variant={badge.variant}>{badge.label}</Badge>}
              footer={row.messages.length > 0 ? <p className="text-xs text-muted-foreground">{row.messages.join(' ')}</p> : undefined}
            />
          );
        }}
      />
      <div className="hidden overflow-hidden rounded-lg border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Row</TableHead>
              <TableHead>Record</TableHead>
              <TableHead className="w-28">Result</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((row) => {
              const badge = ACTION_BADGES[row.action];
              return (
                <TableRow key={`${row.rowNumber}-${row.label}`}>
                  <TableCell className="tabular-nums text-muted-foreground">{row.rowNumber}</TableCell>
                  <TableCell><span className="font-medium">{row.label}</span></TableCell>
                  <TableCell><Badge variant={badge.variant}>{badge.label}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{row.messages.join(' ')}</TableCell>
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
