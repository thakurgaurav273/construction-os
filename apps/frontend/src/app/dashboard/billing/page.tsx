'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@sitepilot/ui';
import { Plus, ShieldAlert } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { useCan, useCurrentAccess } from '@/hooks/api/use-access';
import { ClientsList } from '@/features/billing/components/ClientsList';
import { ContractFormDialog } from '@/features/billing/components/ContractFormDialog';
import { ContractsList } from '@/features/billing/components/ContractsList';
import { RaBillsList } from '@/features/billing/components/RaBillsList';
import { ReceivablesList } from '@/features/billing/components/ReceivablesList';
import { MarginView } from '@/features/billing/components/margin/MarginView';
import BillingLoading from './loading';
import { PageAction, PageHeader } from '@/components/shared/PageHeader';

const TABS = ['bills', 'receivables', 'margin', 'contracts', 'clients'] as const;
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
      <PageHeader
        title="Billing"
        description="Running account bills against contract BOQs: to your clients, and from your subcontractors."
        actions={canManage && <PageAction primary icon={Plus} label="New Contract" onClick={() => setCreateOpen(true)} data-tour="billing-new-contract" />}
      />

      <Tabs value={tab} onValueChange={openTab}>
        <TabsList data-tour="billing-tabs">
          <TabsTrigger value="bills">RA Bills</TabsTrigger>
          <TabsTrigger value="receivables">Receivables</TabsTrigger>
          {can('finance.view') && <TabsTrigger value="margin">Margin</TabsTrigger>}
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
        </TabsList>
        <TabsContent value="bills" className="mt-4"><RaBillsList onBrowseContracts={() => openTab('contracts')} /></TabsContent>
        <TabsContent value="receivables" className="mt-4"><ReceivablesList /></TabsContent>
        {can('finance.view') && <TabsContent value="margin" className="mt-4"><MarginView /></TabsContent>}
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
