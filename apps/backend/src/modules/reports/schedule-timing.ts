export type ScheduleFrequency = 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';

interface LocalDate { year: number; month: number; day: number }

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let existing = formatters.get(timeZone);
  if (!existing) {
    existing = new Intl.DateTimeFormat('en-US', {
      timeZone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
    });
    formatters.set(timeZone, existing);
  }
  return existing;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    formatter(timeZone);
    return true;
  } catch {
    return false;
  }
}

/** The wall-clock fields of an instant in a time zone. */
function wallClock(instant: Date, timeZone: string): Record<'year' | 'month' | 'day' | 'hour' | 'minute' | 'second', number> {
  const parts = Object.fromEntries(formatter(timeZone).formatToParts(instant).map((part) => [part.type, Number(part.value)]));
  return { year: parts.year, month: parts.month, day: parts.day, hour: parts.hour, minute: parts.minute, second: parts.second };
}

/** Milliseconds the zone is ahead of UTC at that instant. */
function zoneOffset(instant: Date, timeZone: string): number {
  const wall = wallClock(instant, timeZone);
  const asUtc = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second);
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** The instant a wall-clock time happens in a zone, checking the offset again across DST changes. */
export function zonedTimeToUtc(date: LocalDate, hour: number, minute: number, timeZone: string): Date {
  const naive = Date.UTC(date.year, date.month - 1, date.day, hour, minute);
  const first = naive - zoneOffset(new Date(naive), timeZone);
  return new Date(naive - zoneOffset(new Date(first), timeZone));
}

function localDate(instant: Date, timeZone: string): LocalDate {
  const wall = wallClock(instant, timeZone);
  return { year: wall.year, month: wall.month, day: wall.day };
}

function addDays(date: LocalDate, days: number): LocalDate {
  const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
}

/** Same day next month, or that month's last day when it is shorter (31 Jan → 28/29 Feb). */
function addMonth(date: LocalDate, anchorDay: number): LocalDate {
  const year = date.month === 12 ? date.year + 1 : date.year;
  const month = date.month === 12 ? 1 : date.month + 1;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { year, month, day: Math.min(anchorDay, lastDay) };
}

function parseTime(time: string): [number, number] {
  const [hour, minute] = time.split(':').map(Number);
  return [hour, minute];
}

/** The first run: today at `time` in the schedule's zone, or tomorrow if that has passed. */
export function firstRunAt(time: string, timeZone: string, now: Date): Date {
  const [hour, minute] = parseTime(time);
  const today = localDate(now, timeZone);
  const candidate = zonedTimeToUtc(today, hour, minute, timeZone);
  return candidate > now ? candidate : zonedTimeToUtc(addDays(today, 1), hour, minute, timeZone);
}

/**
 * The run after `previous`, stepping by the schedule's frequency in local time so 09:00 stays 09:00 through
 * DST. Runs missed while the server was down are skipped rather than sent in a burst. ONCE has no next run.
 */
export function nextRunAfter(frequency: ScheduleFrequency, time: string, timeZone: string, previous: Date, now: Date): Date | null {
  if (frequency === 'ONCE') return null;
  const [hour, minute] = parseTime(time);
  const anchorDay = localDate(previous, timeZone).day;
  let date = localDate(previous, timeZone);
  let next: Date;
  do {
    if (frequency === 'DAILY') date = addDays(date, 1);
    else if (frequency === 'WEEKLY') date = addDays(date, 7);
    else date = addMonth(date, anchorDay);
    next = zonedTimeToUtc(date, hour, minute, timeZone);
  } while (next <= now);
  return next;
}
