import { format } from 'date-fns';
import { CheckCircle2, Clock, RotateCcw } from 'lucide-react';
import { cn } from '@sitepilot/ui';
import type { DailyReport } from '@/hooks/api/use-daily-reports';

function formatTimestamp(value: string): string {
  return format(new Date(value), 'MMM dd, yyyy · h:mm a');
}

/** Explains where the report is in review and, when sent back, what the author must fix. */
export function ReportReviewBanner({ report }: { report: DailyReport }) {
  if (report.status === 'DRAFT') return null;

  if (report.status === 'SUBMITTED') {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm dark:border-blue-900 dark:bg-blue-950/30">
        <Clock className="h-4 w-4 mt-0.5 shrink-0 text-blue-600" aria-hidden="true" />
        <p>
          <span className="font-medium">Awaiting review.</span>{' '}
          {report.submittedAt && (
            <span className="text-muted-foreground">Submitted {formatTimestamp(report.submittedAt)}.</span>
          )}
        </p>
      </div>
    );
  }

  const isApproved = report.status === 'APPROVED';
  const Icon = isApproved ? CheckCircle2 : RotateCcw;
  const reviewer = report.reviewedBy?.name ?? 'A reviewer';

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border p-4 text-sm',
        isApproved
          ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30'
          : 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30',
      )}
    >
      <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', isApproved ? 'text-emerald-600' : 'text-amber-600')} aria-hidden="true" />
      <div className="space-y-1">
        <p>
          <span className="font-medium">
            {isApproved ? `Approved by ${reviewer}` : `${reviewer} requested changes`}
          </span>{' '}
          {report.reviewedAt && (
            <span className="text-muted-foreground">· {formatTimestamp(report.reviewedAt)}</span>
          )}
        </p>
        {report.reviewNote && <p className="whitespace-pre-line text-foreground/90">{report.reviewNote}</p>}
      </div>
    </div>
  );
}
