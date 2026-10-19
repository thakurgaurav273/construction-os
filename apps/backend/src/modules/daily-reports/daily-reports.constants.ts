export const DAILY_REPORT_STATUSES = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'] as const;

export const ISSUE_SEVERITIES = ['minor', 'medium', 'high'] as const;

export const MAX_REPORT_LINE_ITEMS = 50;

export const MAX_REPORT_TEXT_LENGTH = 5000;

export const MAX_ATTACHMENT_SIZE_BYTES = 20 * 1024 * 1024;

export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
];
