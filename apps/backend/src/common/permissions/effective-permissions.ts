import { OrgRole } from '@prisma/client';
import type { Permission } from '@sitepilot/types';
import { ALL_PERMISSIONS, PERMISSION_CATALOGUE, permissionsForRole } from './permission-catalogue';

/** Permissions added to and taken away from a set; unknown keys (since removed from the product) are ignored. */
export interface PermissionAdjustments {
  granted: readonly string[];
  revoked: readonly string[];
}

export const NO_ADJUSTMENTS: PermissionAdjustments = { granted: [], revoked: [] };

export function isPermission(value: string): value is Permission {
  return Object.prototype.hasOwnProperty.call(PERMISSION_CATALOGUE, value);
}

export function applyAdjustments(base: readonly Permission[], adjustments: PermissionAdjustments): Permission[] {
  const result = new Set(base);
  adjustments.granted.filter(isPermission).forEach((permission) => result.add(permission));
  adjustments.revoked.filter(isPermission).forEach((permission) => result.delete(permission));
  return ALL_PERMISSIONS.filter((permission) => result.has(permission));
}

/** A role's permissions in one organization: the product defaults with that organization's changes. */
export function rolePermissions(role: OrgRole, roleAdjustments: PermissionAdjustments = NO_ADJUSTMENTS): Permission[] {
  // The owner can always do everything, so an organization can never lock itself out.
  if (role === OrgRole.OWNER) return [...ALL_PERMISSIONS];
  return applyAdjustments(permissionsForRole(role), roleAdjustments);
}

/** What one member can do: their role in this organization, plus their own grants, minus their own removals. */
export function memberPermissions(
  role: OrgRole,
  roleAdjustments: PermissionAdjustments,
  memberAdjustments: PermissionAdjustments,
): Permission[] {
  if (role === OrgRole.OWNER) return [...ALL_PERMISSIONS];
  return applyAdjustments(rolePermissions(role, roleAdjustments), memberAdjustments);
}

/** The smallest change from `base` that produces `target`, for storing a chosen set as differences. */
export function diffPermissions(base: readonly Permission[], target: readonly Permission[]): { granted: Permission[]; revoked: Permission[] } {
  const baseSet = new Set(base);
  const targetSet = new Set(target);
  return {
    granted: ALL_PERMISSIONS.filter((permission) => targetSet.has(permission) && !baseSet.has(permission)),
    revoked: ALL_PERMISSIONS.filter((permission) => baseSet.has(permission) && !targetSet.has(permission)),
  };
}
