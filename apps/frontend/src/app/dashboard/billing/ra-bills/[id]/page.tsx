'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button, Card, CardContent, Skeleton } from '@sitepilot/ui';
import { AlertTriangle, ArrowLeft, History, MessageSquareWarning, Printer } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { useCan } from '@/hooks/api/use-access';
import { useRaBill } from '@/hooks/api/use-billing';
import { BillActions } from '@/features/billing/components/BillActions';
import { BillStatusBadge, DirectionBadge } from '@/features/billing/components/BillStatusBadge';
import { BillTimeline } from '@/features/billing/components/BillTimeline';
import { BillTotalsCard } from '@/features/billing/components/BillTotalsCard';
import { MeasurementSheet } from '@/features/billing/components/MeasurementSheet';
import { RaBillAbstract } from '@/features/billing/components/RaBillAbstract';
import { SettlementCard } from '@/features/billing/components/SettlementCard';
import { MaterialRecoveryCard } from '@/features/billing/components/margin/MaterialRecoveryCard';
import { DIRECTION_LABELS } from '@/features/billing/constants';
import { formatPeriod } from '@/features/billing/utils/format';
import { RecordHistory } from '@/features/audit/components/RecordHistory';

export default function RaBillPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const can = useCan();
  const { data: bill, isLoading, isError, refetch } = useRaBill(id);
  const [openItemId, setOpenItemId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <Skeleton className="h-8 w-72" />
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Skeleton className="h-96 w-full rounded-xl xl:col-span-2" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !bill) {
    return (
      <div className="flex-1 p-4 md:p-8 pt-6">
        <EmptyState
          icon={AlertTriangle}
          title="Unable to load this bill"
          description="It may have been removed, or the connection dropped."
          action={<div className="flex gap-2"><Button variant="outline" asChild><Link href="/dashboard/billing">Back to billing</Link></Button><Button onClick={() => refetch()}>Retry</Button></div>}
        />
      </div>
    );
  }

  const editable = can('billing.prepare') && (bill.status === 'DRAFT' || bill.status === 'CHANGES_REQUESTED') && bill.contractStatus === 'ACTIVE';
  const openLine = bill.lines.find((line) => line.contractItemId === openItemId) ?? null;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="space-y-3">
        <Link href={`/dashboard/billing/contracts/${bill.contract.id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {bill.contract.code} · {bill.contract.title}
        </Link>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight">{bill.code}</h2>
              <BillStatusBadge status={bill.status} />
              <DirectionBadge direction={bill.contract.direction} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatPeriod(bill.periodFrom, bill.periodTo)} · {DIRECTION_LABELS[bill.contract.direction].party} {bill.partyName ?? '—'}
              {bill.reference && ` · Their ref. ${bill.reference}`}
            </p>
            <p className="text-xs text-muted-foreground">
              Prepared by {bill.preparedBy?.name ?? 'someone no longer here'}
              {bill.certifiedBy && ` · Certified by ${bill.certifiedBy.name}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" asChild>
              <Link href={`/dashboard/billing/ra-bills/${bill.id}/print`}><Printer className="mr-2 h-4 w-4" /> Print / Excel</Link>
            </Button>
            <BillActions bill={bill} />
          </div>
        </div>
      </div>

      {bill.isOpeningBalance && (
        <Card>
          <CardContent className="flex gap-3 p-4 text-sm">
            <History className="h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="font-medium">Opening balance</p>
              <p className="text-muted-foreground">Quantities certified before this contract was in SitePilot, imported with the BOQ. They count as “previous” on the next bill; this bill moves no money.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {bill.status === 'CHANGES_REQUESTED' && bill.reviewNote && (
        <Card className="border-amber-300/60 bg-amber-50/60 dark:bg-amber-950/20">
          <CardContent className="flex gap-3 p-4 text-sm">
            <MessageSquareWarning className="h-5 w-5 shrink-0 text-amber-600" />
            <div><p className="font-medium">Sent back for changes</p><p className="text-muted-foreground">{bill.reviewNote}</p></div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <RaBillAbstract bill={bill} editable={editable} onOpenLine={(line) => setOpenItemId(line.contractItemId)} />
        </div>
        <div className="space-y-6">
          <SettlementCard bill={bill} />
          <BillTotalsCard bill={bill} editable={editable} />
          <MaterialRecoveryCard bill={bill} editable={editable} />
          <BillTimeline events={bill.events} />
          <RecordHistory entityType="ra_bill" entityId={bill.id} />
        </div>
      </div>

      <MeasurementSheet billId={bill.id} line={openLine} readOnly={!editable} onClose={() => setOpenItemId(null)} />
    </div>
  );
}
