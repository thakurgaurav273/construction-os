export type ReportType = 'EXECUTIVE' | 'COST' | 'WORKFORCE' | 'SCHEDULE' | 'PROCUREMENT' | 'INVENTORY' | 'FINANCIAL' | 'SAFETY';
export type ReportFormat = 'PDF' | 'EXCEL' | 'BOTH';
export type ReportStatus = 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';
export type ScheduleFrequency = 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type ValueKind = 'text' | 'number' | 'money' | 'percent' | 'date';
export type CellValue = string | number | null;

export interface ReportTemplate {
  id: ReportType;
  name: string;
  description: string;
  icon: string;
}

export interface GeneratedReport {
  id: string;
  name: string;
  type: ReportType;
  format: ReportFormat;
  status: ReportStatus;
  error: string | null;
  projectIds: string[];
  periodFrom: string | null;
  periodTo: string | null;
  scheduleId: string | null;
  hasPdf: boolean;
  hasExcel: boolean;
  fileSize: number | null;
  generatedAt: string;
  completedAt: string | null;
}

export interface ReportPage {
  items: GeneratedReport[];
  total: number;
  page: number;
  limit: number;
}

export interface ReportColumn {
  key: string;
  label: string;
  kind: ValueKind;
}

export interface ReportTable {
  columns: ReportColumn[];
  rows: Record<string, CellValue>[];
  totals?: Record<string, CellValue>;
  emptyText: string;
  omittedRows?: number;
}

export interface ReportSection {
  title: string;
  description?: string;
  table?: ReportTable;
  bullets?: string[];
}

export interface ReportMetric {
  label: string;
  value: CellValue;
  kind: ValueKind;
  hint?: string;
  tone?: 'good' | 'bad';
}

/** The same content the PDF and Excel files are rendered from. */
export interface ReportDocument {
  type: ReportType;
  title: string;
  subtitle: string;
  organizationName: string;
  generatedAt: string;
  period: { from: string; to: string };
  projectNames: string[];
  allProjects: boolean;
  metrics: ReportMetric[];
  sections: ReportSection[];
  aiSummary: string | null;
}

export interface GeneratedReportDetail extends GeneratedReport {
  document: ReportDocument | null;
}

export interface ReportSchedule {
  id: string;
  name: string;
  reportType: ReportType;
  frequency: ScheduleFrequency;
  time: string;
  timezone: string;
  projects: string[];
  recipients: string[];
  emails: string[];
  outputFormat: ReportFormat;
  includeAiSummary: boolean;
  enabled: boolean;
  lastRunAt: string | null;
  lastStatus: 'GENERATING' | 'DELIVERED' | 'PARTIAL' | 'FAILED' | 'NO_RECIPIENTS' | null;
  lastError: string | null;
  nextRunAt: string | null;
  createdAt: string;
}

export interface GenerateReportInput {
  type: ReportType;
  name: string;
  format: ReportFormat;
  projectIds: string[];
  periodFrom: string;
  periodTo: string;
  includeAiSummary: boolean;
}

export interface ScheduleInput {
  name: string;
  frequency: ScheduleFrequency;
  time: string;
  timezone: string;
  projects: string[];
  recipients: string[];
  emails: string[];
  outputFormat: ReportFormat;
  includeAiSummary: boolean;
}
