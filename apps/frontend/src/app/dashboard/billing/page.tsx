'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from '@sitepilot/ui';
import { Plus, ShieldAlert } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { useCan, useCurrentAccess } from '@/hooks/api/use-access';
import { ClientsList } from '@/features/billing/components/ClientsList';
import { ContractFormDialog } from '@/features/billing/components/ContractFormDialog';
import { ContractsList } from '@/features/billing/components/ContractsList';
import { RaBillsList } from '@/features/billing/components/RaBillsList';
import { ReceivablesList } from '@/features/billing/components/ReceivablesList';
import BillingLoading from './loading';

const TABS = ['bills', 'receivables', 'contracts', 'clients'] as const;
type BillingTab = (typeof TABS)[number];

function isBillingTab(value: string | null): value is BillingTab {
  return TABS.some((tab) => tab === value);
}

function BillingContent(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requested = searchParams.get('tab');
  const tab: BillingTab = isBillingTab(requested) ? requested : 'bills';
  const { isLoading: accessLoading } = useCurrentAccess();
  const can = useCan();
  const [createOpen, setCreateOpen] = useState(false);
  const canManage = can('contract.manage');

  const openTab = (next: string): void => router.replace(next === 'bills' ? '/dashboard/billing' : `/dashboard/billing?tab=${next}`, { scroll: false });

  if (accessLoading) return <BillingLoading />;

  if (!can('billing.view')) {
    return (
      <div className="flex-1 p-4 md:p-8 pt-6">
        <EmptyState
          icon={ShieldAlert}
          title="Billing is restricted"
          description="RA bills and contracts are visible to project managers, site engineers and finance. Ask an admin if you need access."
        />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Billing</h2>
          <p className="mt-1 text-muted-foreground">Running account bills against contract BOQs: to your clients, and from your subcontractors.</p>
        </div>
        {canManage && <Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" /> New Contract</Button>}
      </div>

      <Tabs value={tab} onValueChange={openTab}>
        <TabsList>
          <TabsTrigger value="bills">RA Bills</TabsTrigger>
          <TabsTrigger value="receivables">Receivables</TabsTrigger>
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
        </TabsList>
        <TabsContent value="bills" className="mt-4"><RaBillsList onBrowseContracts={() => openTab('contracts')} /></TabsContent>
        <TabsContent value="receivables" className="mt-4"><ReceivablesList /></TabsContent>
        <TabsContent value="contracts" className="mt-4"><ContractsList onCreate={canManage ? () => setCreateOpen(true) : undefined} /></TabsContent>
        <TabsContent value="clients" className="mt-4"><ClientsList canManage={canManage} /></TabsContent>
      </Tabs>

      <ContractFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={(contract) => router.push(`/dashboard/billing/contracts/${contract.id}`)}
      />
    </div>
  );
}

/** The tab lives in the URL (?tab=contracts), which needs a Suspense boundary for static rendering. */
export default function BillingPage(): React.ReactElement {
  return (
    <Suspense fallback={<BillingLoading />}>
      <BillingContent />
    </Suspense>
  );
}
