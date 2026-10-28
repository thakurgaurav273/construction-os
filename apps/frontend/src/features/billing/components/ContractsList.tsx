'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Skeleton } from '@sitepilot/ui';
import { AlertTriangle, ChevronRight, FileSignature } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { useContracts } from '@/hooks/api/use-billing';
import { formatAmount } from '../utils/format';
import { BillingFilters, DEFAULT_BILLING_FILTERS, matchesSearch, toServerFilters } from './BillingFilters';
import { BillStatusBadge, DirectionBadge } from './BillStatusBadge';

export function ContractsList({ onCreate }: { onCreate?: () => void }): React.ReactElement {
  const [filters, setFilters] = useState(DEFAULT_BILLING_FILTERS);
  const { data: contracts = [], isLoading, isError, refetch } = useContracts(toServerFilters(filters));
  const visible = contracts.filter((contract) => matchesSearch(filters.search, contract.code, contract.title, contract.reference, contract.party?.name));

  return (
    <div className="space-y-4">
      <BillingFilters value={filters} onChange={setFilters} searchPlaceholder="Search contracts, WO/PO numbers…" />
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-20 w-full rounded-lg" />)}</div>
      ) : isError ? (
        <EmptyState icon={AlertTriangle} title="Unable to load contracts" description="Check your connection and try again." action={<Button onClick={() => refetch()}>Retry</Button>} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={FileSignature}
          title={contracts.length === 0 ? 'No contracts yet' : 'No contracts match these filters'}
          description={contracts.length === 0
            ? 'Add a client contract to bill a client, or a subcontract to certify a subcontractor’s bills.'
            : 'Try a different project, direction or search.'}
          action={contracts.length === 0 && onCreate ? <Button onClick={onCreate}>New Contract</Button> : undefined}
          guide={contracts.length === 0 ? { id: 'billing.contracts', label: 'Learn how contracts work' } : undefined}
        />
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {visible.map((contract) => {
            const progress = contract.contractValue > 0 ? Math.round((contract.certifiedToDate / contract.contractValue) * 100) : 0;
            return (
              <li key={contract.id}>
                <Link
                  href={`/dashboard/billing/contracts/${contract.id}`}
                  className="grid grid-cols-1 gap-2 px-4 py-3 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:grid-cols-[minmax(0,1fr)_auto_180px_auto] md:items-center md:gap-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {contract.title}
                      {contract.status === 'CLOSED' && <Badge variant="secondary" className="ml-2">Closed</Badge>}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {contract.code}{contract.reference && ` · WO/PO ${contract.reference}`} · {contract.party?.name ?? '—'} · {contract.project.name}
                    </p>
                  </div>
                  <DirectionBadge direction={contract.direction} />
                  <div className="md:text-right">
                    <p className="text-sm font-medium tabular-nums">{formatAmount(contract.certifiedToDate)}</p>
                    <p className="text-xs text-muted-foreground">{progress}% of {formatAmount(contract.contractValue)} certified</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {contract.openBill ? <BillStatusBadge status={contract.openBill.status} /> : <span className="text-xs text-muted-foreground">{contract.billCount} bills</span>}
                    <ChevronRight className="hidden h-4 w-4 text-muted-foreground md:block" />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
