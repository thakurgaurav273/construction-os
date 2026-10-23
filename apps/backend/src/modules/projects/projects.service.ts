import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProjectStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectQueryDto } from './dto/project-query.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { recordProjectActivity } from './project-activity';
import {
  PROJECT_LIST_INCLUDE, PROJECT_SORT_FIELDS, ProjectOption, ProjectSummary, toProjectSummary,
} from './project.mapper';

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, query: ProjectQueryDto): Promise<Paginated<ProjectSummary>> {
    const where: Prisma.ProjectWhereInput = {
      organizationId,
      deletedAt: null,
      status: query.status ?? { not: ProjectStatus.ARCHIVED },
      ...(query.priority && { priority: query.priority }),
    };
    const search = query.search?.trim();
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { clientName: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    const sortField = PROJECT_SORT_FIELDS.find((field) => field === query.sort) ?? 'createdAt';
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [rows, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        include: PROJECT_LIST_INCLUDE,
        orderBy: [{ [sortField]: query.order === 'asc' ? 'asc' : 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.project.count({ where }),
    ]);
    return { items: rows.map(toProjectSummary), total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }

  /** Every project that can still take new work, for pickers and filters. Archived projects are excluded. */
  async findOptions(organizationId: string): Promise<ProjectOption[]> {
    return this.prisma.project.findMany({
      where: { organizationId, deletedAt: null, status: { not: ProjectStatus.ARCHIVED } },
      select: { id: true, name: true, code: true, status: true, progress: true, location: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 8,
          include: {
            actor: { select: { id: true, name: true, avatar: true } },
          },
        },
      },
    });

    if (!project) throw new NotFoundException('Project not found');

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
      createdAt: project.createdAt,
      members: project.members.map((m) => ({
        id: m.id,
        role: m.role,
        joinedAt: m.joinedAt,
        user: m.user,
      })),
      activities: project.activities.map((a) => ({
        id: a.id,
        type: a.type,
        title: a.title,
        description: a.description,
        createdAt: a.createdAt,
        actor: a.actor,
      })),
    };
  }

  async create(organizationId: string, userId: string, dto: CreateProjectDto) {
    if (dto.status === ProjectStatus.ARCHIVED) throw new BadRequestException("A new project can't start archived.");
    try {
      const project = await this.prisma.project.create({
        data: {
          name: dto.name,
          code: dto.code,
          description: dto.description,
          clientName: dto.clientName,
          location: dto.location,
          status: dto.status,
          priority: dto.priority,
          budget: dto.budget,
          progress: dto.progress ?? 0,
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          expectedCompletion: dto.expectedCompletion ? new Date(dto.expectedCompletion) : undefined,
          organizationId,
          createdById: userId,
        },
      });

      await recordProjectActivity(this.prisma, {
        projectId: project.id,
        organizationId,
        actorId: userId,
        title: 'Project created',
        description: `${project.name} was created.`,
      });

      return this.findOne(project.id, organizationId);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A project with this code already exists.');
      }
      throw error;
    }
  }

  async update(id: string, organizationId: string, userId: string, dto: UpdateProjectDto) {
    const existing = await this.prisma.project.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Project not found');
    if (existing.status === ProjectStatus.ARCHIVED) {
      throw new BadRequestException('This project is archived. Restore it before making changes.');
    }
    if (dto.status === ProjectStatus.ARCHIVED) {
      throw new BadRequestException('Use Archive project to archive it, so it can be restored later.');
    }

    try {
      await this.prisma.project.update({
        where: { id },
        data: {
          name: dto.name,
          code: dto.code,
          description: dto.description,
          clientName: dto.clientName,
          location: dto.location,
          status: dto.status,
          priority: dto.priority,
          budget: dto.budget,
          spent: dto.spent,
          progress: dto.progress,
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          expectedCompletion: dto.expectedCompletion ? new Date(dto.expectedCompletion) : undefined,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A project with this code already exists.');
      }
      throw error;
    }

    await recordProjectActivity(this.prisma, {
      projectId: id,
      organizationId,
      actorId: userId,
      title: 'Project updated',
      description: `${dto.name ?? existing.name} details were updated.`,
    });

    return this.findOne(id, organizationId);
  }
}
