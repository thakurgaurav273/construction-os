import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

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
}
