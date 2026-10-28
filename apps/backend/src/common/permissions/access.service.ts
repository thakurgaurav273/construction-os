import { Injectable } from '@nestjs/common';
import { OrgRole } from '@prisma/client';
import type { Permission } from '@sitepilot/types';
import { PrismaService } from '../../database/prisma.service';
import { memberPermissions, NO_ADJUSTMENTS, PermissionAdjustments, rolePermissions } from './effective-permissions';

export interface MemberAccess {
  role: OrgRole;
  grantedPermissions: readonly string[];
  revokedPermissions: readonly string[];
}

/**
 * Works out what members can do in an organization from their role, the organization's changes to that
 * role and their own changes (ADR-050). Read on every request, so a change applies at once.
 */
@Injectable()
export class AccessService {
  constructor(private readonly prisma: PrismaService) {}

  async roleAdjustments(organizationId: string): Promise<Map<OrgRole, PermissionAdjustments>> {
    const rows = await this.prisma.orgRolePermission.findMany({ where: { organizationId } });
    return new Map(rows.map((row) => [row.role, { granted: row.granted, revoked: row.revoked }]));
  }

  async permissionsFor(organizationId: string, member: MemberAccess): Promise<Permission[]> {
    if (member.role === OrgRole.OWNER) return rolePermissions(OrgRole.OWNER);
    const row = await this.prisma.orgRolePermission.findUnique({ where: { organizationId_role: { organizationId, role: member.role } } });
    return memberPermissions(member.role, row ?? NO_ADJUSTMENTS, { granted: member.grantedPermissions, revoked: member.revokedPermissions });
  }

  /** Each role's permissions in this organization, with its changes applied. */
  async rolePermissionsIn(organizationId: string): Promise<Map<OrgRole, Permission[]>> {
    const adjustments = await this.roleAdjustments(organizationId);
    return new Map(Object.values(OrgRole).map((role) => [role, rolePermissions(role, adjustments.get(role))]));
  }

  /** Active members who can currently do something, e.g. to notify the people who can approve it. */
  async userIdsWithPermission(organizationId: string, permission: Permission): Promise<string[]> {
    const [members, adjustments] = await Promise.all([
      this.prisma.userOrganization.findMany({
        where: { organizationId, user: { status: 'ACTIVE' } },
        select: { userId: true, role: true, grantedPermissions: true, revokedPermissions: true },
      }),
      this.roleAdjustments(organizationId),
    ]);
    return members
      .filter((member) => memberPermissions(
        member.role,
        adjustments.get(member.role) ?? NO_ADJUSTMENTS,
        { granted: member.grantedPermissions, revoked: member.revokedPermissions },
      ).includes(permission))
      .map((member) => member.userId);
  }
}
