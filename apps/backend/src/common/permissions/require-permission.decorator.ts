import { SetMetadata } from '@nestjs/common';
import type { Permission } from '@sitepilot/types';

export const PERMISSIONS_KEY = 'requiredPermissions';

/**
 * The caller needs every listed permission. Class- and route-level lists are combined, so a controller can set a
 * baseline (e.g. finance.view) and each write adds its own. Routes without it are open to any member.
 */
export const RequirePermission = (...permissions: Permission[]): MethodDecorator & ClassDecorator =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export const ANY_PERMISSIONS_KEY = 'anyOfPermissions';

/**
 * The caller needs at least one of the listed permissions. For lookups several areas rely on, e.g. the vendor
 * list that procurement, finance and billing forms all pick from.
 */
export const RequireAnyPermission = (...permissions: Permission[]): MethodDecorator =>
  SetMetadata(ANY_PERMISSIONS_KEY, permissions);
