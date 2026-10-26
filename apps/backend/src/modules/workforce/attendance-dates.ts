/**
 * Attendance is recorded per calendar day in the organization's timezone, not the server's.
 * Days travel through the code as 'YYYY-MM-DD' keys; Prisma stores @db.Date columns at UTC midnight.
 */
import type { WorkerShift } from '@prisma/client';
import { NIGHT_SHIFT_ROLLOVER_MINUTES, SHIFT_START_MINUTES } from './workforce.constants';

const MINUTES_PER_DAY = 24 * 60;

export function toLocalDateKey(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

export function toLocalMinutes(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0);
  return hour * 60 + minute;
}

export interface ShiftMoment {
  /** The attendance day the instant belongs to. */
  dateKey: string;
  /** Minutes since that day's shift started; negative before the start. */
  minutesAfterStart: number;
}

/**
 * Places an instant on a worker's shift. Day shifts follow the calendar. A night shift belongs to the
 * evening it starts, so a 01:30 arrival or a 06:00 check-out counts towards the night that began the day before.
 */
export function shiftMoment(instant: Date, timeZone: string, shift: WorkerShift): ShiftMoment {
  const localKey = toLocalDateKey(instant, timeZone);
  const minutes = toLocalMinutes(instant, timeZone);
  const start = SHIFT_START_MINUTES[shift];
  if (shift === 'NIGHT' && minutes < NIGHT_SHIFT_ROLLOVER_MINUTES) {
    return { dateKey: shiftDateKey(localKey, -1), minutesAfterStart: minutes + MINUTES_PER_DAY - start };
  }
  return { dateKey: localKey, minutesAfterStart: minutes - start };
}

export function dateKeyToDbDate(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

export function dbDateToKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function shiftDateKey(dateKey: string, days: number): string {
  const date = dateKeyToDbDate(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return dbDateToKey(date);
}

/** Inclusive list of day keys ending at `endKey`, oldest first. */
export function lastDateKeys(endKey: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => shiftDateKey(endKey, index - (count - 1)));
}
