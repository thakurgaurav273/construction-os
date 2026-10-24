import type { PrismaService } from '../../../database/prisma.service';
import type { ReceivablesService } from '../../billing/receivables.service';
import type { BudgetService } from '../../finance/budget.service';

export type CellValue = string | number | null;
export type ValueKind = 'text' | 'number' | 'money' | 'percent' | 'date';

export interface ReportColumn {
  key: string;
  label: string;
  kind: ValueKind;
}

export interface ReportTable {
  columns: ReportColumn[];
  rows: Record<string, CellValue>[];
  totals?: Record<string, CellValue>;
  /** Shown instead of an empty table. */
  emptyText: string;
  /** Rows beyond the stored limit, left out of every format. */
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

/** One report's content, rendered the same way to PDF, Excel and the in-app preview. */
export interface ReportDocument {
  type: string;
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

export type ReportBody = Pick<ReportDocument, 'subtitle' | 'metrics' | 'sections'>;

export interface ReportScope {
  prisma: PrismaService;
  organizationId: string;
  /** Projects in scope: the ones chosen, or every live project. */
  projects: { id: string; name: string; code: string }[];
  /** No projects were chosen, so organization-wide data (warehouses, cash flow) is in scope too. */
  allProjects: boolean;
  from: Date;
  /** Inclusive: the end of the last day. */
  to: Date;
  receivables: ReceivablesService;
  budgets: BudgetService;
}

export type ReportBuilder = (scope: ReportScope) => Promise<ReportBody>;

/** Caps what one report stores; the PDF shows fewer still (see PDF_TABLE_ROWS). */
export const MAX_TABLE_ROWS = 5_000;

export function table(columns: ReportColumn[], rows: Record<string, CellValue>[], emptyText: string, totals?: Record<string, CellValue>): ReportTable {
  return {
    columns,
    rows: rows.slice(0, MAX_TABLE_ROWS),
    totals,
    emptyText,
    omittedRows: rows.length > MAX_TABLE_ROWS ? rows.length - MAX_TABLE_ROWS : undefined,
  };
}

export const col = (key: string, label: string, kind: ValueKind = 'text'): ReportColumn => ({ key, label, kind });

export const share = (part: number, whole: number): number | null => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : null);

export const isoDay = (date: Date | null | undefined): string | null => (date ? date.toISOString().slice(0, 10) : null);

export function projectIds(scope: ReportScope): string[] {
  return scope.projects.map((project) => project.id);
}

export function inPeriod(scope: ReportScope): { gte: Date; lte: Date } {
  return { gte: scope.from, lte: scope.to };
}

export function projectLabel(scope: ReportScope, projectId: string | null): string {
  const project = scope.projects.find((candidate) => candidate.id === projectId);
  return project ? project.name : 'No project';
}

/** Groups and sums, keeping first-seen order. */
export function sumBy<T>(items: T[], key: (item: T) => string, value: (item: T) => number): Map<string, number> {
  const totals = new Map<string, number>();
  for (const item of items) totals.set(key(item), (totals.get(key(item)) ?? 0) + value(item));
  return totals;
}
