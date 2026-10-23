import { GeneratedReport, ReportSchedule } from '@prisma/client';
import type { ReportDocument } from './content/report-document';

export interface ReportView {
  id: string;
  name: string;
  type: string;
  format: string;
  status: string;
  error: string | null;
  projectIds: string[];
  periodFrom: Date | null;
  periodTo: Date | null;
  scheduleId: string | null;
  hasPdf: boolean;
  hasExcel: boolean;
  fileSize: number | null;
  generatedAt: Date;
  completedAt: Date | null;
}

export interface ReportDetailView extends ReportView {
  document: ReportDocument | null;
}

export interface ReportScheduleView {
  id: string;
  name: string;
  reportType: string;
  frequency: string;
  time: string;
  timezone: string;
  projects: string[];
  recipients: string[];
  emails: string[];
  outputFormat: string;
  includeAiSummary: boolean;
  enabled: boolean;
  lastRunAt: Date | null;
  lastStatus: string | null;
  lastError: string | null;
  /** Null once a one-off schedule has run or a schedule is paused. */
  nextRunAt: Date | null;
  createdAt: Date;
}

/** Everything but the stored content, which only the detail view needs. */
export const REPORT_LIST_SELECT = {
  id: true, name: true, type: true, format: true, status: true, error: true, projectIds: true, periodFrom: true, periodTo: true,
  scheduleId: true, pdfKey: true, excelKey: true, fileSize: true, generatedAt: true, completedAt: true,
} as const;

type ReportListRecord = Pick<GeneratedReport, keyof typeof REPORT_LIST_SELECT>;

export function toReportView(report: ReportListRecord): ReportView {
  return {
    id: report.id,
    name: report.name,
    type: report.type,
    format: report.format,
    status: report.status,
    error: report.error,
    projectIds: report.projectIds,
    periodFrom: report.periodFrom,
    periodTo: report.periodTo,
    scheduleId: report.scheduleId,
    hasPdf: Boolean(report.pdfKey),
    hasExcel: Boolean(report.excelKey),
    fileSize: report.fileSize,
    generatedAt: report.generatedAt,
    completedAt: report.completedAt,
  };
}

export function isReportDocument(value: unknown): value is ReportDocument {
  return typeof value === 'object' && value !== null && 'metrics' in value && 'sections' in value;
}

export function toReportDetailView(report: GeneratedReport): ReportDetailView {
  // Reports generated before content was structured stored raw data; they have no preview.
  return { ...toReportView(report), document: isReportDocument(report.data) ? report.data : null };
}

export function toScheduleView(schedule: ReportSchedule): ReportScheduleView {
  return {
    id: schedule.id,
    name: schedule.name,
    reportType: schedule.reportType,
    frequency: schedule.frequency,
    time: schedule.time,
    timezone: schedule.timezone,
    projects: schedule.projects,
    recipients: schedule.recipients,
    emails: schedule.emails,
    outputFormat: schedule.outputFormat,
    includeAiSummary: schedule.includeAiSummary,
    enabled: schedule.enabled,
    lastRunAt: schedule.lastRunAt,
    lastStatus: schedule.lastStatus,
    lastError: schedule.lastError,
    nextRunAt: schedule.enabled ? schedule.nextRunAt : null,
    createdAt: schedule.createdAt,
  };
}
