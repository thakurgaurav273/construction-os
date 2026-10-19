import { format, isToday, isYesterday } from 'date-fns';
import type { AttendanceStatus, Worker } from '@/hooks/api/use-workforce';
import type { AttendanceDisplayStatus } from '../constants';

const ON_SITE_STATUSES: AttendanceStatus[] = ['PRESENT', 'LATE', 'HALF_DAY'];

export function toDisplayStatus(status: AttendanceStatus | null): AttendanceDisplayStatus {
  return status ?? 'NOT_MARKED';
}

export function isOnSiteToday(worker: Pick<Worker, 'todayStatus'>): boolean {
  return worker.todayStatus !== null && ON_SITE_STATUSES.includes(worker.todayStatus);
}

export function isAbsentToday(worker: Pick<Worker, 'todayStatus'>): boolean {
  return worker.todayStatus === 'ABSENT';
}

/** "Today, 7:32 AM", "Yesterday, 5:30 PM" or "Oct 12, 7:32 AM". */
export function formatCheckIn(timestamp: string | null): string {
  if (!timestamp) return '—';
  const date = new Date(timestamp);
  const time = format(date, 'h:mm a');
  if (isToday(date)) return `Today, ${time}`;
  if (isYesterday(date)) return `Yesterday, ${time}`;
  return format(date, 'MMM d, h:mm a');
}

export function attendanceRateTone(rate: number | null): string {
  if (rate === null) return 'text-muted-foreground';
  if (rate >= 90) return 'text-emerald-600 dark:text-emerald-400';
  if (rate >= 75) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-orange-500',
];

export function avatarColorFor(id: string): string {
  const hash = [...id].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 9973, 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
