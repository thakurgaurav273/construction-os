import type { Permission } from '@sitepilot/types';

export const REPORT_TYPES = [
  'EXECUTIVE', 'COST', 'WORKFORCE', 'SCHEDULE', 'PROCUREMENT', 'INVENTORY', 'FINANCIAL', 'SAFETY',
] as const;
export type ReportTypeKey = (typeof REPORT_TYPES)[number];

/**
 * The area whose data each report type shows. A member sees and makes only the types whose area they can
 * view, so a report can't reveal what the app itself hides from them (ADR-050). Cost reports include
 * budget heads, which are financial data.
 */
export const REPORT_TYPE_PERMISSIONS: Record<ReportTypeKey, Permission> = {
  EXECUTIVE: 'project.view',
  COST: 'finance.view',
  WORKFORCE: 'workforce.view',
  SCHEDULE: 'dailyReport.view',
  PROCUREMENT: 'procurement.view',
  INVENTORY: 'inventory.view',
  FINANCIAL: 'finance.view',
  SAFETY: 'dailyReport.view',
};

/** The permission a stored report type needs; anything unrecognised is treated as financial. */
export function reportTypePermission(type: string): Permission {
  const known = REPORT_TYPES.find((candidate) => candidate === type);
  return known ? REPORT_TYPE_PERMISSIONS[known] : 'finance.view';
}

export function visibleReportTypes(permissions: readonly Permission[]): ReportTypeKey[] {
  return REPORT_TYPES.filter((type) => permissions.includes(REPORT_TYPE_PERMISSIONS[type]));
}

export const REPORT_FORMATS = ['PDF', 'EXCEL', 'BOTH'] as const;
export const SCHEDULE_FREQUENCIES = ['ONCE', 'DAILY', 'WEEKLY', 'MONTHLY'] as const;
export const MAX_REPORT_PROJECTS = 50;

export const REPORT_TITLES: Record<string, string> = {
  EXECUTIVE: 'Executive Summary',
  COST: 'Cost Analysis',
  WORKFORCE: 'Workforce Report',
  SCHEDULE: 'Schedule Progress',
  PROCUREMENT: 'Procurement Report',
  INVENTORY: 'Inventory Report',
  FINANCIAL: 'Financial Report',
  SAFETY: 'Safety & Compliance',
};

/** Ad-hoc reports cover the last 30 days unless a period is chosen; schedules cover the time since their last run. */
export const DEFAULT_REPORT_DAYS = 30;
export const MAX_REPORT_DAYS = 366;
/** Download links in report emails are signed for this long (the S3 maximum). */
export const REPORT_LINK_TTL_SECONDS = 7 * 24 * 3600;
export const SCHEDULER_TICK_MS = 60_000;
export const GENERATE_REPORT_JOB = 'reports.generate';
export const SCHEDULER_TICK_JOB = 'reports.scheduler-tick';
