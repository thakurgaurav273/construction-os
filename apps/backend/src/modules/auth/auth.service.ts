import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Organization, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import { TokenPair, TokenService } from './token.service';

export const PASSWORD_HASH_ROUNDS = 12;

export type PublicUser = Omit<User, 'password'>;

export interface SessionView {
  user: PublicUser;
  organization: Organization | null;
}

/** A started session: what the client may see, and the tokens the controller puts in HttpOnly cookies. */
export interface StartedSession {
  session: SessionView;
  tokens: TokenPair;
}

const INVALID_CREDENTIALS = 'Incorrect email or password.';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
  ) {}

  async register(dto: RegisterDto): Promise<StartedSession> {
    const existing = await this.findUserByEmail(dto.email);
    if (existing) throw new ConflictException('An account with this email already exists');

    const hashedPassword = await bcrypt.hash(dto.password, PASSWORD_HASH_ROUNDS);
    const slug = this.generateSlug(dto.organizationName);
    const slugExists = await this.prisma.organization.findUnique({ where: { slug } });
    const finalSlug = slugExists ? `${slug}-${Date.now()}` : slug;

    const { user, organization } = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: { name: dto.name.trim(), email: dto.email, password: hashedPassword, status: 'ACTIVE' },
      });
      const newOrg = await tx.organization.create({
        data: { name: dto.organizationName.trim(), slug: finalSlug, currency: 'INR', timezone: 'Asia/Kolkata' },
      });
      await tx.userOrganization.create({ data: { userId: newUser.id, organizationId: newOrg.id, role: 'OWNER' } });
      return { user: newUser, organization: newOrg };
    });

    return {
      session: { user: toPublicUser(user), organization },
      tokens: await this.tokens.issue(user.id, organization.id),
    };
  }

  async login(dto: LoginDto): Promise<StartedSession> {
    const user = await this.findUserByEmail(dto.email);
    // Compare against a dummy hash when the email is unknown so response time doesn't reveal which emails exist.
    const passwordMatches = await bcrypt.compare(dto.password, user?.password ?? DUMMY_HASH);
    if (!user || !passwordMatches) throw new UnauthorizedException(INVALID_CREDENTIALS);
    if (user.status !== 'ACTIVE') throw new UnauthorizedException('This account is inactive. Ask your administrator to reactivate it.');

    const membership = await this.prisma.userOrganization.findFirst({
      where: { userId: user.id },
      orderBy: { joinedAt: 'asc' },
      include: { organization: true },
    });
    if (!membership) throw new UnauthorizedException('This account is not a member of any organization.');

    return {
      session: { user: toPublicUser(user), organization: membership.organization },
      tokens: await this.tokens.issue(user.id, membership.organizationId),
    };
  }

  /**
   * Rotates the session. Membership and account status are checked again, so someone removed from the
   * organization or deactivated can't keep a session alive by refreshing.
   */
  async refresh(refreshToken: string | undefined): Promise<TokenPair> {
    if (!refreshToken) throw new UnauthorizedException('Your session has expired. Sign in again.');
    const { payload, tokens } = await this.tokens.rotate(refreshToken);
    const membership = await this.prisma.userOrganization.findUnique({
      where: { userId_organizationId: { userId: payload.sub, organizationId: payload.organizationId } },
      select: { user: { select: { status: true } } },
    });
    if (!membership || membership.user.status !== 'ACTIVE') {
      await this.tokens.revokeAll(payload.sub);
      throw new UnauthorizedException('Your access to this organization has ended.');
    }
    return tokens;
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (refreshToken) await this.tokens.revoke(refreshToken);
  }

  /** Emails are stored as typed by older sign-ups, so match without case. */
  findUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findFirst({ where: { email: { equals: email.trim(), mode: 'insensitive' } } });
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 50);
  }
}

/** Hash of a random value; only used so failed logins for unknown emails take as long as real ones. */
const DUMMY_HASH = bcrypt.hashSync(randomUUID(), PASSWORD_HASH_ROUNDS);

export function toPublicUser({ id, email, name, avatar, emailVerified, status, createdAt, updatedAt }: User): PublicUser {
  return { id, email, name, avatar, emailVerified, status, createdAt, updatedAt };
}
