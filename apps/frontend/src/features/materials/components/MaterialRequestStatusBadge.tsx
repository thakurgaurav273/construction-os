import React from 'react';
import { Badge, cn } from '@sitepilot/ui';
import type { MaterialRequestStatus } from '@/hooks/api/use-material-requests';

const STATUS_META: Record<MaterialRequestStatus, { label: string; className: string }> = {
  PENDING: {
    label: 'Pending',
    className: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/40 dark:text-amber-400',
  },
  APPROVED: {
    label: 'Approved',
    className: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/40 dark:bg-blue-950/40 dark:text-blue-400',
  },
  PARTLY_ISSUED: {
    label: 'Partly Issued',
    className: 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800/40 dark:bg-indigo-950/40 dark:text-indigo-400',
  },
  ISSUED: {
    label: 'Issued',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-400',
  },
  REJECTED: {
    label: 'Rejected',
    className: 'border-red-200 bg-red-50 text-red-700 dark:border-red-800/40 dark:bg-red-950/40 dark:text-red-400',
  },
  CANCELLED: { label: 'Cancelled', className: 'border-border bg-muted text-muted-foreground' },
  CLOSED: { label: 'Closed', className: 'border-border bg-muted text-muted-foreground' },
};

export function materialRequestStatusLabel(status: MaterialRequestStatus): string {
  return STATUS_META[status].label;
}

export function MaterialRequestStatusBadge({ status }: { status: MaterialRequestStatus }): React.ReactElement {
  const meta = STATUS_META[status];
  return <Badge variant="outline" className={cn('font-medium', meta.className)}>{meta.label}</Badge>;
}
