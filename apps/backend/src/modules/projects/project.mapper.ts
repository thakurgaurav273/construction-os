import { Prisma, ProjectPriority, ProjectStatus } from '@prisma/client';

export const PROJECT_LIST_INCLUDE = { _count: { select: { members: true } } } satisfies Prisma.ProjectInclude;

type ProjectListRow = Prisma.ProjectGetPayload<{ include: typeof PROJECT_LIST_INCLUDE }>;

export interface ProjectSummary {
  id: string;
  name: string;
  code: string;
  description: string | null;
  clientName: string | null;
  location: string | null;
  status: ProjectStatus;
  priority: ProjectPriority;
  progress: number;
  budget: number | null;
  spent: number;
  startDate: Date | null;
  expectedCompletion: Date | null;
  archivedAt: Date | null;
  memberCount: number;
  createdAt: Date;
}

/** Lightweight shape for project pickers and filters. */
export interface ProjectOption {
  id: string;
  name: string;
  code: string;
  status: ProjectStatus;
  progress: number;
  location: string | null;
}

export function toProjectSummary(project: ProjectListRow): ProjectSummary {
  return {
    id: project.id,
    name: project.name,
    code: project.code,
    description: project.description,
    clientName: project.clientName,
    location: project.location,
    status: project.status,
    priority: project.priority,
    progress: project.progress,
    budget: project.budget ? Number(project.budget) : null,
    spent: Number(project.spent),
    startDate: project.startDate,
    expectedCompletion: project.expectedCompletion,
    archivedAt: project.archivedAt,
    memberCount: project._count.members,
    createdAt: project.createdAt,
  };
}

export const PROJECT_SORT_FIELDS = ['createdAt', 'name', 'code', 'progress', 'expectedCompletion', 'budget'] as const;
