'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Skeleton } from '@sitepilot/ui';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { useCan } from '@/hooks/api/use-access';
import { useContract } from '@/hooks/api/use-billing';
import { BillingImportFlow } from '@/features/billing/components/import/BillingImportFlow';
import { BoqImportReview } from '@/features/billing/components/import/BoqImportReview';

export default function ImportBoqPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const can = useCan();
  const { data: contract, isLoading } = useContract(id);

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="space-y-2">
        <Link href={`/dashboard/billing/contracts/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {contract ? `${contract.code} · ${contract.title}` : 'Contract'}
        </Link>
        <h2 className="text-2xl font-bold tracking-tight">Import BOQ</h2>
        <p className="text-muted-foreground">Bring in the bill of quantities from your own spreadsheet. Existing lines are matched by item number.</p>
      </div>
      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : !can('contract.manage') ? (
        <EmptyState icon={ShieldAlert} title="Importing a BOQ is restricted" description="Only people who set up contracts can import a BOQ. Ask a project manager or finance." />
      ) : (
        <BillingImportFlow
          target={{ kind: 'boq', contractId: id }}
          title="Upload the BOQ sheet"
          description="Any layout works: item number, description, unit, quantity and rate are enough. A column of quantities certified on earlier bills lets you carry them forward."
          preferredSheet={/abstract|boq|bill of quantit/i}
          renderReview={(ready) => <BoqImportReview contractId={id} ready={ready} />}
        />
      )}
    </div>
  );
}
