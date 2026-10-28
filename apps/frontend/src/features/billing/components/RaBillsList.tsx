'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton } from '@sitepilot/ui';
import { AlertTriangle, ChevronRight, Receipt } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { useRaBills } from '@/hooks/api/use-billing';
import { BILL_STATUS_LABELS } from '../constants';
import type { RaBillStatus } from '../types';
import { formatAmount, formatPeriod } from '../utils/format';
import { ALL, BillingFilters, DEFAULT_BILLING_FILTERS, matchesSearch, toServerFilters } from './BillingFilters';
import { BillStatusBadge, DirectionBadge } from './BillStatusBadge';

const STATUSES = Object.keys(BILL_STATUS_LABELS) as RaBillStatus[];

export function RaBillsList({ onBrowseContracts }: { onBrowseContracts: () => void }): React.ReactElement {
  const [filters, setFilters] = useState(DEFAULT_BILLING_FILTERS);
  const [status, setStatus] = useState<RaBillStatus | typeof ALL>(ALL);
  const { data: bills = [], isLoading, isError, refetch } = useRaBills({ ...toServerFilters(filters), status: status === ALL ? undefined : status });
  const visible = bills.filter((bill) => matchesSearch(filters.search, bill.code, bill.contract.code, bill.contract.title, bill.partyName, bill.reference));

  return (
    <div className="space-y-4">
      <BillingFilters value={filters} onChange={setFilters} searchPlaceholder="Search bills, contracts, parties…">
        <Select value={status} onValueChange={(value) => setStatus(value as RaBillStatus | typeof ALL)}>
          <SelectTrigger className="sm:w-44" aria-label="Status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any status</SelectItem>
            {STATUSES.map((option) => <SelectItem key={option} value={option}>{BILL_STATUS_LABELS[option]}</SelectItem>)}
          </SelectContent>
        </Select>
      </BillingFilters>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-16 w-full rounded-lg" />)}</div>
      ) : isError ? (
        <EmptyState icon={AlertTriangle} title="Unable to load RA bills" description="Check your connection and try again." action={<Button onClick={() => refetch()}>Retry</Button>} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={bills.length === 0 ? 'No RA bills yet' : 'No bills match these filters'}
          description={bills.length === 0 ? 'Bills are raised from a contract. Open a contract with a BOQ to start its first bill.' : 'Try a different status, project or search.'}
          action={bills.length === 0 ? <Button onClick={onBrowseContracts}>Go to Contracts</Button> : undefined}
          guide={bills.length === 0 ? { id: 'billing.raise-ra-bill', label: 'Learn how RA bills work' } : undefined}
        />
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {visible.map((bill) => (
            <li key={bill.id}>
              <Link
                href={`/dashboard/billing/ra-bills/${bill.id}`}
                className="grid grid-cols-1 gap-2 px-4 py-3 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center sm:gap-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{bill.code}{bill.isOpeningBalance ? ' (opening balance)' : ''} · {bill.contract.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {bill.contract.code} · {bill.partyName ?? '—'} · {bill.project.name} · {formatPeriod(bill.periodFrom, bill.periodTo)}
                  </p>
                </div>
                <DirectionBadge direction={bill.contract.direction} />
                <div className="sm:text-right">
                  <p className="text-sm font-medium tabular-nums">{formatAmount(bill.netAmount)}</p>
                  <p className="text-xs text-muted-foreground">net payable</p>
                </div>
                <div className="flex items-center gap-2"><BillStatusBadge status={bill.status} /><ChevronRight className="hidden h-4 w-4 text-muted-foreground sm:block" /></div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
