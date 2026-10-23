import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { MemberRole, ProjectStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AddMemberDto } from './dto/add-member.dto';
import { recordProjectActivity } from './project-activity';

export interface AvailableMember {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  orgRole: string;
}

const ROLE_LABELS: Record<MemberRole, string> = { MANAGER: 'manager', ENGINEER: 'engineer', VIEWER: 'viewer' };

/** Who works on a project. Organization roles still decide what each person may do; this is the project team. */
@Injectable()
export class ProjectMembersService {
  constructor(private readonly prisma: PrismaService) {}

  async getAvailableMembers(projectId: string, organizationId: string): Promise<AvailableMember[]> {
    await this.findProject(projectId, organizationId);
    const memberships = await this.prisma.userOrganization.findMany({
      where: { organizationId, user: { status: 'ACTIVE', projectMembers: { none: { projectId } } } },
      include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
      orderBy: { user: { name: 'asc' } },
    });
    return memberships.map((membership) => ({ ...membership.user, orgRole: membership.role }));
  }

  async addMember(projectId: string, organizationId: string, actorId: string, dto: AddMemberDto): Promise<void> {
    const project = await this.findEditableProject(projectId, organizationId);
    const membership = await this.prisma.userOrganization.findFirst({
      where: { userId: dto.userId, organizationId },
      include: { user: { select: { name: true } } },
    });
    if (!membership) throw new BadRequestException('This person is not a member of your organization.');

    const existing = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: dto.userId } },
    });
    if (existing) throw new ConflictException(`${membership.user.name} is already on the ${project.name} team.`);

    await this.prisma.$transaction(async (tx) => {
      await tx.projectMember.create({ data: { projectId, userId: dto.userId, role: dto.role } });
      await recordProjectActivity(tx, {
        projectId,
        organizationId,
        actorId,
        title: 'Member added',
        description: `${membership.user.name} was added to the project team.`,
      });
    });
  }

  async changeRole(projectId: string, userId: string, organizationId: string, actorId: string, role: MemberRole): Promise<void> {
    await this.findEditableProject(projectId, organizationId);
    const member = await this.findMember(projectId, userId);
    if (member.role === role) return;

    await this.prisma.$transaction(async (tx) => {
      await tx.projectMember.update({ where: { id: member.id }, data: { role } });
      await recordProjectActivity(tx, {
        projectId,
        organizationId,
        actorId,
        title: 'Member role changed',
        description: `${member.user.name} is now a project ${ROLE_LABELS[role]}.`,
      });
    });
  }

  /** Removing someone from the team keeps everything they recorded on the project. */
  async removeMember(projectId: string, userId: string, organizationId: string, actorId: string): Promise<void> {
    await this.findEditableProject(projectId, organizationId);
    const member = await this.findMember(projectId, userId);
    if (member.role === MemberRole.MANAGER) {
      const managers = await this.prisma.projectMember.count({ where: { projectId, role: MemberRole.MANAGER } });
      if (managers <= 1) {
        throw new BadRequestException(`${member.user.name} is the only project manager. Make someone else a manager first.`);
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.projectMember.delete({ where: { id: member.id } });
      await recordProjectActivity(tx, {
        projectId,
        organizationId,
        actorId,
        title: 'Member removed',
        description: `${member.user.name} was removed from the project team.`,
      });
    });
  }

  private async findProject(projectId: string, organizationId: string): Promise<{ id: string; name: string; status: ProjectStatus }> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId, deletedAt: null },
      select: { id: true, name: true, status: true },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  private async findEditableProject(projectId: string, organizationId: string): Promise<{ id: string; name: string }> {
    const project = await this.findProject(projectId, organizationId);
    if (project.status === ProjectStatus.ARCHIVED) {
      throw new BadRequestException('This project is archived. Restore it before changing the team.');
    }
    return project;
  }

  private async findMember(projectId: string, userId: string): Promise<{ id: string; role: MemberRole; user: { name: string } }> {
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { id: true, role: true, user: { select: { name: true } } },
    });
    if (!member) throw new NotFoundException('This person is not on the project team.');
    return member;
  }
}
