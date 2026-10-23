import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { OrgRole, UserStatus } from '@prisma/client';
import type { Permission } from '@sitepilot/types';
import { PrismaService } from '../../../database/prisma.service';
import { permissionsForRole } from '../../../common/permissions';
import { AUTH_COOKIES } from '../auth.constants';
import { readCookie } from '../auth-cookies';
import { TokenPayload, TokenService } from '../token.service';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  status: UserStatus;
  avatar: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  organizationId: string;
  role: OrgRole;
  permissions: Permission[];
}

/** Browsers send the HttpOnly cookie; API clients and Swagger can still use a Bearer header. */
function extractAccessToken(req: Request): string | null {
  return readCookie(req, AUTH_COOKIES.access) ?? ExtractJwt.fromAuthHeaderAsBearerToken()(req);
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    tokens: TokenService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: extractAccessToken,
      ignoreExpiration: false,
      secretOrKey: tokens.accessTokenSecret,
    });
  }

  /**
   * The role is read from the membership on every request rather than trusted from the token, so a role
   * change or removal from the organization takes effect immediately instead of when the token expires.
   */
  async validate(payload: TokenPayload): Promise<AuthenticatedUser> {
    // A refresh token is signed with a different secret, but check the claim too so the two can never be swapped.
    if (payload.type !== 'access') throw new UnauthorizedException('Your session has expired. Sign in again.');
    const membership = await this.prisma.userOrganization.findUnique({
      where: { userId_organizationId: { userId: payload.sub, organizationId: payload.organizationId } },
      select: {
        role: true,
        user: {
          select: {
            id: true, email: true, name: true, status: true, avatar: true, emailVerified: true, createdAt: true, updatedAt: true,
          },
        },
      },
    });

    if (!membership) throw new UnauthorizedException('You are no longer a member of this organization.');
    if (membership.user.status !== 'ACTIVE') throw new UnauthorizedException('User is inactive');

    return {
      ...membership.user,
      organizationId: payload.organizationId,
      role: membership.role,
      permissions: permissionsForRole(membership.role),
    };
  }
}
