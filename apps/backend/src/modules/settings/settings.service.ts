import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Invitation, OrgRole, UserStatus } from '@prisma/client';
import type { Permission } from '@sitepilot/types';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from '../../common/mail/mail.service';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { ALL_PERMISSIONS, PERMISSION_CATALOGUE, PermissionInfo, permissionsForRole } from '../../common/permissions';

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  private buildInvitationUrl(token: string): string {
    const frontendUrl = this.config
      .get<string>('FRONTEND_URL', 'http://localhost:5173')
      .replace(/\/+$/, '');

    return `${frontendUrl}/accept-invitation/${token}`;
  }

  async getMembers(organizationId: string): Promise<MemberView[]> {
    const members = await this.prisma.userOrganization.findMany({
      where: { organizationId },
      include: { user: { select: { id: true, name: true, email: true, avatar: true, status: true } } },
      orderBy: { joinedAt: 'asc' },
    });
    // Each session refresh issues a token, so the newest one is when the member was last active.
    const lastRefreshes = await this.prisma.refreshToken.groupBy({
      by: ['userId'],
      where: { userId: { in: members.map((member) => member.userId) } },
      _max: { createdAt: true },
    });
    const lastActiveByUser = new Map(lastRefreshes.map((entry) => [entry.userId, entry._max.createdAt]));

    return members.map((m) => ({
      id: m.userId,
      name: m.user.name,
      email: m.user.email,
      avatar: m.user.avatar,
      role: m.role,
      status: m.user.status,
      joinedAt: m.joinedAt,
      lastActive: lastActiveByUser.get(m.userId) ?? null,
    }));
  }

  getRoleCatalogue(): RoleCatalogue {
    return {
      permissions: ALL_PERMISSIONS.map((key) => ({ key, ...PERMISSION_CATALOGUE[key] })),
      roles: Object.values(OrgRole).map((role) => ({ role, permissions: permissionsForRole(role) })),
    };
  }

  // Change member role
  async changeMemberRole(userId: string, organizationId: string, newRole: OrgRole, currentUserId: string) {
    // Route access (members.manage) is checked by the guard; ownership rules are checked here.
    if (userId === currentUserId) {
      throw new BadRequestException('Cannot change your own role');
    }

    const [actorRole, target] = await Promise.all([
      this.roleOf(currentUserId, organizationId),
      this.prisma.userOrganization.findFirst({ where: { userId, organizationId } }),
    ]);
    if (!target) throw new NotFoundException('Member not found');
    if ((newRole === 'OWNER' || target.role === 'OWNER') && actorRole !== 'OWNER') {
      throw new ForbiddenException('Only an owner can grant or change the Owner role');
    }

    return this.prisma.userOrganization.update({
      where: { userId_organizationId: { userId, organizationId } },
      data: { role: newRole },
    });
  }

  // Remove member
  async removeMember(userId: string, organizationId: string, currentUserId: string) {
    if (userId === currentUserId) {
      throw new BadRequestException('Cannot remove yourself');
    }

    const [actorRole, target] = await Promise.all([
      this.roleOf(currentUserId, organizationId),
      this.prisma.userOrganization.findFirst({ where: { userId, organizationId } }),
    ]);
    if (!target) throw new NotFoundException('Member not found');

    if (target.role === 'OWNER') {
      if (actorRole !== 'OWNER') throw new ForbiddenException('Only an owner can remove another owner');
      const ownerCount = await this.prisma.userOrganization.count({
        where: { organizationId, role: 'OWNER' },
      });
      if (ownerCount <= 1) throw new BadRequestException('Cannot remove last Owner');
    }

    return this.prisma.userOrganization.delete({
      where: { userId_organizationId: { userId, organizationId } },
    });
  }

  // Invite member
  async inviteMember(email: string, role: OrgRole, organizationId: string, userId: string) {
    if (role === 'OWNER' && (await this.roleOf(userId, organizationId)) !== 'OWNER') {
      throw new ForbiddenException('Only an owner can invite another owner');
    }

    // Check if already member
    const existing = await this.prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
    if (existing) {
      const isMember = await this.prisma.userOrganization.findFirst({
        where: { userId: existing.id, organizationId },
      });
      if (isMember) throw new BadRequestException('User is already a member');
    }

    // Check if already invited and not expired
    const existingInv = await this.prisma.invitation.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, organizationId, acceptedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (existingInv && existingInv.expiresAt > new Date() && !existingInv.acceptedAt) {
      throw new BadRequestException('Invitation already pending');
    }

    // Create invitation
    const token = uuidv4();
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await this.prisma.invitation.create({
      data: {
        email,
        token: hashedToken,
        role,
        organizationId,
        invitedById: userId,
        expiresAt,
      },
    });

    // Send email
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    const acceptUrl = this.buildInvitationUrl(token);
    await this.mail.sendInvitationEmail(email, org?.name || 'Organization', role, acceptUrl);

    return toInvitationView(invitation);
  }

  // Get pending invitations
  async getInvitations(organizationId: string) {
    const invitations = await this.prisma.invitation.findMany({
      where: { organizationId, acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    return invitations.map(toInvitationView);
  }

  // Resend invitation
  async resendInvitation(invitationId: string, organizationId: string) {
    const inv = await this.prisma.invitation.findFirst({
      where: { id: invitationId, organizationId },
    });
    if (!inv) throw new NotFoundException('Invitation not found');
    if (inv.acceptedAt) throw new BadRequestException('Invitation already accepted');

    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    // Reconstruct original token by searching - we'll need to ask for token in request or resend with new one
    const newToken = uuidv4();
    const hashedToken = crypto.createHash('sha256').update(newToken).digest('hex');
    
    // Update with new token
    const updated = await this.prisma.invitation.update({
      where: { id: invitationId },
      data: { token: hashedToken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });

    const acceptUrl = this.buildInvitationUrl(newToken);
    await this.mail.sendInvitationEmail(inv.email, org?.name || 'Organization', inv.role, acceptUrl);

    return toInvitationView(updated);
  }

  // Cancel invitation
  async cancelInvitation(invitationId: string, organizationId: string) {
    const inv = await this.prisma.invitation.findFirst({
      where: { id: invitationId, organizationId },
    });
    if (!inv) throw new NotFoundException('Invitation not found');

    // Delete the invitation
    await this.prisma.invitation.delete({ where: { id: invitationId } });
    return { success: true };
  }

  private async roleOf(userId: string, organizationId: string): Promise<OrgRole | null> {
    const membership = await this.prisma.userOrganization.findFirst({ where: { userId, organizationId }, select: { role: true } });
    return membership?.role ?? null;
  }
}

export interface MemberView {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  role: OrgRole;
  status: UserStatus;
  joinedAt: Date;
  /** Last sign-in or session refresh; null if they haven't signed in since sessions were recorded. */
  lastActive: Date | null;
}

/** What each role can do, for the read-only Roles & Permissions view. */
export interface RoleCatalogue {
  permissions: (PermissionInfo & { key: Permission })[];
  roles: { role: OrgRole; permissions: Permission[] }[];
}

export interface InvitationView {
  id: string;
  email: string;
  role: OrgRole;
  status: 'PENDING';
  createdAt: Date;
  expiresAt: Date;
}

/** Never includes the token (or its hash): the link only ever travels by email. */
function toInvitationView(invitation: Invitation): InvitationView {
  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    status: 'PENDING',
    createdAt: invitation.createdAt,
    expiresAt: invitation.expiresAt,
  };
}
