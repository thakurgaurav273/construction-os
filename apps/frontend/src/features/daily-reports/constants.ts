import type { DailyReportStatus, IssueSeverity } from '@/hooks/api/use-daily-reports';

export const MAX_ATTACHMENT_SIZE_BYTES = 20 * 1024 * 1024;

export const ATTACHMENT_ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf';

export const ALLOWED_ATTACHMENT_TYPES = ATTACHMENT_ACCEPT.split(',');

export const MAX_LINE_ITEMS = 50;

export const ISSUE_SEVERITY_OPTIONS: { value: IssueSeverity; label: string }[] = [
  { value: 'minor', label: 'Minor' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export const REPORT_STATUS_OPTIONS: { value: DailyReportStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SUBMITTED', label: 'Awaiting review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Changes requested' },
];

export const EDITABLE_REPORT_STATUSES: DailyReportStatus[] = ['DRAFT', 'REJECTED'];
