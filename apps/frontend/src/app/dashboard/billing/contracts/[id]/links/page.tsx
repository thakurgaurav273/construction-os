'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button, Skeleton } from '@sitepilot/ui';
import { AlertTriangle, ArrowLeft, Link2Off, ShieldAlert } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { useCan } from '@/hooks/api/use-access';
import { useContract, useItemLinkOptions } from '@/hooks/api/use-billing';
import { ItemLinksForm } from '@/features/billing/components/margin/ItemLinksForm';

export default function ItemLinksPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const can = useCan();
  const contract = useContract(id);
  const options = useItemLinkOptions(id);

  const body = (): React.ReactNode => {
    if (contract.isLoading || options.isLoading) return <Skeleton className="h-72 w-full rounded-xl" />;
    if (!can('contract.manage')) return <EmptyState icon={ShieldAlert} title="Linking is restricted" description="Only people who set up contracts can link BOQ lines." />;
    if (contract.isError || options.isError || !contract.data || !options.data) {
      return <EmptyState icon={AlertTriangle} title="Unable to load the BOQ lines" description="This only works for subcontracts. Check your connection and try again." action={<Button variant="outline" onClick={() => { void contract.refetch(); void options.refetch(); }}>Retry</Button>} />;
    }
    if (options.data.clientContracts.every((client) => client.items.length === 0)) {
      return <EmptyState icon={Link2Off} title="No client BOQ on this project" description="Add a client contract with its BOQ on the same project, then link these lines to it." />;
    }
    if (contract.data.items.length === 0) {
      return <EmptyState icon={Link2Off} title="This subcontract has no BOQ yet" description="Add the subcontract’s BOQ first." />;
    }
    return <ItemLinksForm contract={contract.data} options={options.data} />;
  };

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="space-y-2">
        <Link href={`/dashboard/billing/contracts/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {contract.data ? `${contract.data.code} · ${contract.data.title}` : 'Contract'}
        </Link>
        <h2 className="text-2xl font-bold tracking-tight">Link to client BOQ</h2>
        <p className="text-muted-foreground">Tell SitePilot which client line each subcontract line delivers, to see margin per item.</p>
      </div>
      {body()}
    </div>
  );
}
