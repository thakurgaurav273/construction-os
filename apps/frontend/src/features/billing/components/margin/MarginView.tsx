'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card, CardContent, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton, cn } from '@sitepilot/ui';
import { AlertTriangle, ChevronDown, ChevronRight, TrendingUp } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { GuideLink } from '@/features/help/components/GuideLink';
import { useContracts, useMargin } from '@/hooks/api/use-billing';
import { useProjects } from '@/hooks/api/use-projects';
import type { MarginRow } from '../../margin-types';
import { formatAmount, formatQuantity } from '../../utils/format';

function Tile({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: string }): React.ReactElement {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('truncate text-lg font-semibold tabular-nums', tone)}>{value}</p>
      {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

const marginTone = (margin: number): string => (margin < 0 ? 'text-destructive' : margin > 0 ? 'text-emerald-600' : '');

function Row({ row }: { row: MarginRow }): React.ReactElement {
  const [open, setOpen] = useState(false);
  return (
    <li className="px-4 py-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="grid grid-cols-1 w-full gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))] md:items-center"
      >
        <span className="flex min-w-0 items-start gap-2">
          {open ? <ChevronDown className="mt-0.5 h-4 w-4 shrink-0" /> : <ChevronRight className="mt-0.5 h-4 w-4 shrink-0" />}
          <span className="min-w-0">
            <span className="block text-sm font-medium">{row.contract.code} · {row.itemNo}</span>
            <span className="line-clamp-1 block text-xs text-muted-foreground">{row.description}</span>
          </span>
        </span>
        <span className="text-sm md:text-right"><span className="text-xs text-muted-foreground md:hidden">Billed </span>{formatAmount(row.billed)}</span>
        <span className="text-sm md:text-right"><span className="text-xs text-muted-foreground md:hidden">Cost </span>{row.subcontracts.length > 0 ? formatAmount(row.cost) : <Badge variant="secondary">No subcontract linked</Badge>}</span>
        {/* Without a linked subcontract there is nothing to compare: own work, or not linked yet. */}
        {row.subcontracts.length === 0 ? (
          <span className="text-sm text-muted-foreground md:text-right">—</span>
        ) : (
          <span className={cn('text-sm font-medium md:text-right', marginTone(row.margin))}>
            {formatAmount(row.margin)}{row.marginPercent !== null && <span className="ml-1 text-xs">({row.marginPercent}%)</span>}
          </span>
        )}
      </button>
      {open && (
        <div className="ml-6 mt-3 space-y-2 rounded-lg bg-muted/30 p-3 text-xs">
          <p>
            Client: {formatQuantity(row.certifiedQuantity)} {row.unit} certified at {formatAmount(row.rate)}
            {row.rateMargin !== null && <span className={cn('ml-2 font-medium', marginTone(row.rateMargin))}>· {formatAmount(row.rateMargin)} per {row.unit} after subcontract</span>}
          </p>
          {row.subcontracts.map((line) => (
            <p key={line.itemId}>
              <Link href={`/dashboard/billing/contracts/${line.contractId}`} className="font-medium hover:underline">{line.contractCode}</Link>
              {' '}{line.vendorName} · item {line.itemNo}: {formatQuantity(line.certifiedQuantity)} {line.unit} at {formatAmount(line.rate)} = {formatAmount(line.cost)}
            </p>
          ))}
        </div>
      )}
    </li>
  );
}

/** Per project: what clients are billed for each item against what subcontractors are paid for the same work. */
export function MarginView(): React.ReactElement {
  const { data: allProjects = [] } = useProjects();
  const { data: contracts = [], isLoading: contractsLoading } = useContracts();
  // Only projects with contracts can have a margin; start on one of them.
  const projects = allProjects.filter((project) => contracts.some((contract) => contract.project.id === project.id));
  const [projectId, setProjectId] = useState<string | null>(null);
  const activeProject = projectId ?? projects[0]?.id ?? null;
  const { data, isLoading, isError, refetch } = useMargin(activeProject);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Select value={activeProject ?? ''} onValueChange={(value) => { if (value) setProjectId(value); }}>
          <SelectTrigger className="sm:w-72" aria-label="Project"><SelectValue placeholder="Choose a project" /></SelectTrigger>
          <SelectContent>{projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}</SelectContent>
        </Select>
        <GuideLink guideId="billing.margin" />
      </div>

      {!activeProject ? (
        contractsLoading ? <Skeleton className="h-24 w-full rounded-xl" /> : (
          <EmptyState icon={TrendingUp} title="No contracts yet" description="Margin compares client contracts with subcontracts on the same project. Add both to see it." />
        )
      ) : isLoading ? (
        <div className="space-y-3"><Skeleton className="h-24 w-full rounded-xl" /><Skeleton className="h-64 w-full rounded-xl" /></div>
      ) : isError || !data ? (
        <EmptyState icon={AlertTriangle} title="Unable to load margin" description="Check your connection and try again." action={<Button onClick={() => refetch()}>Retry</Button>} />
      ) : data.rows.length === 0 && data.unlinked.length === 0 ? (
        <EmptyState icon={TrendingUp} title="Nothing certified yet" description="Margin appears once client or subcontract bills on this project are certified." />
      ) : (
        <>
          <Card>
            <CardContent className="grid grid-cols-2 gap-4 p-5 lg:grid-cols-5">
              <Tile label="Billed to clients" value={formatAmount(data.totals.billed)} hint="Certified work value" />
              <Tile label="Subcontract cost" value={formatAmount(data.totals.subcontractCost)} hint={data.totals.unlinkedCost > 0 ? `${formatAmount(data.totals.unlinkedCost)} not linked` : 'All linked'} />
              <Tile label="Margin" value={formatAmount(data.totals.margin)} tone={marginTone(data.totals.margin)} hint={data.totals.marginPercent !== null ? `${data.totals.marginPercent}% of billed` : undefined} />
              <Tile label="Material recovered" value={formatAmount(data.totals.materialRecovered)} hint="From subcontractor bills" />
              <p className="col-span-2 self-center text-xs text-muted-foreground lg:col-span-1">Work value before taxes and deductions, at the rates each bill was certified at.</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="hidden grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))] gap-2 border-b px-4 py-2 text-xs font-medium text-muted-foreground md:grid">
                <span className="pl-6">Client item</span><span className="text-right">Billed</span><span className="text-right">Subcontract cost</span><span className="text-right">Margin</span>
              </div>
              <ul className="divide-y">{data.rows.map((row) => <Row key={row.clientItemId} row={row} />)}</ul>
            </CardContent>
          </Card>

          {data.unlinked.length > 0 && (
            <Card>
              <CardContent className="space-y-2 p-5">
                <p className="text-sm font-medium">Subcontract work not linked to a client line</p>
                <p className="text-xs text-muted-foreground">It counts as cost, but isn’t set against any client item. Link it from the subcontract’s BOQ.</p>
                <ul className="divide-y rounded-lg border text-sm">
                  {data.unlinked.map((line) => (
                    <li key={line.itemId} className="flex items-center justify-between gap-3 px-3 py-2">
                      <Link href={`/dashboard/billing/contracts/${line.contractId}/links`} className="min-w-0 truncate hover:underline">{line.contractCode} · {line.vendorName} · item {line.itemNo}</Link>
                      <span className="tabular-nums">{formatAmount(line.cost)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
