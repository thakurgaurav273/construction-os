import {
  BarChart3, FileText, LayoutDashboard, Package, PieChart, ShieldAlert, ShoppingCart, Users, Wallet, type LucideIcon,
} from 'lucide-react';
import type { CellValue, ReportFormat, ReportSchedule, ReportStatus, ReportType, ScheduleFrequency, ValueKind } from './types';

const ICONS: Record<string, LucideIcon> = { LayoutDashboard, PieChart, Users, BarChart3, ShoppingCart, Package, Wallet, ShieldAlert };

export function templateIcon(name: string): LucideIcon {
  return ICONS[name] ?? FileText;
}

export const TYPE_ACCENTS: Record<ReportType, string> = {
  EXECUTIVE: 'text-purple-500 bg-purple-500/10',
  COST: 'text-blue-500 bg-blue-500/10',
  WORKFORCE: 'text-emerald-500 bg-emerald-500/10',
  SCHEDULE: 'text-amber-500 bg-amber-500/10',
  PROCUREMENT: 'text-orange-500 bg-orange-500/10',
  INVENTORY: 'text-cyan-500 bg-cyan-500/10',
  FINANCIAL: 'text-green-500 bg-green-500/10',
  SAFETY: 'text-red-500 bg-red-500/10',
};

export const TYPE_LABELS: Record<ReportType, string> = {
  EXECUTIVE: 'Executive', COST: 'Cost', WORKFORCE: 'Workforce', SCHEDULE: 'Schedule',
  PROCUREMENT: 'Procurement', INVENTORY: 'Inventory', FINANCIAL: 'Financial', SAFETY: 'Safety',
};

export const FORMAT_LABELS: Record<ReportFormat, string> = { PDF: 'PDF', EXCEL: 'Excel', BOTH: 'PDF + Excel' };

export const FREQUENCY_LABELS: Record<ScheduleFrequency, string> = { ONCE: 'Once', DAILY: 'Daily', WEEKLY: 'Weekly', MONTHLY: 'Monthly' };

/** What period each scheduled run covers, mirroring the backend scheduler. */
export const FREQUENCY_WINDOWS: Record<ScheduleFrequency, string> = {
  ONCE: 'the last 30 days', DAILY: 'the last 24 hours', WEEKLY: 'the last 7 days', MONTHLY: 'the last 30 days',
};

type BadgeVariant = 'secondary' | 'destructive' | 'success' | 'warning' | 'info';

export const STATUS_PRESENTATION: Record<ReportStatus, { label: string; variant: BadgeVariant }> = {
  PENDING: { label: 'Queued', variant: 'info' },
  GENERATING: { label: 'Generating', variant: 'info' },
  COMPLETED: { label: 'Ready', variant: 'success' },
  FAILED: { label: 'Failed', variant: 'destructive' },
};

export const DELIVERY_PRESENTATION: Record<NonNullable<ReportSchedule['lastStatus']>, { label: string; variant: BadgeVariant }> = {
  GENERATING: { label: 'Running', variant: 'info' },
  DELIVERED: { label: 'Delivered', variant: 'success' },
  PARTIAL: { label: 'Partly delivered', variant: 'warning' },
  FAILED: { label: 'Failed', variant: 'destructive' },
  NO_RECIPIENTS: { label: 'No recipients', variant: 'warning' },
};

export const TIMEZONES = ['Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'America/New_York', 'UTC'];

export const isInProgress = (status: ReportStatus): boolean => status === 'PENDING' || status === 'GENERATING';

const SHORT_DATE = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

export function formatReportDate(isoDate: string): string {
  return SHORT_DATE.format(new Date(isoDate));
}

export function formatPeriod(from: string | null, to: string | null): string {
  if (!from || !to) return '—';
  return `${formatReportDate(from)} – ${formatReportDate(to)}`;
}

/** Matches the PDF's formatting so the preview and the file read the same. */
export function formatCell(value: CellValue | undefined, kind: ValueKind, currency = 'INR'): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'string') return kind === 'date' ? formatReportDate(value) : value;
  if (kind === 'money') {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
  }
  if (kind === 'percent') return `${value}%`;
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(value);
}

export function formatFileSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
