import {
  BadRequestException, ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import { AttendanceStatus, Prisma } from '@prisma/client';
import { findOpenProject, findProjectInOrganization } from '../projects/project-guards';
import { PrismaService } from '../../database/prisma.service';
import { dateKeyToDbDate, shiftMoment } from './attendance-dates';
import {
  AttendanceCounts, AttendanceInsightsService, addToCounts, emptyAttendanceCounts,
} from './attendance-insights.service';
import { AttendanceEntryDto, MarkAttendanceDto } from './dto/attendance.dto';
import { LATE_GRACE_MINUTES, MAX_OPEN_SHIFT_HOURS, OFF_SITE_STATUSES } from './workforce.constants';

const ROSTER_WORKER_SELECT = {
  id: true, name: true, initials: true, role: true, trade: true, type: true, shift: true,
} satisfies Prisma.WorkerSelect;

const RECORD_INCLUDE = {
  worker: { select: ROSTER_WORKER_SELECT },
  markedBy: { select: { id: true, name: true } },
} satisfies Prisma.AttendanceInclude;

type RosterWorker = Prisma.WorkerGetPayload<{ select: typeof ROSTER_WORKER_SELECT }>;
type AttendanceRecordWithRelations = Prisma.AttendanceGetPayload<{ include: typeof RECORD_INCLUDE }>;

export interface AttendanceRecordView {
  id: string;
  workerId: string;
  status: AttendanceStatus;
  checkInAt: Date | null;
  checkOutAt: Date | null;
  hoursWorked: number | null;
  notes: string | null;
  markedBy: { id: string; name: string };
}

export interface AttendanceRoster {
  date: string;
  isToday: boolean;
  summary: AttendanceCounts & { total: number; notMarked: number };
  entries: { worker: RosterWorker; record: AttendanceRecordView | null }[];
}

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly insights: AttendanceInsightsService,
  ) {}

  /** Workers currently assigned to the site, plus anyone already recorded there that day. */
  async getRoster(organizationId: string, projectId: string, dateKey?: string): Promise<AttendanceRoster> {
    await findProjectInOrganization(this.prisma, projectId, organizationId);
    const { today } = await this.insights.getOrganizationToday(organizationId);
    const date = dateKey ?? today;
    this.assertNotFuture(date, today);

    const [assignedWorkers, records] = await Promise.all([
      this.prisma.worker.findMany({
        where: { organizationId, projectId, deactivatedAt: null },
        select: ROSTER_WORKER_SELECT,
        orderBy: { name: 'asc' },
      }),
      this.prisma.attendance.findMany({
        where: { organizationId, projectId, date: dateKeyToDbDate(date) },
        include: RECORD_INCLUDE,
      }),
    ]);

    const recordByWorker = new Map(records.map((record) => [record.workerId, record]));
    const assignedIds = new Set(assignedWorkers.map((worker) => worker.id));
    const formerWorkers = records.filter((record) => !assignedIds.has(record.workerId)).map((record) => record.worker);

    const entries = [...assignedWorkers, ...formerWorkers].map((worker) => {
      const record = recordByWorker.get(worker.id);
      return { worker, record: record ? toRecordView(record) : null };
    });

    const counts = emptyAttendanceCounts();
    for (const record of records) addToCounts(counts, record.status);

    return {
      date,
      isToday: date === today,
      summary: { ...counts, total: entries.length, notMarked: entries.length - records.length },
      entries,
    };
  }

  async markAttendance(
    organizationId: string,
    projectId: string,
    userId: string,
    dto: MarkAttendanceDto,
  ): Promise<AttendanceRoster> {
    await findOpenProject(this.prisma, projectId, organizationId, 'mark attendance on it');
    const { today } = await this.insights.getOrganizationToday(organizationId);
    this.assertNotFuture(dto.date, today);

    const workerIds = dto.entries.map((entry) => entry.workerId);
    if (new Set(workerIds).size !== workerIds.length) {
      throw new BadRequestException('Each worker can only be marked once per day.');
    }
    await this.assertWorkersCanBeMarked(organizationId, projectId, dto.date, workerIds);

    const counts = emptyAttendanceCounts();
    dto.entries.forEach((entry) => addToCounts(counts, entry.status));

    try {
      await this.saveMarks(organizationId, projectId, userId, dto, counts);
    } catch (error) {
      // Two people saving the same worker's first record of the day at once: the second insert clashes.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Someone else just recorded attendance for one of these workers. Refresh and try again.');
      }
      throw error;
    }

    return this.getRoster(organizationId, projectId, dto.date);
  }

  private async saveMarks(
    organizationId: string,
    projectId: string,
    userId: string,
    dto: MarkAttendanceDto,
    counts: AttendanceCounts,
  ): Promise<void> {
    const date = dateKeyToDbDate(dto.date);
    await this.prisma.$transaction(async (tx) => {
      const written = [];
      for (const entry of dto.entries) {
        written.push(await tx.attendance.upsert({
          where: { workerId_date: { workerId: entry.workerId, date } },
          create: { ...toEntryData(entry), workerId: entry.workerId, projectId, organizationId, date, markedById: userId },
          update: { ...toEntryData(entry), markedById: userId },
          select: { projectId: true, worker: { select: { name: true } } },
        }));
      }
      // Another site may have recorded the same worker since the check above; the day stays with that site.
      const elsewhere = written.filter((record) => record.projectId !== projectId);
      if (elsewhere.length > 0) {
        const names = elsewhere.map((record) => record.worker.name).join(', ');
        throw new ConflictException(`Already recorded at another site that day: ${names}.`);
      }
      await tx.activity.create({
        data: {
          type: 'update',
          title: 'Attendance marked',
          description: `${dto.date}: ${counts.present + counts.late + counts.halfDay} on site, ${counts.absent} absent, ${counts.onLeave} on leave.`,
          entityType: 'attendance',
          entityId: projectId,
          metadata: { date: dto.date, ...counts },
          actorId: userId,
          projectId,
          organizationId,
        },
      });
    });
  }

  /**
   * Records arrival now, on the worker's shift day: a night-shift arrival after midnight still counts
   * towards the night that started the evening before. Lateness is measured from that shift's start.
   */
  async checkIn(organizationId: string, projectId: string, userId: string, workerId: string): Promise<AttendanceRecordView> {
    await findOpenProject(this.prisma, projectId, organizationId, 'mark attendance on it');
    const worker = await this.findActiveWorker(workerId, organizationId);
    const { timeZone } = await this.insights.getOrganizationToday(organizationId);
    const now = new Date();
    const shift = shiftMoment(now, timeZone, worker.shift);
    const date = dateKeyToDbDate(shift.dateKey);

    const existing = await this.prisma.attendance.findUnique({ where: { workerId_date: { workerId, date } } });
    if (existing && existing.projectId !== projectId) {
      throw new ConflictException(`${worker.name} is already recorded at another site for this shift.`);
    }
    if (existing?.checkInAt) throw new ConflictException(`${worker.name} has already checked in for this shift.`);

    const isLate = shift.minutesAfterStart > LATE_GRACE_MINUTES;
    const status: AttendanceStatus = isLate ? 'LATE' : 'PRESENT';

    const record = await this.prisma.attendance.upsert({
      where: { workerId_date: { workerId, date } },
      create: { workerId, projectId, organizationId, date, status, checkInAt: now, markedById: userId },
      update: { status, checkInAt: now, checkOutAt: null, hoursWorked: null, markedById: userId },
      include: RECORD_INCLUDE,
    });
    return toRecordView(record);
  }

  /**
   * Closes the worker's latest open check-in, whatever day it was recorded on, so a night shift (or a day
   * shift running past midnight) can check out the next morning.
   */
  async checkOut(organizationId: string, projectId: string, userId: string, workerId: string): Promise<AttendanceRecordView> {
    await findOpenProject(this.prisma, projectId, organizationId, 'mark attendance on it');
    const worker = await this.findActiveWorker(workerId, organizationId);
    const now = new Date();

    const existing = await this.prisma.attendance.findFirst({
      where: { workerId, organizationId, checkOutAt: null, checkInAt: { gte: new Date(now.getTime() - MAX_OPEN_SHIFT_HOURS * 3_600_000) } },
      orderBy: { checkInAt: 'desc' },
    });
    if (!existing?.checkInAt || existing.projectId !== projectId) {
      throw new ConflictException(`${worker.name} has no open check-in at this site. Check in first, or they've already checked out.`);
    }

    const hoursWorked = Math.round(((now.getTime() - existing.checkInAt.getTime()) / 3_600_000) * 100) / 100;
    const record = await this.prisma.attendance.update({
      where: { id: existing.id },
      data: { checkOutAt: now, hoursWorked, markedById: userId },
      include: RECORD_INCLUDE,
    });
    return toRecordView(record);
  }

  private async assertWorkersCanBeMarked(
    organizationId: string,
    projectId: string,
    dateKey: string,
    workerIds: string[],
  ): Promise<void> {
    const [workers, recordsElsewhere] = await Promise.all([
      this.prisma.worker.findMany({
        where: { id: { in: workerIds }, organizationId, deactivatedAt: null },
        select: { id: true },
      }),
      this.prisma.attendance.findMany({
        where: { workerId: { in: workerIds }, date: dateKeyToDbDate(dateKey), projectId: { not: projectId } },
        select: { worker: { select: { name: true } }, project: { select: { name: true } } },
      }),
    ]);

    if (workers.length !== workerIds.length) {
      throw new BadRequestException('Some workers were not found or are no longer active.');
    }
    if (recordsElsewhere.length > 0) {
      const names = recordsElsewhere.map((record) => `${record.worker.name} (${record.project.name})`).join(', ');
      throw new ConflictException(`Already recorded at another site that day: ${names}.`);
    }
  }

  private async findActiveWorker(workerId: string, organizationId: string): Promise<{ name: string; shift: 'DAY' | 'NIGHT' }> {
    const worker = await this.prisma.worker.findFirst({
      where: { id: workerId, organizationId, deactivatedAt: null },
      select: { name: true, shift: true },
    });
    if (!worker) throw new NotFoundException('Worker not found.');
    return worker;
  }

  private assertNotFuture(dateKey: string, today: string): void {
    if (dateKey > today) throw new BadRequestException("Attendance can't be recorded for a future date.");
  }

}

function toEntryData(entry: AttendanceEntryDto): Pick<Prisma.AttendanceUncheckedCreateInput, 'status' | 'notes'> & {
  checkInAt?: null;
  checkOutAt?: null;
  hoursWorked?: null;
} {
  const notes = entry.notes?.trim() || null;
  if (OFF_SITE_STATUSES.includes(entry.status)) {
    return { status: entry.status, notes, checkInAt: null, checkOutAt: null, hoursWorked: null };
  }
  return { status: entry.status, notes };
}

function toRecordView(record: AttendanceRecordWithRelations): AttendanceRecordView {
  return {
    id: record.id,
    workerId: record.workerId,
    status: record.status,
    checkInAt: record.checkInAt,
    checkOutAt: record.checkOutAt,
    hoursWorked: record.hoursWorked,
    notes: record.notes,
    markedBy: record.markedBy,
  };
}
