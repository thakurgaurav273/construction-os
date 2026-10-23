import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, ProjectStatus } from '@prisma/client';

/** Works with the Prisma service and inside a transaction. */
type ProjectReader = Pick<Prisma.TransactionClient, 'project'>;

export interface ProjectRef {
  id: string;
  name: string;
  status: ProjectStatus;
}

/** A project of the caller's organization, or 404. Use for reads, which archived projects still allow. */
export async function findProjectInOrganization(db: ProjectReader, projectId: string, organizationId: string): Promise<ProjectRef> {
  const project = await db.project.findFirst({
    where: { id: projectId, organizationId, deletedAt: null },
    select: { id: true, name: true, status: true },
  });
  if (!project) throw new NotFoundException('Project not found.');
  return project;
}

/**
 * Archived projects are closed for new site work: reports, attendance, orders, material movements, stores,
 * documents and bills. Reading stays open, as do money flows already owed (vendor bills, payments, receipts).
 */
export function assertProjectOpen(project: Pick<ProjectRef, 'status'>, action: string): void {
  if (project.status === ProjectStatus.ARCHIVED) {
    throw new ConflictException(`This project is archived, so you can't ${action}. Restore it from the project menu first.`);
  }
}

/** A project of the caller's organization that still takes new work. */
export async function findOpenProject(db: ProjectReader, projectId: string, organizationId: string, action: string): Promise<ProjectRef> {
  const project = await findProjectInOrganization(db, projectId, organizationId);
  assertProjectOpen(project, action);
  return project;
}
