import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class WorkforceService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string) {
    const workers = await this.prisma.worker.findMany({
      where: { organizationId },
      include: { project: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });
    return workers.map((w) => this.mapWorker(w));
  }

  async findByProject(projectId: string, organizationId: string) {
    const workers = await this.prisma.worker.findMany({
      where: { projectId, organizationId },
      include: { project: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });
    return workers.map((w) => this.mapWorker(w));
  }

  async getProjectStats(projectId: string, organizationId: string) {
    const workers = await this.prisma.worker.findMany({
      where: { projectId, organizationId },
      select: { status: true, type: true, ppeCompliant: true, certifications: true },
    });

    const total           = workers.length;
    const presentToday    = workers.filter((w) => w.status === 'ACTIVE' || w.status === 'LATE').length;
    const absentToday     = workers.filter((w) => w.status === 'ABSENT').length;
    const subcontractors  = workers.filter((w) => w.type === 'SUBCONTRACTOR').length;
    const ppeCompliant    = workers.filter((w) => w.ppeCompliant).length;
    const safetyCompliance = total ? Math.round((ppeCompliant / total) * 100) : 0;
    const expiringCerts = workers.filter((w) => {
      const certs = w.certifications as { status: string }[] | null;
      return certs?.some((c) => c.status === 'expiring') ?? false;
    }).length;

    return { total, presentToday, absentToday, subcontractors, safetyCompliance, expiringCerts };
  }

  async findOne(id: string, organizationId: string) {
    const worker = await this.prisma.worker.findFirst({
      where: { id, organizationId },
      include: {
        project: { select: { id: true, name: true } },
      },
    });

    if (!worker) throw new NotFoundException('Worker not found');
    return this.mapWorker(worker);
  }

  async getStats(organizationId: string) {
    const workers = await this.prisma.worker.findMany({
      where: { organizationId },
      select: { status: true, type: true, ppeCompliant: true, certifications: true },
    });

    const total           = workers.length;
    const presentToday    = workers.filter((w) => w.status === 'ACTIVE' || w.status === 'LATE').length;
    const absentToday     = workers.filter((w) => w.status === 'ABSENT').length;
    const subcontractors  = workers.filter((w) => w.type === 'SUBCONTRACTOR').length;
    const ppeCompliant    = workers.filter((w) => w.ppeCompliant).length;
    const safetyCompliance = total ? Math.round((ppeCompliant / total) * 100) : 0;

    const expiringCerts = workers.filter((w) => {
      const certs = w.certifications as { status: string }[] | null;
      return certs?.some((c) => c.status === 'expiring') ?? false;
    }).length;

    return { total, presentToday, absentToday, subcontractors, safetyCompliance, expiringCerts };
  }

  private mapWorker(w: {
    id: string;
    name: string;
    initials: string;
    role: string;
    trade: string;
    type: string;
    phone: string | null;
    email: string | null;
    status: string;
    experienceYears: number;
    shift: string;
    attendancePercent: number;
    lastCheckIn: string | null;
    supervisor: string | null;
    projectId: string | null;
    emergencyContact: unknown;
    skills: string[];
    certifications: unknown;
    ppeCompliant: boolean;
    weeklyAttendance: unknown;
    recentActivity: unknown;
    createdAt: Date;
    project?: { id: string; name: string } | null;
  }) {
    return {
      id:                w.id,
      name:              w.name,
      initials:          w.initials,
      role:              w.role,
      trade:             w.trade,
      type:              w.type === 'SUBCONTRACTOR' ? 'Subcontractor' : 'Employee',
      phone:             w.phone,
      email:             w.email,
      status:            w.status.toLowerCase() as 'active' | 'late' | 'absent' | 'on_leave',
      experienceYears:   w.experienceYears,
      shift:             w.shift === 'DAY' ? 'Day' : 'Night',
      attendancePercent: w.attendancePercent,
      lastCheckIn:       w.lastCheckIn,
      supervisor:        w.supervisor,
      projectId:         w.projectId ?? w.project?.id ?? null,
      project:           w.project?.name ?? null,
      emergencyContact:  w.emergencyContact,
      skills:            w.skills,
      certifications:    w.certifications,
      ppeCompliant:      w.ppeCompliant,
      weeklyAttendance:  w.weeklyAttendance,
      recentActivity:    w.recentActivity,
    };
  }
}
