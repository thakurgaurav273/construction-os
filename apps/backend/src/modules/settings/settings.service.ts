import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from '../../common/mail/mail.service';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService, private readonly mail: MailService) {}

  // Get all members of an organization
  async getMembers(organizationId: string) {
    const members = await this.prisma.userOrganization.findMany({
      where: { organizationId },
      include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
      orderBy: { joinedAt: 'asc' },
    });

    return members.map((m) => ({
      id: m.userId,
      name: m.user.name,
      email: m.user.email,
      avatar: m.user.avatar,
      role: m.role,
      status: 'ACTIVE',
      joinedAt: m.joinedAt,
      lastActive: new Date(),
    }));
  }

  // Change member role
  async changeMemberRole(userId: string, organizationId: string, newRole: string, currentUserId: string) {
    const currentUser = await this.prisma.userOrganization.findFirst({
      where: { userId: currentUserId, organizationId },
    });

    if (!currentUser || (currentUser.role !== 'OWNER' && currentUser.role !== 'ADMIN')) {
      throw new ForbiddenException('Only Owner or Admin can change roles');
    }

    if (userId === currentUserId) {
      throw new BadRequestException('Cannot change your own role');
    }

    const target = await this.prisma.userOrganization.findFirst({ where: { userId, organizationId } });
    if (!target) throw new NotFoundException('Member not found');

    const validRoles = ['OWNER', 'ADMIN', 'PROJECT_MANAGER', 'SITE_ENGINEER', 'STORE_MANAGER', 'PROCUREMENT', 'FINANCE', 'VIEWER'];
    if (!validRoles.includes(newRole)) throw new BadRequestException('Invalid role');

    return this.prisma.userOrganization.update({
      where: { userId_organizationId: { userId, organizationId } },
      data: { role: newRole as any },
    });
  }

  // Remove member
  async removeMember(userId: string, organizationId: string, currentUserId: string) {
    if (userId === currentUserId) {
      throw new BadRequestException('Cannot remove yourself');
    }

    const currentUser = await this.prisma.userOrganization.findFirst({
      where: { userId: currentUserId, organizationId },
    });
    if (!currentUser || (currentUser.role !== 'OWNER' && currentUser.role !== 'ADMIN')) {
      throw new ForbiddenException('Only Owner or Admin can remove members');
    }

    const target = await this.prisma.userOrganization.findFirst({ where: { userId, organizationId } });
    if (!target) throw new NotFoundException('Member not found');

    if (target.role === 'OWNER') {
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
  async inviteMember(email: string, role: string, organizationId: string, userId: string) {
    const currentUser = await this.prisma.userOrganization.findFirst({
      where: { userId, organizationId },
    });
    if (!currentUser || (currentUser.role !== 'OWNER' && currentUser.role !== 'ADMIN')) {
      throw new ForbiddenException('Only Owner or Admin can invite members');
    }

    // Check if already member
    const existing = await this.prisma.user.findFirst({ where: { email } });
    if (existing) {
      const isMember = await this.prisma.userOrganization.findFirst({
        where: { userId: existing.id, organizationId },
      });
      if (isMember) throw new BadRequestException('User is already a member');
    }

    // Check if already invited and not expired
    const existingInv = await this.prisma.invitation.findFirst({
      where: { email, organizationId },
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
        role: role as any,
        organizationId,
        invitedById: userId,
        expiresAt,
      },
    });

    // Send email
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    const acceptUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/accept-invitation/${token}`;
    await this.mail.sendInvitationEmail(email, org?.name || 'Organization', role, acceptUrl);

    return invitation;
  }

  // Get pending invitations
  async getInvitations(organizationId: string) {
    const invitations = await this.prisma.invitation.findMany({
      where: { organizationId, acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    return invitations.map((inv) => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      status: 'PENDING',
      createdAt: inv.createdAt,
      expiresAt: inv.expiresAt,
    }));
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

    const acceptUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/accept-invitation/${newToken}`;
    await this.mail.sendInvitationEmail(inv.email, org?.name || 'Organization', inv.role, acceptUrl);

    return updated;
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

  // Accept invitation
  async acceptInvitation(token: string) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const inv = await this.prisma.invitation.findFirst({
      where: { token: hashedToken },
    });
    if (!inv) throw new NotFoundException('Invalid or expired invitation');
    if (inv.expiresAt < new Date()) throw new BadRequestException('Invitation has expired');
    if (inv.acceptedAt) throw new BadRequestException('Invitation already accepted');

    // Find user by email
    let user = await this.prisma.user.findUnique({ where: { email: inv.email } });
    if (!user) {
      // Create user if doesn't exist
      user = await this.prisma.user.create({
        data: { email: inv.email, name: inv.email.split('@')[0], password: '' },
      });
    }

    // Create organization membership
    await this.prisma.userOrganization.upsert({
      where: { userId_organizationId: { userId: user.id, organizationId: inv.organizationId } },
      update: {},
      create: { userId: user.id, organizationId: inv.organizationId, role: inv.role },
    });

    // Mark invitation accepted
    return this.prisma.invitation.update({
      where: { id: inv.id },
      data: { acceptedAt: new Date() },
    });
  }
}