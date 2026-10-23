import { Injectable } from '@nestjs/common';
import type { Permission } from '@sitepilot/types';
import { PrismaService } from '../../database/prisma.service';
import { rolesWithPermission } from '../../common/permissions';

/** Works out who should hear about something. */
@Injectable()
export class NotificationRecipientsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Active members whose role grants the permission, never the person who acted. For project work, prefer
   * those on the project team; if none of them is, everyone with the permission hears about it.
   */
  async withPermission(
    permission: Permission,
    organizationId: string,
    excludeUserId: string | null,
    projectId?: string | null,
  ): Promise<string[]> {
    const members = await this.prisma.userOrganization.findMany({
      where: {
        organizationId,
        role: { in: rolesWithPermission(permission) },
        user: { status: 'ACTIVE' },
        ...(excludeUserId && { userId: { not: excludeUserId } }),
      },
      select: { userId: true },
    });
    const userIds = members.map((member) => member.userId);
    if (!projectId || userIds.length === 0) return userIds;

    const onProject = await this.prisma.projectMember.findMany({
      where: { projectId, userId: { in: userIds } },
      select: { userId: true },
    });
    return onProject.length > 0 ? onProject.map((member) => member.userId) : userIds;
  }

  /** A single person, unless they are the one who acted (nobody needs to be told about their own action). */
  only(userId: string | null | undefined, actorId: string | null): string[] {
    return userId && userId !== actorId ? [userId] : [];
  }
}
