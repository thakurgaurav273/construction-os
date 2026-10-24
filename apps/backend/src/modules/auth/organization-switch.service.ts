import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { OrgRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { StartedSession, toPublicUser } from './auth.service';
import { SessionClient, TokenService } from './token.service';

export interface MembershipView {
  organizationId: string;
  name: string;
  brandColor: string | null;
  role: OrgRole;
  isCurrent: boolean;
}

/** People can belong to several organizations; a session works in one at a time and can move between them. */
@Injectable()
export class OrganizationSwitchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly audit: AuditService,
  ) {}

  async listMemberships(userId: string, currentOrganizationId: string): Promise<MembershipView[]> {
    const memberships = await this.prisma.userOrganization.findMany({
      where: { userId },
      select: { role: true, organization: { select: { id: true, name: true, brandColor: true } } },
      orderBy: { organization: { name: 'asc' } },
    });
    return memberships.map(({ role, organization }) => ({
      organizationId: organization.id,
      name: organization.name,
      brandColor: organization.brandColor,
      role,
      isCurrent: organization.id === currentOrganizationId,
    }));
  }

  /**
   * Moves this session to another organization the person belongs to. The refresh token is rotated (so the
   * old organization's token can't be replayed) and the session keeps its identity in Settings → Security.
   */
  async switchTo(
    userId: string,
    refreshToken: string | undefined,
    organizationId: string,
    client: SessionClient,
  ): Promise<StartedSession> {
    if (!refreshToken) throw new UnauthorizedException('Your session has expired. Sign in again.');
    const membership = await this.prisma.userOrganization.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
      include: { organization: true, user: true },
    });
    // Same answer whether the organization doesn't exist or they aren't in it, so ids can't be probed.
    if (!membership) throw new ForbiddenException("You aren't a member of that organization.");
    if (membership.user.status !== 'ACTIVE') throw new UnauthorizedException('This account is inactive. Ask your administrator to reactivate it.');

    // The refresh cookie must belong to the same person as the access token; otherwise touch nothing.
    if (this.tokens.verify(refreshToken, 'refresh').sub !== userId) {
      throw new UnauthorizedException('Your session has expired. Sign in again.');
    }
    const { tokens } = await this.tokens.rotate(refreshToken, client, organizationId);
    await this.prisma.user.update({ where: { id: userId }, data: { lastOrganizationId: organizationId } });
    // Recorded in the organization they arrived in, like a sign-in; the one they left only sees their activity end.
    await this.audit.record({
      action: 'auth.switched_organization',
      organizationId,
      actorId: userId,
      actorName: membership.user.name,
      entityId: userId,
      ipAddress: client.ipAddress,
      userAgent: client.userAgent,
    });
    return { session: { user: toPublicUser(membership.user), organization: membership.organization }, tokens };
  }
}
