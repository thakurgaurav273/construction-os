'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, CalendarClock, Check, Package, X } from 'lucide-react';
import { ScrollArea, Sheet, SheetContent, SheetTitle, Skeleton, cn } from '@sitepilot/ui';
import { useMaterialRequest, type MaterialRequestDetail } from '@/hooks/api/use-material-requests';
import { formatDate, formatNumber } from '@/lib/utils';
import { RecordHistory } from '@/features/audit/components/RecordHistory';
import { MaterialRequestActions } from './MaterialRequestActions';
import { MaterialRequestStatusBadge } from './MaterialRequestStatusBadge';
import { RecentIssuesList } from './RecentIssuesList';

interface MaterialRequestDrawerProps {
  requestId: string | null;
  onClose: () => void;
}

interface TimelineStep {
  stage: string;
  actor: string | null;
  date: string | null;
  done: boolean;
}

function buildTimeline(request: MaterialRequestDetail): TimelineStep[] {
  const requested: TimelineStep = { stage: 'Requested', actor: request.requestedBy.name, date: request.createdAt, done: true };
  if (request.status === 'REJECTED') {
    return [requested, { stage: 'Rejected', actor: request.reviewedBy?.name ?? null, date: request.reviewedAt, done: true }];
  }
  const approved: TimelineStep = {
    stage: 'Approved', actor: request.reviewedBy?.name ?? null, date: request.reviewedAt, done: request.reviewedAt !== null,
  };
  const lastIssue = request.issues[0];
  const hasIssued = request.status === 'ISSUED' || request.status === 'PARTLY_ISSUED';
  const issued: TimelineStep = {
    stage: request.status === 'PARTLY_ISSUED' ? 'Partly issued' : 'Issued',
    actor: lastIssue?.issuedBy.name ?? null,
    date: lastIssue?.issuedOn ?? null,
    done: hasIssued,
  };
  if (request.status === 'CANCELLED' || request.status === 'CLOSED') {
    const stopped: TimelineStep = {
      stage: request.status === 'CANCELLED' ? 'Cancelled' : 'Closed', actor: request.closedBy?.name ?? null, date: request.closedAt, done: true,
    };
    return approved.done ? [requested, approved, stopped] : [requested, stopped];
  }
  return [requested, approved, issued];
}

function RequestItems({ request }: { request: MaterialRequestDetail }): React.ReactElement {
  return (
    <div className="rounded-xl border bg-card p-4">
      <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
        <Package className="h-4 w-4 text-muted-foreground" /> Materials ({request.items.length})
      </h4>
      <div className="space-y-1.5">
        {request.items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 border-b border-dashed last:border-0 py-1.5">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{item.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatNumber(item.issued)} of {formatNumber(item.quantity)} {item.unit} issued
              </p>
            </div>
            <span className={cn('text-sm font-semibold shrink-0', item.remaining === 0 && 'text-emerald-600 dark:text-emerald-400')}>
              {item.remaining === 0 ? 'Done' : `${formatNumber(item.remaining)} ${item.unit} owed`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MaterialRequestBody({ request }: { request: MaterialRequestDetail }): React.ReactElement {
  const timeline = buildTimeline(request);
  return (
    <>
      <div className="shrink-0 border-b bg-muted/30 px-5 pt-6 pb-4">
        <div className="flex items-center justify-between gap-2 pr-6">
          <h3 className="text-lg font-semibold leading-tight">{request.code}</h3>
          <MaterialRequestStatusBadge status={request.status} />
        </div>
        <Link href={`/dashboard/projects/${request.projectId}/materials`} className="mt-1 block text-sm font-medium hover:underline truncate">
          {request.project.name}
        </Link>
        {request.neededBy && (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5" /> Needed by {formatDate(request.neededBy)}
          </p>
        )}
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-5 space-y-5">
          <div className="rounded-xl border bg-card p-4">
            <h4 className="text-sm font-semibold mb-3">Timeline</h4>
            <div className="space-y-3">
              {timeline.map((step) => (
                <div key={step.stage} className="flex items-center gap-3">
                  <div className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full shrink-0',
                    step.done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                  )}>
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex items-center justify-between flex-1 gap-2 min-w-0">
                    <span className={cn('text-sm truncate', step.done ? 'font-medium' : 'text-muted-foreground')}>
                      {step.stage}{step.done && step.actor ? <span className="font-normal text-muted-foreground"> · {step.actor}</span> : null}
                    </span>
                    {step.done && step.date && <span className="text-xs text-muted-foreground shrink-0">{formatDate(step.date)}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {request.reviewNote && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
              <h4 className="text-sm font-semibold mb-1.5">
                {request.status === 'REJECTED' ? 'Reason for rejection' : 'Why it was closed'}
              </h4>
              <p className="text-sm text-muted-foreground">{request.reviewNote}</p>
            </div>
          )}

          {request.note && (
            <div className="rounded-xl border bg-card p-4">
              <h4 className="text-sm font-semibold mb-1.5">What it&apos;s for</h4>
              <p className="text-sm text-muted-foreground">{request.note}</p>
            </div>
          )}

          <RequestItems request={request} />
          {request.issues.length > 0 && <RecentIssuesList issues={request.issues} title="Issue Notes" />}
          <RecordHistory entityType="material_request" entityId={request.id} />
        </div>
      </ScrollArea>

      <MaterialRequestActions request={request} />
    </>
  );
}

export function MaterialRequestDrawer({ requestId, onClose }: MaterialRequestDrawerProps): React.ReactElement {
  const { data: request, isLoading, isError } = useMaterialRequest(requestId);

  return (
    <Sheet open={requestId !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="w-full sm:max-w-[480px] p-0 flex flex-col overflow-hidden [&>button:last-child]:hidden">
        <SheetTitle className="sr-only">Material Request</SheetTitle>
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3.5 right-3.5 z-20 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {isError ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <p className="text-sm text-muted-foreground">Unable to load this material request. Close the panel and try again.</p>
          </div>
        ) : isLoading || !request ? (
          <div className="p-5 space-y-4">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : (
          <MaterialRequestBody request={request} />
        )}
      </SheetContent>
    </Sheet>
  );
}
