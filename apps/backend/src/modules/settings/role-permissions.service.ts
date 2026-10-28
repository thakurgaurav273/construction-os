import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrgRole } from '@prisma/client';
import type { Permission } from '@sitepilot/types';
import { PrismaService } from '../../database/prisma.service';
import {
  ALL_PERMISSIONS, AccessService, NO_ADJUSTMENTS, PERMISSION_CATALOGUE, PermissionInfo, diffPermissions, isPermission, memberPermissions,
  permissionsForRole, rolePermissions,
} from '../../common/permissions';

/** What each role can do in this organization, and how it differs from the product defaults. */
export interface RoleCatalogue {
  permissions: (PermissionInfo & { key: Permission })[];
  roles: { role: OrgRole; permissions: Permission[]; defaults: Permission[]; customized: boolean }[];
}

export interface MemberPermissionsView {
  userId: string;
  role: OrgRole;
  /** What their role gives them in this organization. */
  rolePermissions: Permission[];
  /** What they can actually do: their role, plus `granted`, minus `revoked`. */
  permissions: Permission[];
  granted: Permission[];
  revoked: Permission[];
}

interface Actor {
  id: string;
  organizationId: string;
  role: OrgRole;
  permissions: Permission[];
}

/**
 * Changes what roles and individual members can do (ADR-050). Guardrails: the owner role always keeps
 * everything, only the owner changes the admin role or an admin's access, nobody changes their own
 * access, and nobody hands out a permission they don't hold themselves.
 */
@Injectable()
export class RolePermissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  async catalogue(organizationId: string): Promise<RoleCatalogue> {
    const effective = await this.access.rolePermissionsIn(organizationId);
    return {
      permissions: ALL_PERMISSIONS.map((key) => ({ key, ...PERMISSION_CATALOGUE[key] })),
      roles: Object.values(OrgRole).map((role) => {
        const defaults = rolePermissions(role);
        const permissions = effective.get(role) ?? defaults;
        return { role, permissions, defaults, customized: !sameSet(defaults, permissions) };
      }),
    };
  }

  async updateRole(actor: Actor, role: OrgRole, requested: Permission[]): Promise<RoleCatalogue> {
    this.assertCanEditRole(actor, role);
    const current = (await this.access.rolePermissionsIn(actor.organizationId)).get(role) ?? [];
    this.assertNoEscalation(actor, current, requested);

    const { granted, revoked } = diffPermissions(permissionsForRole(role), requested);
    const where = { organizationId_role: { organizationId: actor.organizationId, role } };
    if (granted.length === 0 && revoked.length === 0) {
      await this.prisma.orgRolePermission.deleteMany({ where: { organizationId: actor.organizationId, role } });
    } else {
      await this.prisma.orgRolePermission.upsert({
        where,
        create: { organizationId: actor.organizationId, role, granted, revoked, updatedById: actor.id },
        update: { granted, revoked, updatedById: actor.id },
      });
    }
    return this.catalogue(actor.organizationId);
  }

  async memberPermissions(organizationId: string, userId: string): Promise<MemberPermissionsView> {
    const member = await this.findMember(organizationId, userId);
    const roleAdjustments = (await this.access.roleAdjustments(organizationId)).get(member.role) ?? NO_ADJUSTMENTS;
    const granted = member.grantedPermissions.filter(isPermission);
    const revoked = member.revokedPermissions.filter(isPermission);
    return {
      userId,
      role: member.role,
      rolePermissions: rolePermissions(member.role, roleAdjustments),
      permissions: memberPermissions(member.role, roleAdjustments, { granted, revoked }),
      granted,
      revoked,
    };
  }

  /** Stores the member's chosen permissions as changes to their role, so later role changes still reach them. */
  async updateMember(actor: Actor, userId: string, requested: Permission[]): Promise<MemberPermissionsView> {
    if (userId === actor.id) throw new BadRequestException('You can’t change your own access. Ask another admin or the owner.');
    const current = await this.memberPermissions(actor.organizationId, userId);
    if (current.role === OrgRole.OWNER) throw new BadRequestException('The owner always has full access.');
    if (current.role === OrgRole.ADMIN && actor.role !== OrgRole.OWNER) {
      throw new ForbiddenException('Only the owner can change an admin’s access.');
    }
    this.assertNoEscalation(actor, current.permissions, requested);

    const { granted, revoked } = diffPermissions(current.rolePermissions, requested);
    await this.prisma.userOrganization.update({
      where: { userId_organizationId: { userId, organizationId: actor.organizationId } },
      data: { grantedPermissions: granted, revokedPermissions: revoked },
    });
    return this.memberPermissions(actor.organizationId, userId);
  }

  private assertCanEditRole(actor: Actor, role: OrgRole): void {
    if (role === OrgRole.OWNER) throw new BadRequestException('The owner role always has full access.');
    if (role === OrgRole.ADMIN && actor.role !== OrgRole.OWNER) throw new ForbiddenException('Only the owner can change what admins can do.');
    if (role === actor.role) throw new BadRequestException('You can’t change your own role’s access. Ask the owner.');
  }

  /** Taking access away is always allowed; adding it is limited to what the actor holds. */
  private assertNoEscalation(actor: Actor, current: Permission[], requested: Permission[]): void {
    const held = new Set(actor.permissions);
    const currentSet = new Set(current);
    const beyondActor = requested.filter((permission) => !currentSet.has(permission) && !held.has(permission));
    if (beyondActor.length > 0) {
      throw new ForbiddenException(`You can only give access you have yourself: ${beyondActor.map((permission) => PERMISSION_CATALOGUE[permission].label.toLowerCase()).join(', ')}.`);
    }
  }

  private async findMember(organizationId: string, userId: string) {
    const member = await this.prisma.userOrganization.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
      select: { role: true, grantedPermissions: true, revokedPermissions: true },
    });
    if (!member) throw new NotFoundException('Member not found');
    return member;
  }
}

function sameSet(a: readonly Permission[], b: readonly Permission[]): boolean {
  return a.length === b.length && a.every((permission) => b.includes(permission));
}
