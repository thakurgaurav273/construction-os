import { Injectable } from '@nestjs/common';
import { AttendanceStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  dateKeyToDbDate, dbDateToKey, lastDateKeys, shiftDateKey, toLocalDateKey,
} from './attendance-dates';
import {
  ATTENDANCE_RATE_WINDOW_DAYS, DEFAULT_TIME_ZONE, ON_SITE_STATUSES, RECENT_ATTENDANCE_LIMIT, TREND_DAYS, TREND_WEEKS, WEEK_DAYS,
} from './workforce.constants';
import { AttendanceHistoryItem, WorkerAttendanceSummary } from './worker.mapper';

export interface OrganizationToday {
  timeZone: string;
  today: string;
}

export interface AttendanceCounts {
  present: number;
  late: number;
  halfDay: number;
  absent: number;
  onLeave: number;
}

export interface DailyAttendancePoint extends AttendanceCounts {
  date: string;
}

export interface WeeklyAttendancePoint {
  weekStart: string;
  weekEnd: string;
  onSite: number;
  absent: number;
  attendanceRate: number | null;
}

export interface AttendanceTrend {
  daily: DailyAttendancePoint[];
  weekly: WeeklyAttendancePoint[];
}

const COUNT_FIELD: Record<AttendanceStatus, keyof AttendanceCounts> = {
  PRESENT: 'present',
  LATE: 'late',
  HALF_DAY: 'halfDay',
  ABSENT: 'absent',
  ON_LEAVE: 'onLeave',
};

export function emptyAttendanceCounts(): AttendanceCounts {
  return { present: 0, late: 0, halfDay: 0, absent: 0, onLeave: 0 };
}

export function addToCounts(counts: AttendanceCounts, status: AttendanceStatus, amount = 1): void {
  counts[COUNT_FIELD[status]] += amount;
}

export function mergeCounts(target: AttendanceCounts, source: AttendanceCounts): void {
  target.present += source.present;
  target.late += source.late;
  target.halfDay += source.halfDay;
  target.absent += source.absent;
  target.onLeave += source.onLeave;
}

/** Approved leave is excluded; a half day counts as half a day on site. */
export function computeAttendanceRate(counts: AttendanceCounts): number | null {
  const expectedDays = counts.present + counts.late + counts.halfDay + counts.absent;
  if (expectedDays === 0) return null;
  const daysOnSite = counts.present + counts.late + counts.halfDay * 0.5;
  return Math.round((daysOnSite / expectedDays) * 100);
}

@Injectable()
export class AttendanceInsightsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrganizationToday(organizationId: string): Promise<OrganizationToday> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { timezone: true },
    });
    const timeZone = resolveTimeZone(organization?.timezone);
    return { timeZone, today: toLocalDateKey(new Date(), timeZone) };
  }

  async summarizeWorkers(
    organizationId: string,
    today: string,
    workerIds?: string[],
  ): Promise<Map<string, WorkerAttendanceSummary>> {
    const workerFilter: Prisma.AttendanceWhereInput = workerIds ? { workerId: { in: workerIds } } : {};
    const windowStart = dateKeyToDbDate(shiftDateKey(today, -(ATTENDANCE_RATE_WINDOW_DAYS - 1)));

    const [todayRecords, windowGroups, checkInGroups, onSiteGroups] = await Promise.all([
      this.prisma.attendance.findMany({
        where: { organizationId, ...workerFilter, date: dateKeyToDbDate(today) },
        select: { workerId: true, status: true },
      }),
      this.prisma.attendance.groupBy({
        by: ['workerId', 'status'],
        where: { organizationId, ...workerFilter, date: { gte: windowStart, lte: dateKeyToDbDate(today) } },
        _count: { _all: true },
      }),
      this.prisma.attendance.groupBy({
        by: ['workerId'],
        where: { organizationId, ...workerFilter, checkInAt: { not: null } },
        _max: { checkInAt: true },
      }),
      this.prisma.attendance.groupBy({
        by: ['workerId'],
        where: { organizationId, ...workerFilter, status: { in: ON_SITE_STATUSES }, date: { lte: dateKeyToDbDate(today) } },
        _max: { date: true },
      }),
    ]);

    const countsByWorker = new Map<string, AttendanceCounts>();
    for (const group of windowGroups) {
      const counts = countsByWorker.get(group.workerId) ?? emptyAttendanceCounts();
      addToCounts(counts, group.status, group._count._all);
      countsByWorker.set(group.workerId, counts);
    }
    const todayStatusByWorker = new Map(todayRecords.map((record) => [record.workerId, record.status]));
    const lastCheckInByWorker = new Map(checkInGroups.map((group) => [group.workerId, group._max.checkInAt]));
    const lastOnSiteByWorker = new Map(onSiteGroups.map((group) => [group.workerId, group._max.date ? dbDateToKey(group._max.date) : null]));

    const workerIdsWithData = new Set([...countsByWorker.keys(), ...todayStatusByWorker.keys(), ...lastCheckInByWorker.keys(), ...lastOnSiteByWorker.keys()]);
    const summaries = new Map<string, WorkerAttendanceSummary>();
    for (const workerId of workerIdsWithData) {
      const counts = countsByWorker.get(workerId);
      summaries.set(workerId, {
        todayStatus: todayStatusByWorker.get(workerId) ?? null,
        attendanceRate: counts ? computeAttendanceRate(counts) : null,
        lastCheckInAt: lastCheckInByWorker.get(workerId) ?? null,
        lastOnSiteDate: lastOnSiteByWorker.get(workerId) ?? null,
      });
    }
    return summaries;
  }

  async getWorkerHistory(
    organizationId: string,
    workerId: string,
    today: string,
  ): Promise<{ week: { date: string; status: AttendanceStatus | null }[]; recentAttendance: AttendanceHistoryItem[] }> {
    const records = await this.prisma.attendance.findMany({
      where: { organizationId, workerId, date: { lte: dateKeyToDbDate(today) } },
      include: { project: { select: { id: true, name: true } } },
      orderBy: { date: 'desc' },
      take: RECENT_ATTENDANCE_LIMIT,
    });

    const recentAttendance = records.map((record) => ({
      date: dbDateToKey(record.date),
      status: record.status,
      checkInAt: record.checkInAt,
      checkOutAt: record.checkOutAt,
      hoursWorked: record.hoursWorked,
      project: record.project,
    }));
    const statusByDate = new Map(recentAttendance.map((item) => [item.date, item.status]));
    const week = lastDateKeys(today, WEEK_DAYS).map((date) => ({ date, status: statusByDate.get(date) ?? null }));

    return { week, recentAttendance };
  }

  async getCountsBetween(
    organizationId: string,
    fromDate: string,
    toDate: string,
    projectId?: string,
  ): Promise<AttendanceCounts> {
    const groups = await this.prisma.attendance.groupBy({
      by: ['status'],
      where: { organizationId, projectId, date: { gte: dateKeyToDbDate(fromDate), lte: dateKeyToDbDate(toDate) } },
      _count: { _all: true },
    });
    const counts = emptyAttendanceCounts();
    for (const group of groups) addToCounts(counts, group.status, group._count._all);
    return counts;
  }

  async getTrend(organizationId: string, today: string, projectId?: string): Promise<AttendanceTrend> {
    const dateKeys = lastDateKeys(today, TREND_WEEKS * WEEK_DAYS);
    const groups = await this.prisma.attendance.groupBy({
      by: ['date', 'status'],
      where: {
        organizationId,
        projectId,
        date: { gte: dateKeyToDbDate(dateKeys[0]), lte: dateKeyToDbDate(today) },
      },
      _count: { _all: true },
    });

    const countsByDate = new Map(dateKeys.map((date) => [date, emptyAttendanceCounts()]));
    for (const group of groups) {
      const counts = countsByDate.get(dbDateToKey(group.date));
      if (counts) addToCounts(counts, group.status, group._count._all);
    }

    const daily = dateKeys
      .slice(-TREND_DAYS)
      .map((date) => ({ date, ...(countsByDate.get(date) ?? emptyAttendanceCounts()) }));

    const weekly = Array.from({ length: TREND_WEEKS }, (_, weekIndex) => {
      const weekKeys = dateKeys.slice(weekIndex * WEEK_DAYS, (weekIndex + 1) * WEEK_DAYS);
      const weekCounts = emptyAttendanceCounts();
      for (const date of weekKeys) mergeCounts(weekCounts, countsByDate.get(date) ?? emptyAttendanceCounts());
      return {
        weekStart: weekKeys[0],
        weekEnd: weekKeys[weekKeys.length - 1],
        onSite: weekCounts.present + weekCounts.late + weekCounts.halfDay,
        absent: weekCounts.absent,
        attendanceRate: computeAttendanceRate(weekCounts),
      };
    });

    return { daily, weekly };
  }
}

/** The organization's time zone, or the default when it is missing or unknown to this runtime. */
export function resolveTimeZone(timeZone: string | null | undefined): string {
  if (!timeZone) return DEFAULT_TIME_ZONE;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return timeZone;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}
