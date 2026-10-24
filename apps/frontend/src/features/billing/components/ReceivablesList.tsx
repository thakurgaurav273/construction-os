'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card, CardContent, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton } from '@sitepilot/ui';
import { AlertTriangle, ChevronRight, Wallet } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { useReceivables } from '@/hooks/api/use-billing';
import { useProjects } from '@/hooks/api/use-projects';
import type { AgeingBuckets } from '../types';
import { formatAmount } from '../utils/format';
import { ALL } from './BillingFilters';

const BUCKETS: { key: keyof AgeingBuckets; label: string }[] = [
  { key: 'current', label: 'Not yet due' },
  { key: 'days1to30', label: '1–30 days' },
  { key: 'days31to60', label: '31–60 days' },
  { key: 'days61to90', label: '61–90 days' },
  { key: 'over90', label: '90+ days' },
];

const day = (value: string): string => new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** What clients still owe on certified client bills, with ageing. */
export function ReceivablesList(): React.ReactElement {
  const [projectId, setProjectId] = useState<string>(ALL);
  const { data: projects = [] } = useProjects();
  const { data, isLoading, isError, refetch } = useReceivables(projectId === ALL ? undefined : projectId);

  return (
    <div className="space-y-4">
      <Select value={projectId} onValueChange={setProjectId}>
        <SelectTrigger className="sm:w-64" aria-label="Project"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All projects</SelectItem>
          {projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}
        </SelectContent>
      </Select>

      {isLoading ? (
        <div className="space-y-3"><Skeleton className="h-24 w-full rounded-xl" />{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-16 w-full rounded-lg" />)}</div>
      ) : isError || !data ? (
        <EmptyState icon={AlertTriangle} title="Unable to load receivables" description="Check your connection and try again." action={<Button onClick={() => refetch()}>Retry</Button>} />
      ) : (
        <>
          <Card>
            <CardContent className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 lg:grid-cols-7">
              <div className="col-span-2 sm:col-span-1 lg:col-span-1">
                <p className="text-xs text-muted-foreground">Outstanding</p>
                <p className="text-lg font-semibold tabular-nums">{formatAmount(data.totals.outstanding)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Overdue</p>
                <p className={`text-lg font-semibold tabular-nums ${data.totals.overdue > 0 ? 'text-destructive' : ''}`}>{formatAmount(data.totals.overdue)}</p>
              </div>
              {BUCKETS.map((bucket) => (
                <div key={bucket.key}>
                  <p className="text-xs text-muted-foreground">{bucket.label}</p>
                  <p className="text-sm font-medium tabular-nums">{formatAmount(data.totals.ageing[bucket.key])}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {data.items.length === 0 ? (
            <EmptyState icon={Wallet} title="Nothing outstanding" description="Certified client bills appear here until they are fully received." />
          ) : (
            <ul className="divide-y rounded-xl border bg-card">
              {data.items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/dashboard/billing/ra-bills/${item.id}`}
                    className="grid gap-2 px-4 py-3 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.code} · {item.contract.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {item.partyName ?? '—'} · {item.contract.code}{item.invoiceNumber && ` · Invoice ${item.invoiceNumber}`}
                        {item.dueDate && ` · due ${day(item.dueDate)}`}
                      </p>
                    </div>
                    {item.daysOverdue > 0 ? <Badge variant="destructive">{item.daysOverdue} days overdue</Badge> : <Badge variant="outline">Not yet due</Badge>}
                    <div className="flex items-center gap-2 sm:justify-end">
                      <div className="sm:text-right">
                        <p className="text-sm font-medium tabular-nums">{formatAmount(item.outstanding)}</p>
                        <p className="text-xs text-muted-foreground">of {formatAmount(item.netAmount)}</p>
                      </div>
                      <ChevronRight className="hidden h-4 w-4 text-muted-foreground sm:block" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
