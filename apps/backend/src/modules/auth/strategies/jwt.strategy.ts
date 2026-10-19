import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { OrgRole, UserStatus } from '@prisma/client';
import type { Permission } from '@sitepilot/types';
import { PrismaService } from '../../../database/prisma.service';
import { permissionsForRole } from '../../../common/permissions';

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

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'super-secret-default-key-please-change-in-prod'),
    });
  }

  /**
   * The role is read from the membership on every request rather than trusted from the token, so a role
   * change or removal from the organization takes effect immediately instead of when the token expires.
   */
  async validate(payload: { sub: string; email: string; organizationId: string }): Promise<AuthenticatedUser> {
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
