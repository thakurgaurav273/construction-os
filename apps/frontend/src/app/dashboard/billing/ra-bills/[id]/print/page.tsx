'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button, Skeleton } from '@sitepilot/ui';
import { AlertTriangle, ArrowLeft, FileSpreadsheet, Printer } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { useRaBill } from '@/hooks/api/use-billing';
import { useExportBill } from '@/hooks/api/use-billing-import';
import { useOrganizationSettings } from '@/hooks/api/use-settings';
import { getApiErrorMessage } from '@/lib/api/errors';
import { BillPrintDocument } from '@/features/billing/components/print/BillPrintDocument';

/** Landscape A4 fits the abstract's thirteen columns. */
const PAGE_STYLE = '@page { size: A4 landscape; margin: 10mm; }';

export default function PrintRaBillPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const { data: bill, isLoading, isError, refetch } = useRaBill(id);
  const { data: organization } = useOrganizationSettings();
  const exportBill = useExportBill();

  async function download(): Promise<void> {
    try {
      toast.success(`Downloaded ${await exportBill.mutateAsync(id)}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Couldn’t export the bill. Try again.'));
    }
  }

  if (isLoading) return <div className="p-8"><Skeleton className="h-[600px] w-full rounded-xl" /></div>;
  if (isError || !bill) {
    return <div className="p-8"><EmptyState icon={AlertTriangle} title="Unable to load this bill" description="Check your connection and try again." action={<Button onClick={() => refetch()}>Retry</Button>} /></div>;
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 print:p-0">
      <style>{PAGE_STYLE}</style>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/dashboard/billing/ra-bills/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to {bill.code}
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { void download(); }} loading={exportBill.isPending}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
          </Button>
          <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Print or save PDF</Button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm print:overflow-visible print:rounded-none print:border-0 print:shadow-none">
        <BillPrintDocument bill={bill} organizationName={organization?.name ?? ''} logoUrl={organization?.logoUrl ?? null} />
      </div>
    </div>
  );
}
