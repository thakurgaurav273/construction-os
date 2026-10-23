import {
  BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException,
} from '@nestjs/common';
import { Invitation, OrgRole, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { AuthService, PASSWORD_HASH_ROUNDS, StartedSession, toPublicUser } from './auth.service';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { TokenService, hashToken } from './token.service';

export interface InvitationPreview {
  email: string;
  role: OrgRole;
  organizationName: string;
  invitedByName: string;
  expiresAt: Date;
  /** True when the email already has an account, so the person signs in instead of choosing a password. */
  hasAccount: boolean;
}

type InvitedAccount =
  | { kind: 'existing'; user: User }
  | { kind: 'new'; data: { name: string; email: string; password: string } };

const INVALID_INVITATION = 'This invitation link is invalid or has expired. Ask your administrator to send a new one.';

/** The public side of invitations: previewing a link and accepting it, which also signs the person in. */
@Injectable()
export class InvitationAcceptanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly tokens: TokenService,
  ) {}

  async preview(token: string): Promise<InvitationPreview> {
    const invitation = await this.findOpenInvitation(token);
    const [organization, invitedBy, account] = await Promise.all([
      this.prisma.organization.findUniqueOrThrow({ where: { id: invitation.organizationId }, select: { name: true } }),
      this.prisma.user.findUniqueOrThrow({ where: { id: invitation.invitedById }, select: { name: true } }),
      this.auth.findUserByEmail(invitation.email),
    ]);
    return {
      email: invitation.email,
      role: invitation.role,
      organizationName: organization.name,
      invitedByName: invitedBy.name,
      expiresAt: invitation.expiresAt,
      hasAccount: account !== null,
    };
  }

  async accept(token: string, dto: AcceptInvitationDto): Promise<StartedSession> {
    const invitation = await this.findOpenInvitation(token);
    const account = await this.resolveAccount(invitation, dto);

    const user = await this.prisma.$transaction(async (tx) => {
      // Claim the invitation first so the link can't be used twice, even by two tabs at once.
      const { count } = await tx.invitation.updateMany({
        where: { id: invitation.id, acceptedAt: null, expiresAt: { gt: new Date() } },
        data: { acceptedAt: new Date() },
      });
      if (count === 0) throw new BadRequestException(INVALID_INVITATION);

      const member = account.kind === 'existing'
        ? account.user
        : await tx.user.create({ data: { ...account.data, status: 'ACTIVE' } });
      const alreadyMember = await tx.userOrganization.findUnique({
        where: { userId_organizationId: { userId: member.id, organizationId: invitation.organizationId } },
      });
      if (alreadyMember) throw new ConflictException('You are already a member of this organization. Sign in instead.');
      await tx.userOrganization.create({
        data: { userId: member.id, organizationId: invitation.organizationId, role: invitation.role },
      });
      return member;
    });

    const organization = await this.prisma.organization.findUniqueOrThrow({ where: { id: invitation.organizationId } });
    return {
      session: { user: toPublicUser(user), organization },
      tokens: await this.tokens.issue(user.id, invitation.organizationId),
    };
  }

  private async resolveAccount(invitation: Invitation, dto: AcceptInvitationDto): Promise<InvitedAccount> {
    const existing = await this.auth.findUserByEmail(invitation.email);
    if (existing) {
      if (existing.status !== 'ACTIVE') throw new UnauthorizedException('This account is inactive. Ask your administrator to reactivate it.');
      if (!(await bcrypt.compare(dto.password, existing.password))) {
        throw new UnauthorizedException('Incorrect password for this account. Use the password you already sign in with.');
      }
      return { kind: 'existing', user: existing };
    }

    const name = dto.name?.trim();
    if (!name) throw new BadRequestException('Enter your name');
    return {
      kind: 'new',
      data: { name, email: invitation.email.toLowerCase(), password: await bcrypt.hash(dto.password, PASSWORD_HASH_ROUNDS) },
    };
  }

  private async findOpenInvitation(token: string): Promise<Invitation> {
    const invitation = await this.prisma.invitation.findUnique({ where: { token: hashToken(token) } });
    if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) {
      throw new NotFoundException(INVALID_INVITATION);
    }
    return invitation;
  }
}
