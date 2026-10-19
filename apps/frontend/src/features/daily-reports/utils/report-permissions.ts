import type { DailyReport } from '@/hooks/api/use-daily-reports';
import { EDITABLE_REPORT_STATUSES } from '../constants';

/** Mirrors DailyReportsService.findEditableReport: author only, while DRAFT or REJECTED. */
export function canEditReport(report: DailyReport, userId: string | undefined): boolean {
  return report.submittedBy.id === userId && EDITABLE_REPORT_STATUSES.includes(report.status);
}

/** Mirrors DailyReportWorkflowService: submitted reports are reviewed by someone other than the author. */
export function canReviewReport(report: DailyReport, userId: string | undefined): boolean {
  return report.status === 'SUBMITTED' && userId !== undefined && report.submittedBy.id !== userId;
}
