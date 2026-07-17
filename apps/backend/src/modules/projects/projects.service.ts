import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string) {
    const projects = await this.prisma.project.findMany({
      where: { organizationId, deletedAt: null },
      include: {
        members: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return projects.map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      description: p.description,
      clientName: p.clientName,
      location: p.location,
      status: p.status,
      priority: p.priority,
      progress: p.progress,
      budget: p.budget ? Number(p.budget) : null,
      spent: Number(p.spent),
      startDate: p.startDate,
      expectedCompletion: p.expectedCompletion,
      memberCount: p.members.length,
      createdAt: p.createdAt,
    }));
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

      await this.prisma.activity.create({
        data: {
          type: 'update',
          title: 'Project created',
          description: `${project.name} was created.`,
          entityType: 'project',
          entityId: project.id,
          actorId: userId,
          projectId: project.id,
          organizationId,
        },
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

    await this.prisma.activity.create({
      data: {
        type: 'update',
        title: 'Project updated',
        description: `${dto.name ?? existing.name} details were updated.`,
        entityType: 'project',
        entityId: id,
        actorId: userId,
        projectId: id,
        organizationId,
      },
    });

    return this.findOne(id, organizationId);
  }

  async getAvailableMembers(projectId: string, organizationId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Project not found');

    const memberships = await this.prisma.userOrganization.findMany({
      where: {
        organizationId,
        user: { projectMembers: { none: { projectId } } },
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
      },
      orderBy: { user: { name: 'asc' } },
    });

    return memberships.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      avatar: m.user.avatar,
      orgRole: m.role,
    }));
  }

  async addMember(projectId: string, organizationId: string, actorId: string, dto: AddMemberDto) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!project) throw new NotFoundException('Project not found');

    const membership = await this.prisma.userOrganization.findFirst({
      where: { userId: dto.userId, organizationId },
      include: { user: { select: { id: true, name: true } } },
    });
    if (!membership) {
      throw new BadRequestException('User does not belong to this organization.');
    }

    const existing = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: dto.userId } },
    });
    if (existing) {
      throw new ConflictException('This user is already a member of the project.');
    }

    await this.prisma.projectMember.create({
      data: {
        projectId,
        userId: dto.userId,
        role: dto.role,
      },
    });

    await this.prisma.activity.create({
      data: {
        type: 'update',
        title: 'Member added',
        description: `${membership.user.name} was added to the project team.`,
        entityType: 'project',
        entityId: projectId,
        actorId,
        projectId,
        organizationId,
      },
    });

    return this.findOne(projectId, organizationId);
  }
}
