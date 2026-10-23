import { Prisma } from '@prisma/client';

export interface ProjectActivity {
  projectId: string;
  organizationId: string;
  actorId: string;
  title: string;
  description: string;
}

/** Adds an entry to the project's timeline. */
export function recordProjectActivity(client: Prisma.TransactionClient, activity: ProjectActivity): Promise<unknown> {
  return client.activity.create({
    data: {
      type: 'update',
      title: activity.title,
      description: activity.description,
      entityType: 'project',
      entityId: activity.projectId,
      actorId: activity.actorId,
      projectId: activity.projectId,
      organizationId: activity.organizationId,
    },
  });
}
