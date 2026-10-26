import { AttendanceStatus, WorkerShift } from '@prisma/client';

export const ATTENDANCE_STATUSES = ['PRESENT', 'LATE', 'HALF_DAY', 'ABSENT', 'ON_LEAVE'] as const;

/** Statuses that mean the worker was on site that day. */
export const ON_SITE_STATUSES: AttendanceStatus[] = ['PRESENT', 'LATE', 'HALF_DAY'];

/** Statuses where check-in/out times make no sense and are cleared. */
export const OFF_SITE_STATUSES: AttendanceStatus[] = ['ABSENT', 'ON_LEAVE'];

/** Shift start as minutes after local midnight. Checking in after start + grace counts as late. */
export const SHIFT_START_MINUTES: Record<WorkerShift, number> = { DAY: 8 * 60, NIGHT: 20 * 60 };
export const LATE_GRACE_MINUTES = 30;
/** A night shift's attendance day is the evening it starts: anything before noon belongs to the night before. */
export const NIGHT_SHIFT_ROLLOVER_MINUTES = 12 * 60;
/** A check-in older than this with no check-out is treated as forgotten, not as a shift still in progress. */
export const MAX_OPEN_SHIFT_HOURS = 16;

export const ATTENDANCE_RATE_WINDOW_DAYS = 30;
export const RECENT_ATTENDANCE_LIMIT = 14;
export const WEEK_DAYS = 7;
export const TREND_DAYS = 14;
export const TREND_WEEKS = 6;
export const MAX_BULK_ATTENDANCE_ENTRIES = 500;

/** Matches the Organization.timezone column default. */
export const DEFAULT_TIME_ZONE = 'Asia/Kolkata';
