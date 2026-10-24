'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow, format } from 'date-fns';
import { ChevronDown, ChevronRight, History } from 'lucide-react';
import { Button, Skeleton, cn } from '@sitepilot/ui';
import { useCan } from '@/hooks/api/use-access';
import { useAuditLogs, type AuditLogEntry } from '@/hooks/api/use-audit-logs';
import { describeAuditInput } from '../utils/describe-input';

const PAGE_SIZE = 10;
/** The API's page-size limit; beyond it, the full audit log has everything. */
const MAX_LIMIT = 100;

interface RecordHistoryProps {
  /** The audit catalogue's record type, e.g. `purchase_order`. */
  entityType: string;
  entityId: string;
}

function HistoryEntry({ entry }: { entry: AuditLogEntry }): React.ReactElement {
  const [open, setOpen] = useState(false);
  const { details, more } = describeAuditInput(entry.metadata);
  const createdAt = new Date(entry.createdAt);
  const canExpand = details.length > 0;

  return (
    <li className="py-2.5">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={!canExpand}
        aria-expanded={canExpand ? open : undefined}
        className="flex w-full items-start gap-2 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default"
      >
        {canExpand
          ? (open ? <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />)
          : <span className="w-3.5 shrink-0" aria-hidden="true" />}
        <span className="min-w-0 flex-1">
          <span className="block text-sm"><span className="font-medium">{entry.actor.name}</span> {entry.summary}</span>
          <time dateTime={entry.createdAt} title={format(createdAt, 'dd MMM yyyy, HH:mm:ss')} className="block text-xs text-muted-foreground">
            {formatDistanceToNow(createdAt, { addSuffix: true })}
          </time>
        </span>
      </button>
      {open && (
        <dl className="ml-5 mt-2 grid grid-cols-[minmax(0,110px)_minmax(0,1fr)] gap-x-3 gap-y-1 rounded-md bg-muted/40 p-2.5 text-xs">
          {details.map((detail) => (
            <React.Fragment key={detail.label}>
              <dt className="truncate text-muted-foreground">{detail.label}</dt>
              <dd className="break-words">{detail.value}</dd>
            </React.Fragment>
          ))}
          {more > 0 && <dd className="col-span-2 text-muted-foreground">and {more} more in the audit log</dd>}
        </dl>
      )}
    </li>
  );
}

/**
 * Who changed this record and when, from the audit log. Shown only to members who can read the audit log,
 * and fetched only once opened.
 */
export function RecordHistory({ entityType, entityId }: RecordHistoryProps): React.ReactElement | null {
  const can = useCan();
  const [open, setOpen] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const { data, isLoading, isError, refetch, isFetching } = useAuditLogs(
    { entityType, entityId, limit, page: 1 },
    { enabled: open && can('audit.view') },
  );
  if (!can('audit.view')) return null;

  return (
    <section className="rounded-xl border bg-card p-4">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          <History className="h-4 w-4 text-muted-foreground" /> History
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          {open && data ? `${data.total} ${data.total === 1 ? 'change' : 'changes'}` : 'Who changed what'}
          <ChevronDown className={cn('h-4 w-4 transition-transform motion-reduce:transition-none', open && 'rotate-180')} />
        </span>
      </button>

      {open && (
        <div className="mt-3">
          {isLoading && (
            <div className="space-y-3" aria-busy="true" aria-label="Loading history">
              {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-9 w-full" />)}
            </div>
          )}
          {isError && (
            <p className="text-sm text-muted-foreground">
              Couldn’t load the history.{' '}
              <button type="button" className="font-medium text-primary hover:underline" onClick={() => refetch()}>Retry</button>
            </p>
          )}
          {data && data.items.length === 0 && (
            <p className="text-sm text-muted-foreground">No changes recorded yet. Changes made from now on will appear here.</p>
          )}
          {data && data.items.length > 0 && (
            <>
              <ul className="divide-y">
                {data.items.map((entry) => <HistoryEntry key={entry.id} entry={entry} />)}
              </ul>
              <div className="mt-2 flex items-center justify-between gap-2">
                {data.total > data.items.length && limit < MAX_LIMIT ? (
                  <Button variant="ghost" size="sm" className="-ml-2" onClick={() => setLimit((value) => Math.min(MAX_LIMIT, value + PAGE_SIZE))} disabled={isFetching}>
                    {isFetching ? 'Loading…' : 'Show older'}
                  </Button>
                ) : <span />}
                <Link href="/dashboard/settings#audit" className="text-xs text-muted-foreground hover:text-foreground hover:underline">Full audit log</Link>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
