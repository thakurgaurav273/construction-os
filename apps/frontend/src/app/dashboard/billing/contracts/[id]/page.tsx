'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Badge, Button, Skeleton } from '@sitepilot/ui';
import { AlertTriangle, ArrowLeft, Lock, Pencil, Unlock } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { useCan } from '@/hooks/api/use-access';
import { useContract, useSetContractOpen } from '@/hooks/api/use-billing';
import { getApiErrorMessage } from '@/lib/api/errors';
import { DirectionBadge } from '@/features/billing/components/BillStatusBadge';
import { ContractBillsCard } from '@/features/billing/components/ContractBillsCard';
import { ContractBoqCard } from '@/features/billing/components/ContractBoqCard';
import { ContractFormDialog } from '@/features/billing/components/ContractFormDialog';
import { ContractOverview } from '@/features/billing/components/ContractOverview';
import { NewRaBillDialog } from '@/features/billing/components/NewRaBillDialog';
import { RetentionCard } from '@/features/billing/components/RetentionCard';
import type { ContractDetail } from '@/features/billing/types';
import { RecordHistory } from '@/features/audit/components/RecordHistory';

function newBillBlockedReason(contract: ContractDetail): string | null {
  if (contract.status === 'CLOSED') return 'This contract is closed.';
  if (contract.items.length === 0) return 'Add the BOQ before starting a bill.';
  if (contract.openBill) return `${contract.openBill.code} is still open. Certify or cancel it before the next bill.`;
  return null;
}

export default function ContractPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const can = useCan();
  const { data: contract, isLoading, isError, refetch } = useContract(id);
  const setOpen = useSetContractOpen();
  const [editOpen, setEditOpen] = useState(false);
  const [newBillOpen, setNewBillOpen] = useState(false);
  const canManage = can('contract.manage');

  async function toggleOpen(target: ContractDetail): Promise<void> {
    const reopening = target.status === 'CLOSED';
    try {
      await setOpen.mutateAsync({ id: target.id, open: reopening });
      toast.success(reopening ? `${target.code} reopened` : `${target.code} closed`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't change the contract. Try again."));
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <Skeleton className="h-8 w-80" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !contract) {
    return (
      <div className="flex-1 p-4 md:p-8 pt-6">
        <EmptyState
          icon={AlertTriangle}
          title="Unable to load this contract"
          description="It may have been removed, or the connection dropped."
          action={<div className="flex gap-2"><Button variant="outline" asChild><Link href="/dashboard/billing?tab=contracts">Back to contracts</Link></Button><Button onClick={() => refetch()}>Retry</Button></div>}
        />
      </div>
    );
  }

  const editable = canManage && contract.status === 'ACTIVE';

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="space-y-3">
        <Link href="/dashboard/billing?tab=contracts" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Contracts
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight">{contract.title}</h2>
              <DirectionBadge direction={contract.direction} />
              {contract.status === 'CLOSED' && <Badge variant="secondary">Closed</Badge>}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {contract.code} · <Link href={`/dashboard/projects/${contract.project.id}`} className="hover:underline">{contract.project.name}</Link>
            </p>
          </div>
          {canManage && (
            <div className="flex gap-2">
              {editable && <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil className="mr-2 h-4 w-4" /> Edit</Button>}
              <Button variant="outline" onClick={() => toggleOpen(contract)} disabled={setOpen.isPending}>
                {contract.status === 'CLOSED' ? <><Unlock className="mr-2 h-4 w-4" /> Reopen</> : <><Lock className="mr-2 h-4 w-4" /> Close</>}
              </Button>
            </div>
          )}
        </div>
      </div>

      <ContractOverview contract={contract} />
      <ContractBillsCard
        contract={contract}
        blockedReason={newBillBlockedReason(contract)}
        canPrepare={can('billing.prepare')}
        onNewBill={() => setNewBillOpen(true)}
      />
      <RetentionCard contract={contract} />
      <ContractBoqCard contract={contract} canEdit={editable} />
      <RecordHistory entityType="contract" entityId={contract.id} />

      <ContractFormDialog open={editOpen} onOpenChange={setEditOpen} contract={contract} />
      <NewRaBillDialog
        contract={contract}
        open={newBillOpen}
        onOpenChange={setNewBillOpen}
        onCreated={(bill) => router.push(`/dashboard/billing/ra-bills/${bill.id}`)}
      />
    </div>
  );
}
