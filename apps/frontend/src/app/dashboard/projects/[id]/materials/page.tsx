'use client';

import React, { useState } from 'react';
import { AlertTriangle, ArrowUpRight, ClipboardList, Package, Undo2 } from 'lucide-react';
import { Button, Skeleton } from '@sitepilot/ui';
import { EmptyState } from '@/components/shared/EmptyState';
import { useCan } from '@/hooks/api/use-access';
import { useProjectOpenForWork } from '@/hooks/api/use-projects';
import {
  useProjectMaterials, type ProjectMaterialLine, type SiteStockMovementType,
} from '@/hooks/api/use-materials';
import { formatCompactINR } from '@/features/procurement/utils/format';
import { SiteStockDialog } from '@/features/materials/components/SiteStockDialog';
import { MaterialPlanDialog } from '@/features/materials/components/MaterialPlanDialog';
import { ProjectMaterialsList } from '@/features/materials/components/ProjectMaterialsList';
import { RecentIssuesList } from '@/features/materials/components/RecentIssuesList';
import { MaterialRequestDialog } from '@/features/materials/components/MaterialRequestDialog';
import { ProjectMaterialRequests } from '@/features/materials/components/ProjectMaterialRequests';

function SummaryStat({ label, value, tone }: { label: string; value: string; tone?: 'danger' }): React.ReactElement {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone === 'danger' ? 'text-red-600 dark:text-red-400' : ''}`}>{value}</p>
    </div>
  );
}

export default function ProjectMaterialsPage({ params }: { params: { id: string } }): React.ReactElement {
  const { data, isLoading, isError, refetch } = useProjectMaterials(params.id);
  const can = useCan();
  const isOpen = useProjectOpenForWork(params.id);
  const canMove = can('material.issue');
  // Returns stay possible on an archived site so leftover stock can go back to the store.
  const canIssue = canMove && isOpen;
  const canPlan = can('project.update') && isOpen;
  const canRequest = can('material.request') && isOpen;
  const [requestOpen, setRequestOpen] = useState(false);
  const [movementType, setMovementType] = useState<SiteStockMovementType | null>(null);
  const [planLine, setPlanLine] = useState<ProjectMaterialLine | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-[320px] w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Unable to load this project's materials"
        description="Check your connection and try again."
        action={<Button variant="outline" onClick={() => refetch()}>Retry</Button>}
      />
    );
  }

  const { summary, items, recentIssues } = data;
  const hasReturnable = items.some((item) => item.consumed > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Materials</h2>
          <p className="text-muted-foreground">Material issued to this site from stores, tracked against plan.</p>
        </div>
        {(canMove || canRequest) && (
          <div className="flex flex-wrap gap-2">
            {canRequest && (
              <Button variant={canIssue ? 'outline' : 'default'} onClick={() => setRequestOpen(true)}>
                <ClipboardList className="mr-1.5 h-4 w-4" /> Request Material
              </Button>
            )}
            {canMove && hasReturnable && (
              <Button variant="outline" onClick={() => setMovementType('RETURN')}>
                <Undo2 className="mr-1.5 h-4 w-4" /> Record Return
              </Button>
            )}
            {canIssue && (
              <Button onClick={() => setMovementType('ISSUE')}>
                <ArrowUpRight className="mr-1.5 h-4 w-4" /> Issue Material
              </Button>
            )}
          </div>
        )}
      </div>

      <ProjectMaterialRequests projectId={params.id} onRequest={canRequest ? () => setRequestOpen(true) : undefined} />

      {items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No material issued yet"
          description="Issue material from a store to start tracking what this site consumes."
          action={canIssue ? <Button onClick={() => setMovementType('ISSUE')}>Issue Material</Button> : undefined}
        />
      ) : (
        <>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <SummaryStat label="Materials" value={String(summary.materialCount)} />
            <SummaryStat label="Consumed value" value={formatCompactINR(summary.consumedValue)} />
            <SummaryStat label="Issues this week" value={String(summary.issuesThisWeek)} />
            <SummaryStat
              label="Over plan"
              value={String(summary.overPlanCount)}
              tone={summary.overPlanCount > 0 ? 'danger' : undefined}
            />
          </div>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <ProjectMaterialsList lines={items} onPlan={canPlan ? setPlanLine : undefined} />
            <RecentIssuesList issues={recentIssues} />
          </div>
        </>
      )}

      <SiteStockDialog
        open={movementType !== null}
        onOpenChange={(open) => { if (!open) setMovementType(null); }}
        type={movementType ?? 'ISSUE'}
        projectId={params.id}
      />
      <MaterialPlanDialog projectId={params.id} line={planLine} onClose={() => setPlanLine(null)} />
      <MaterialRequestDialog open={requestOpen} onOpenChange={setRequestOpen} projectId={params.id} />
    </div>
  );
}
