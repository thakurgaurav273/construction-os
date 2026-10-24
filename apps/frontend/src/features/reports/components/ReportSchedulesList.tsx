'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, CalendarClock, Pause, Pencil, Play, Send, Trash2 } from 'lucide-react';
import {
  Badge, Button, Card, CardContent, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Skeleton,
} from '@sitepilot/ui';
import { Can } from '@/components/shared/Can';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatRole } from '@/features/settings/constants';
import { useDeleteSchedule, useReportSchedules, useRunSchedule, useToggleSchedule } from '@/hooks/api/use-reports';
import { getApiErrorMessage } from '@/lib/api/errors';
import { DELIVERY_PRESENTATION, FORMAT_LABELS, FREQUENCY_LABELS, TYPE_LABELS } from '../report-presentation';
import type { ReportSchedule } from '../types';

interface ReportSchedulesListProps {
  onEdit: (schedule: ReportSchedule) => void;
  onBrowseTemplates: () => void;
}

/** Shown in the schedule's own zone, since that is the time people chose. */
function formatInZone(isoDate: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone }).format(new Date(isoDate));
}

/** A one-off schedule switches itself off after running; that reads as done, not paused. */
function stateBadge(schedule: ReportSchedule): { label: string; variant: 'success' | 'secondary' } {
  if (schedule.enabled) return { label: 'Active', variant: 'success' };
  return { label: schedule.frequency === 'ONCE' && schedule.lastRunAt ? 'Done' : 'Paused', variant: 'secondary' };
}

function recipientsLabel(schedule: ReportSchedule): string {
  const parts = [...schedule.recipients.map(formatRole), ...schedule.emails];
  if (parts.length <= 3) return parts.join(', ') || 'No one';
  return `${parts.slice(0, 3).join(', ')} +${parts.length - 3}`;
}

function ScheduleCard({ schedule, onEdit, onDelete }: { schedule: ReportSchedule; onEdit: () => void; onDelete: () => void }): React.ReactElement {
  const toggle = useToggleSchedule();
  const run = useRunSchedule();
  const delivery = schedule.lastStatus ? DELIVERY_PRESENTATION[schedule.lastStatus] : null;
  const state = stateBadge(schedule);

  async function handleRun(): Promise<void> {
    try {
      await run.mutateAsync(schedule.id);
      toast.success('Running now', { description: 'Recipients get it by email in a moment.' });
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Couldn’t run the schedule. Try again.'));
    }
  }

  async function handleToggle(): Promise<void> {
    try {
      await toggle.mutateAsync(schedule.id);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Couldn’t update the schedule. Try again.'));
    }
  }

  return (
    <Card className={schedule.enabled ? undefined : 'opacity-70'}>
      <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${schedule.enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
            <CalendarClock className="h-5 w-5" />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-semibold">{schedule.name}</h3>
              <Badge variant={state.variant}>{state.label}</Badge>
              {delivery && <Badge variant={delivery.variant}>{delivery.label}</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">
              {TYPE_LABELS[schedule.reportType]} · {FREQUENCY_LABELS[schedule.frequency]} at {schedule.time} ({schedule.timezone}) · {FORMAT_LABELS[schedule.outputFormat]}
            </p>
            <p className="text-xs text-muted-foreground">
              To {recipientsLabel(schedule)}
              {schedule.nextRunAt && <> · Next {formatInZone(schedule.nextRunAt, schedule.timezone)}</>}
              {schedule.lastRunAt && <> · Last ran {formatDistanceToNow(new Date(schedule.lastRunAt), { addSuffix: true })}</>}
            </p>
            {schedule.lastError && <p className="text-xs text-destructive">{schedule.lastError}</p>}
          </div>
        </div>
        <Can permission="report.manage">
          <div className="flex shrink-0 flex-wrap items-center gap-1">
            <Button variant="outline" size="sm" disabled={run.isPending} onClick={() => { void handleRun(); }}><Send className="mr-1.5 h-4 w-4" /> Run now</Button>
            <Button variant="ghost" size="icon" aria-label={`Edit ${schedule.name}`} onClick={onEdit}><Pencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" aria-label={schedule.enabled ? 'Pause schedule' : 'Resume schedule'} disabled={toggle.isPending} onClick={() => { void handleToggle(); }}>
              {schedule.enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90" aria-label={`Delete ${schedule.name}`} onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </Can>
      </CardContent>
    </Card>
  );
}

export function ReportSchedulesList({ onEdit, onBrowseTemplates }: ReportSchedulesListProps): React.ReactElement {
  const { data: schedules, isLoading, isError, refetch } = useReportSchedules();
  const deleteSchedule = useDeleteSchedule();
  const [deleting, setDeleting] = useState<ReportSchedule | null>(null);

  async function handleDelete(): Promise<void> {
    if (!deleting) return;
    try {
      await deleteSchedule.mutateAsync(deleting.id);
      toast.success(`Deleted “${deleting.name}”`);
      setDeleting(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Couldn’t delete the schedule. Try again.'));
    }
  }

  if (isLoading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-24 w-full rounded-xl" />)}</div>;
  if (isError || !schedules) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Unable to load schedules"
        description="Check your connection and try again."
        action={<Button variant="outline" onClick={() => refetch()}>Retry</Button>}
      />
    );
  }
  if (schedules.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="No scheduled reports"
        description="Schedule a report from a template to have it generated and emailed daily, weekly or monthly."
        action={<Button onClick={onBrowseTemplates}>Browse templates</Button>}
      />
    );
  }

  return (
    <div className="space-y-3">
      {schedules.map((schedule) => (
        <ScheduleCard key={schedule.id} schedule={schedule} onEdit={() => onEdit(schedule)} onDelete={() => setDeleting(schedule)} />
      ))}
      <Dialog open={deleting !== null} onOpenChange={(open) => { if (!open) setDeleting(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this schedule?</DialogTitle>
            <DialogDescription>“{deleting?.name}” stops running. Reports it already generated stay in the history.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="destructive" loading={deleteSchedule.isPending} onClick={() => { void handleDelete(); }}>Delete schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
