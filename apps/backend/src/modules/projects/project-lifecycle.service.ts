import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Project, ProjectStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { recordProjectActivity } from './project-activity';

/** What a project must not have before it can be deleted: anything recorded on site or in the books. */
interface ProjectFootprint {
  dailyReports: number;
  purchaseOrders: number;
  invoices: number;
  payments: number;
  materialIssues: number;
  attendance: number;
  documents: number;
  workers: number;
  stores: number;
}

const FOOTPRINT_LABELS: Record<keyof ProjectFootprint, string> = {
  dailyReports: 'daily reports',
  purchaseOrders: 'purchase orders',
  invoices: 'invoices',
  payments: 'payments',
  materialIssues: 'material issues',
  attendance: 'attendance records',
  documents: 'documents',
  workers: 'assigned workers',
  stores: 'site stores',
};

/**
 * Archive hides a finished or abandoned project from day-to-day lists and pickers but keeps it readable and
 * restorable. Delete is only for projects created by mistake, so it's refused once anything was recorded.
 */
@Injectable()
export class ProjectLifecycleService {
  constructor(private readonly prisma: PrismaService) {}

  async archive(id: string, organizationId: string, actorId: string): Promise<void> {
    const project = await this.findProject(id, organizationId);
    if (project.status === ProjectStatus.ARCHIVED) throw new ConflictException('This project is already archived.');

    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.project.updateMany({
        where: { id, status: project.status },
        data: { status: ProjectStatus.ARCHIVED, archivedFromStatus: project.status, archivedAt: new Date() },
      });
      if (count === 0) throw new ConflictException('This project changed in the meantime. Refresh and try again.');
      await recordProjectActivity(tx, {
        projectId: id,
        organizationId,
        actorId,
        title: 'Project archived',
        description: `${project.name} was archived. It stays readable and can be restored.`,
      });
    });
  }

  async restore(id: string, organizationId: string, actorId: string): Promise<void> {
    const project = await this.findProject(id, organizationId);
    if (project.status !== ProjectStatus.ARCHIVED) throw new ConflictException('Only archived projects can be restored.');
    const restoredStatus = project.archivedFromStatus ?? ProjectStatus.ON_HOLD;

    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.project.updateMany({
        where: { id, status: ProjectStatus.ARCHIVED },
        data: { status: restoredStatus, archivedFromStatus: null, archivedAt: null },
      });
      if (count === 0) throw new ConflictException('This project changed in the meantime. Refresh and try again.');
      await recordProjectActivity(tx, {
        projectId: id,
        organizationId,
        actorId,
        title: 'Project restored',
        description: `${project.name} was restored from the archive.`,
      });
    });
  }

  /**
   * Soft delete. The code gets a suffix so it can be reused for a new project, while the row (and its audit
   * history) stays in the database.
   */
  async remove(id: string, organizationId: string, actorId: string): Promise<{ id: string }> {
    const project = await this.findProject(id, organizationId);
    const footprint = await this.footprint(id);
    const blockers = (Object.keys(footprint) as (keyof ProjectFootprint)[])
      .filter((key) => footprint[key] > 0)
      .map((key) => `${footprint[key]} ${FOOTPRINT_LABELS[key]}`);
    if (blockers.length > 0) {
      throw new BadRequestException(`${project.name} has ${blockers.join(', ')}. Archive it instead so that history is kept.`);
    }

    await this.prisma.project.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: actorId, code: `${project.code}~deleted-${id.slice(0, 8)}` },
    });
    return { id };
  }

  private async footprint(projectId: string): Promise<ProjectFootprint> {
    const where = { projectId };
    const [dailyReports, purchaseOrders, invoices, payments, materialIssues, attendance, documents, workers, stores] = await Promise.all([
      this.prisma.dailyReport.count({ where }),
      this.prisma.purchaseOrder.count({ where }),
      this.prisma.invoice.count({ where }),
      this.prisma.payment.count({ where }),
      this.prisma.materialIssue.count({ where }),
      this.prisma.attendance.count({ where }),
      this.prisma.document.count({ where }),
      this.prisma.worker.count({ where }),
      this.prisma.warehouse.count({ where: { projectId, deletedAt: null } }),
    ]);
    return { dailyReports, purchaseOrders, invoices, payments, materialIssues, attendance, documents, workers, stores };
  }

  private async findProject(id: string, organizationId: string): Promise<Project> {
    const project = await this.prisma.project.findFirst({ where: { id, organizationId, deletedAt: null } });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }
}
