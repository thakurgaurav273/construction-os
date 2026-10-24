'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Skeleton } from '@sitepilot/ui';
import { ArrowLeft, Lock, ShieldAlert } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { useCan } from '@/hooks/api/use-access';
import { useRaBill } from '@/hooks/api/use-billing';
import { BillingImportFlow } from '@/features/billing/components/import/BillingImportFlow';
import { MeasurementImportReview } from '@/features/billing/components/import/MeasurementImportReview';

export default function ImportMeasurementsPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const can = useCan();
  const { data: bill, isLoading } = useRaBill(id);
  const editable = bill && (bill.status === 'DRAFT' || bill.status === 'CHANGES_REQUESTED');

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="space-y-2">
        <Link href={`/dashboard/billing/ra-bills/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {bill ? `${bill.code} · ${bill.contract.title}` : 'RA bill'}
        </Link>
        <h2 className="text-2xl font-bold tracking-tight">Import measurement book</h2>
        <p className="text-muted-foreground">Upload the MB the site keeps in Excel. Each item’s rows are matched to the BOQ and checked against the sheet’s own totals.</p>
      </div>
      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : !can('billing.prepare') ? (
        <EmptyState icon={ShieldAlert} title="Importing measurements is restricted" description="Only people who prepare RA bills can import a measurement book." />
      ) : !editable ? (
        <EmptyState icon={Lock} title="This bill can’t be changed" description="Measurements can be imported into drafts and bills sent back for changes." />
      ) : (
        <BillingImportFlow
          target={{ kind: 'measurements', billId: id }}
          title="Upload the measurement book"
          description="A row with an item number starts each item; rows below it are its measurements. “RA Bill 1st/2nd” rows mark sections, and total, hold and paid rows are used to cross-check."
          preferredSheet={/^\s*mb\b|measure/i}
          renderReview={(ready) => <MeasurementImportReview billId={id} ready={ready} />}
        />
      )}
    </div>
  );
}
