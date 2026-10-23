'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import {
  Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Skeleton,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@sitepilot/ui';
import { AlertTriangle, ChevronLeft, ChevronRight, History, Search, ShieldAlert } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { useCan } from '@/hooks/api/use-access';
import { useAuditLogs, type AuditLogEntry } from '@/hooks/api/use-audit-logs';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { formatRelativeTime } from '@/lib/utils';
import { AUDIT_ENTITY_FILTERS } from '../constants';
import { AuditEntrySheet } from './AuditEntrySheet';

const PAGE_SIZE = 25;
const ALL = 'all';

function AuditRows({ entries, onOpen }: { entries: AuditLogEntry[]; onOpen: (entry: AuditLogEntry) => void }): React.ReactElement {
  return (
    <ul className="divide-y rounded-lg border">
      {entries.map((entry) => (
        <li key={entry.id}>
          <button
            type="button"
            onClick={() => onOpen(entry)}
            className="flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:items-center sm:gap-4"
          >
            <span className="min-w-0 flex-1 text-sm">
              <span className="font-medium">{entry.actor.name}</span>{' '}
              <span className="text-muted-foreground">{entry.summary}</span>
              {entry.entityId && <span className="ml-1.5 font-mono text-xs text-muted-foreground">{entry.entityId.slice(0, 8)}</span>}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground" title={format(new Date(entry.createdAt), 'dd MMM yyyy, HH:mm:ss')}>
              {formatRelativeTime(entry.createdAt)}
              {entry.ipAddress ? ` · ${entry.ipAddress}` : ''}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Settings → Audit Logs: who did what and when, newest first. Read-only by design. */
export function AuditLogsTab(): React.ReactElement {
  const canView = useCan()('audit.view');
  const [search, setSearch] = useState('');
  const [entityType, setEntityType] = useState(ALL);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AuditLogEntry | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, isLoading, isError, isFetching, refetch } = useAuditLogs(
    {
      search: debouncedSearch.trim() || undefined,
      entityType: entityType === ALL ? undefined : entityType,
      from: from || undefined,
      to: to || undefined,
      page,
      limit: PAGE_SIZE,
    },
    { enabled: canView },
  );

  function resetPage<T>(setter: (value: T) => void): (value: T) => void {
    return (value) => {
      setter(value);
      setPage(1);
    };
  }

  if (!canView) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Audit log is restricted"
        description="Only owners and admins can see the audit log. Ask one of them if you need to check who changed something."
      />
    );
  }

  const filtersActive = !!(search || entityType !== ALL || from || to);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Logs</CardTitle>
        <CardDescription>Every change made in this organization: who did it, when, and from where. Entries can&apos;t be edited or deleted.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_200px_150px_150px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by person, action or record id…"
              aria-label="Search audit log"
              value={search}
              onChange={(event) => resetPage(setSearch)(event.target.value)}
            />
          </div>
          <Select value={entityType} onValueChange={resetPage(setEntityType)}>
            <SelectTrigger aria-label="Record type"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All records</SelectItem>
              {AUDIT_ENTITY_FILTERS.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" aria-label="From date" value={from} max={to || undefined} onChange={(event) => resetPage(setFrom)(event.target.value)} />
          <Input type="date" aria-label="To date" value={to} min={from || undefined} onChange={(event) => resetPage(setTo)(event.target.value)} />
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-12 w-full" />)}
          </div>
        ) : isError || !data ? (
          <EmptyState
            icon={AlertTriangle}
            title="Unable to load the audit log"
            description="Check your connection and try again."
            action={<Button variant="outline" onClick={() => refetch()}>Retry</Button>}
          />
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={History}
            title={filtersActive ? 'No entries match these filters' : 'Nothing recorded yet'}
            description={filtersActive ? 'Try a wider date range or a different record type.' : 'Changes made by your team will appear here as they happen.'}
          />
        ) : (
          <div className={isFetching ? 'opacity-70 transition-opacity' : undefined}>
            <AuditRows entries={data.items} onOpen={setSelected} />
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>{data.total.toLocaleString('en-IN')} entries</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span>Page {data.page} of {data.totalPages}</span>
                <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Next page" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <AuditEntrySheet entry={selected} onClose={() => setSelected(null)} />
    </Card>
  );
}
