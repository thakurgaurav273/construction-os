import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Worker, WorkerShift, WorkerType } from '@prisma/client';
import { findOpenProject } from '../projects/project-guards';
import { PrismaService } from '../../database/prisma.service';
import { normalizeOptionalText } from '../../common/utils/normalize-text';
import { shiftDateKey } from './attendance-dates';
import { AttendanceInsightsService, AttendanceTrend, computeAttendanceRate } from './attendance-insights.service';
import { WorkforceQueryDto } from './dto/attendance.dto';
import { CreateWorkerDto } from './dto/create-worker.dto';
import { UpdateWorkerDto } from './dto/update-worker.dto';
import { WEEK_DAYS } from './workforce.constants';
import {
  EMPTY_ATTENDANCE_SUMMARY, WORKER_INCLUDE, WorkerDetailView, WorkerView, deriveInitials, toWorkerView,
} from './worker.mapper';

export interface WorkforceStats {
  total: number;
  presentToday: number;
  lateToday: number;
  absentToday: number;
  onLeaveToday: number;
  notMarkedToday: number;
  subcontractors: number;
  safetyCompliance: number;
  expiringCerts: number;
  attendanceRate7d: number | null;
}

interface WorkerData {
  role?: string;
  trade?: string;
  type?: WorkerType;
  shift?: WorkerShift;
  phone?: string | null;
  email?: string | null;
  experienceYears?: number;
  supervisor?: string | null;
  projectId?: string | null;
  skills?: string[];
  ppeCompliant?: boolean;
  emergencyContact?: Prisma.InputJsonObject | Prisma.NullableJsonNullValueInput;
}

@Injectable()
export class WorkforceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly insights: AttendanceInsightsService,
  ) {}

  async findAll(organizationId: string, query: WorkforceQueryDto): Promise<WorkerView[]> {
    const where: Prisma.WorkerWhereInput = { organizationId, projectId: query.projectId };
    if (query.includeInactive !== 'true') where.deactivatedAt = null;

    const [workers, { today }] = await Promise.all([
      this.prisma.worker.findMany({ where, include: WORKER_INCLUDE, orderBy: { name: 'asc' } }),
      this.insights.getOrganizationToday(organizationId),
    ]);
    const workerIds = query.projectId ? workers.map((worker) => worker.id) : undefined;
    const summaries = await this.insights.summarizeWorkers(organizationId, today, workerIds);

    return workers.map((worker) => toWorkerView(worker, summaries.get(worker.id) ?? EMPTY_ATTENDANCE_SUMMARY));
  }

  async findOne(id: string, organizationId: string): Promise<WorkerDetailView> {
    const worker = await this.prisma.worker.findFirst({ where: { id, organizationId }, include: WORKER_INCLUDE });
    if (!worker) throw new NotFoundException('Worker not found.');

    const { today } = await this.insights.getOrganizationToday(organizationId);
    const [summaries, history] = await Promise.all([
      this.insights.summarizeWorkers(organizationId, today, [id]),
      this.insights.getWorkerHistory(organizationId, id, today),
    ]);
    return { ...toWorkerView(worker, summaries.get(id) ?? EMPTY_ATTENDANCE_SUMMARY), ...history };
  }

  async create(organizationId: string, userId: string, dto: CreateWorkerDto): Promise<WorkerDetailView> {
    if (dto.projectId) await findOpenProject(this.prisma, dto.projectId, organizationId, 'assign workers to it');

    const worker = await this.prisma.worker.create({
      data: {
        ...toWorkerData(dto),
        name: dto.name.trim(),
        initials: deriveInitials(dto.name),
        role: dto.role.trim(),
        trade: dto.trade.trim(),
        organizationId,
      },
    });
    if (worker.projectId) await this.recordAssignment(worker, worker.projectId, userId);
    return this.findOne(worker.id, organizationId);
  }

  async update(id: string, organizationId: string, userId: string, dto: UpdateWorkerDto): Promise<WorkerDetailView> {
    const existing = await this.findWorkerOrThrow(id, organizationId);
    // Workers already on an archived site can still be edited; only new assignments are blocked.
    if (dto.projectId && dto.projectId !== existing.projectId) {
      await findOpenProject(this.prisma, dto.projectId, organizationId, 'assign workers to it');
    }

    const worker = await this.prisma.worker.update({
      where: { id },
      data: {
        ...toWorkerData(dto),
        name: dto.name?.trim(),
        initials: dto.name ? deriveInitials(dto.name) : undefined,
      },
    });
    if (dto.projectId && dto.projectId !== existing.projectId) {
      await this.recordAssignment(worker, dto.projectId, userId);
    }
    return this.findOne(id, organizationId);
  }

  /** Deactivated workers keep their attendance history but drop off rosters and headcounts. */
  async setActive(id: string, organizationId: string, active: boolean): Promise<WorkerDetailView> {
    await this.findWorkerOrThrow(id, organizationId);
    await this.prisma.worker.update({ where: { id }, data: { deactivatedAt: active ? null : new Date() } });
    return this.findOne(id, organizationId);
  }

  async getStats(organizationId: string, projectId?: string): Promise<WorkforceStats> {
    const { today } = await this.insights.getOrganizationToday(organizationId);
    const [workers, todayCounts, weekCounts] = await Promise.all([
      this.prisma.worker.findMany({
        where: { organizationId, projectId, deactivatedAt: null },
        select: { type: true, ppeCompliant: true, certifications: true },
      }),
      this.insights.getCountsBetween(organizationId, today, today, projectId),
      this.insights.getCountsBetween(organizationId, shiftDateKey(today, -(WEEK_DAYS - 1)), today, projectId),
    ]);

    const total = workers.length;
    const markedToday = todayCounts.present + todayCounts.late + todayCounts.halfDay
      + todayCounts.absent + todayCounts.onLeave;
    const ppeCompliant = workers.filter((worker) => worker.ppeCompliant).length;

    return {
      total,
      presentToday: todayCounts.present + todayCounts.late + todayCounts.halfDay,
      lateToday: todayCounts.late,
      absentToday: todayCounts.absent,
      onLeaveToday: todayCounts.onLeave,
      notMarkedToday: Math.max(0, total - markedToday),
      subcontractors: workers.filter((worker) => worker.type === 'SUBCONTRACTOR').length,
      safetyCompliance: total ? Math.round((ppeCompliant / total) * 100) : 0,
      expiringCerts: workers.filter((worker) => hasExpiringCertification(worker.certifications)).length,
      attendanceRate7d: computeAttendanceRate(weekCounts),
    };
  }

  async getAttendanceTrend(organizationId: string, projectId?: string): Promise<AttendanceTrend> {
    const { today } = await this.insights.getOrganizationToday(organizationId);
    return this.insights.getTrend(organizationId, today, projectId);
  }

  private async recordAssignment(worker: Worker, projectId: string, userId: string): Promise<void> {
    await this.prisma.activity.create({
      data: {
        type: 'update',
        title: 'Worker assigned',
        description: `${worker.name} (${worker.role}) joined the site team.`,
        entityType: 'worker',
        entityId: worker.id,
        actorId: userId,
        projectId,
        organizationId: worker.organizationId,
      },
    });
  }

  private async findWorkerOrThrow(id: string, organizationId: string): Promise<Worker> {
    const worker = await this.prisma.worker.findFirst({ where: { id, organizationId } });
    if (!worker) throw new NotFoundException('Worker not found.');
    return worker;
  }

}

function toWorkerData(dto: UpdateWorkerDto): WorkerData {
  const contact = dto.emergencyContact;
  const email = normalizeOptionalText(dto.email);
  return {
    role: dto.role?.trim(),
    trade: dto.trade?.trim(),
    type: dto.type,
    shift: dto.shift,
    phone: normalizeOptionalText(dto.phone),
    email: email ? email.toLowerCase() : email,
    experienceYears: dto.experienceYears,
    supervisor: normalizeOptionalText(dto.supervisor),
    projectId: dto.projectId,
    skills: dto.skills ? [...new Set(dto.skills.map((skill) => skill.trim()).filter(Boolean))] : undefined,
    ppeCompliant: dto.ppeCompliant,
    emergencyContact: contact === null
      ? Prisma.DbNull
      : contact && { name: contact.name.trim(), phone: contact.phone.trim(), relation: contact.relation.trim() },
  };
}

export function hasExpiringCertification(certifications: Prisma.JsonValue): boolean {
  return Array.isArray(certifications) && certifications.some(
    (certification) => typeof certification === 'object'
      && certification !== null
      && !Array.isArray(certification)
      && certification.status === 'expiring',
  );
}
