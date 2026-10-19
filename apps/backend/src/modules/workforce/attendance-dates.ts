/**
 * Attendance is recorded per calendar day in the organization's timezone, not the server's.
 * Days travel through the code as 'YYYY-MM-DD' keys; Prisma stores @db.Date columns at UTC midnight.
 */

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
