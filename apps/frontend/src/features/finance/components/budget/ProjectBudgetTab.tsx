'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Lock, Plus, Wallet } from 'lucide-react';
import {
  Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, Skeleton,
} from '@sitepilot/ui';
import { EmptyState } from '@/components/shared/EmptyState';
import { useCan } from '@/hooks/api/use-access';
import { useDeleteBudgetHead, useProjectBudget } from '@/hooks/api/use-finance';
import { getApiErrorMessage } from '@/lib/api/errors';
import { formatCompactINR } from '@/features/procurement/utils/format';
import type { BudgetHead, ProjectBudget } from '../../types';
import { BudgetHeadDialog } from './BudgetHeadDialog';
import { BudgetHeadsTable } from './BudgetHeadsTable';

function Kpi({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'bad' }): React.ReactElement {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`mt-1 text-2xl font-bold tabular-nums ${tone === 'bad' ? 'text-destructive' : ''}`}>{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function allocationHint(unallocated: number | null): string {
  if (unallocated === null) return 'No overall project budget set';
  if (Math.abs(unallocated) < 1) return 'Matches the project budget';
  if (unallocated > 0) return `${formatCompactINR(unallocated)} of the project budget unallocated`;
  return `${formatCompactINR(-unallocated)} more than the project budget`;
}

function BudgetKpis({ budget }: { budget: ProjectBudget }): React.ReactElement {
  const { totals, projectBudget } = budget;
  const unallocated = projectBudget === null ? null : projectBudget - totals.allocated;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Kpi
        label="Allocated to heads"
        value={formatCompactINR(totals.allocated)}
        hint={allocationHint(unallocated)}
      />
      <Kpi label="Committed" value={formatCompactINR(totals.committed)} hint="Approved orders not yet billed" />
      <Kpi label="Spent" value={formatCompactINR(totals.spent)} hint="Approved vendor bills, incl. GST" />
      <Kpi
        label="Left"
        value={totals.remaining < 0 ? `−${formatCompactINR(-totals.remaining)}` : formatCompactINR(totals.remaining)}
        hint={totals.remaining < 0 ? 'Heads are overrun' : 'Allocated less committed and spent'}
        tone={totals.remaining < 0 ? 'bad' : undefined}
      />
    </div>
  );
}

export function ProjectBudgetTab({ projectId }: { projectId: string }): React.ReactElement {
  const can = useCan();
  const canView = can('finance.view');
  const canManage = can('budget.manage');
  const { data: budget, isLoading, isError, refetch } = useProjectBudget(projectId, canView);
  const deleteHead = useDeleteBudgetHead(projectId);
  const [editing, setEditing] = useState<BudgetHead | 'new' | null>(null);
  const [removing, setRemoving] = useState<BudgetHead | null>(null);

  if (!canView) {
    return (
      <EmptyState
        icon={Lock}
        title="Budget details are for finance and project managers"
        description="Budget heads, commitments and spend come from purchase orders and vendor bills. Ask an admin if you need access."
      />
    );
  }
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-xl" />)}</div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }
  if (isError || !budget) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Unable to load the budget"
        description="Check your connection and try again."
        action={<Button variant="outline" onClick={() => refetch()}>Retry</Button>}
      />
    );
  }

  async function handleRemove(): Promise<void> {
    if (!removing) return;
    try {
      await deleteHead.mutateAsync(removing.id);
      toast.success(`${removing.category} removed`, { description: 'Its orders and bills now show as Unbudgeted.' });
      setRemoving(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Couldn’t remove the head. Try again.'));
    }
  }

  const addButton = canManage ? <Button onClick={() => setEditing('new')}><Plus className="mr-1.5 h-4 w-4" /> Add head</Button> : undefined;

  return (
    <div className="space-y-6">
      <BudgetKpis budget={budget} />
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="space-y-1">
            <CardTitle>Budget heads</CardTitle>
            <CardDescription>Purchase orders and vendor bills count against the head with the same category.</CardDescription>
          </div>
          {budget.heads.length > 0 && addButton}
        </CardHeader>
        <CardContent>
          {budget.heads.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="No budget heads yet"
              description="Split the budget into heads like Steel, Concrete or Labour to see what's committed and spent against each."
              action={addButton}
            />
          ) : (
            <BudgetHeadsTable budget={budget} canManage={canManage} onEdit={setEditing} onDelete={setRemoving} />
          )}
        </CardContent>
      </Card>

      <BudgetHeadDialog
        projectId={projectId}
        open={editing !== null}
        onOpenChange={(open) => { if (!open) setEditing(null); }}
        head={editing === 'new' || editing === null ? undefined : editing}
        existing={budget.heads.map((head) => head.category)}
      />
      <Dialog open={removing !== null} onOpenChange={(open) => { if (!open) setRemoving(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {removing?.category}?</DialogTitle>
            <DialogDescription>No orders or bills are changed. What was counted against this head will show as Unbudgeted.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoving(null)}>Cancel</Button>
            <Button variant="destructive" loading={deleteHead.isPending} onClick={() => { void handleRemove(); }}>Remove head</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
