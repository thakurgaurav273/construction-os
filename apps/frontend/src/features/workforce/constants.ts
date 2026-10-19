import type { AttendanceStatus, WorkerShift, WorkerType } from '@/hooks/api/use-workforce';

export type AttendanceDisplayStatus = AttendanceStatus | 'NOT_MARKED';

interface AttendanceStatusStyle {
  label: string;
  short: string;
  dot: string;
  text: string;
  tile: string;
}

export const ATTENDANCE_STATUS_STYLES: Record<AttendanceDisplayStatus, AttendanceStatusStyle> = {
  PRESENT: {
    label: 'Present', short: 'P', dot: 'bg-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    tile: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  LATE: {
    label: 'Late', short: 'L', dot: 'bg-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
    tile: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  HALF_DAY: {
    label: 'Half day', short: '½', dot: 'bg-violet-500',
    text: 'text-violet-600 dark:text-violet-400',
    tile: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  },
  ABSENT: {
    label: 'Absent', short: 'A', dot: 'bg-red-500',
    text: 'text-red-600 dark:text-red-400',
    tile: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  ON_LEAVE: {
    label: 'On leave', short: 'LV', dot: 'bg-blue-500',
    text: 'text-blue-600 dark:text-blue-400',
    tile: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  NOT_MARKED: {
    label: 'Not marked', short: '–', dot: 'bg-gray-300 dark:bg-gray-600',
    text: 'text-muted-foreground',
    tile: 'bg-muted/60 text-muted-foreground',
  },
};

export const ATTENDANCE_STATUS_ORDER: AttendanceStatus[] = ['PRESENT', 'LATE', 'HALF_DAY', 'ABSENT', 'ON_LEAVE'];

export const WORKER_TYPE_LABELS: Record<WorkerType, string> = {
  EMPLOYEE: 'Employee',
  SUBCONTRACTOR: 'Subcontractor',
};

export const SHIFT_LABELS: Record<WorkerShift, string> = {
  DAY: 'Day',
  NIGHT: 'Night',
};

export const TRADE_COLORS: Record<string, string> = {
  Civil: '#3b82f6',
  Electrical: '#f59e0b',
  'Steel Fixing': '#8b5cf6',
  Concrete: '#10b981',
  Mechanical: '#ef4444',
  Masonry: '#f97316',
  'Equipment Operation': '#06b6d4',
  Plumbing: '#84cc16',
  Carpentry: '#d97706',
  Painting: '#ec4899',
};

export const TRADE_OPTIONS = Object.keys(TRADE_COLORS);

export const DEFAULT_TRADE_COLOR = '#64748b';
