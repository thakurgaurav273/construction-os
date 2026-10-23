import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Permission } from '@sitepilot/types';
import { PERMISSION_CATALOGUE } from './permission-catalogue';
import { PERMISSIONS_KEY } from './require-permission.decorator';

interface RequestWithAccess {
  user?: { permissions?: Permission[] };
}

/** Runs after JwtAuthGuard, which loads the member's current role and permissions onto the request. */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndMerge<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const granted = new Set(context.switchToHttp().getRequest<RequestWithAccess>().user?.permissions ?? []);
    const missing = required.filter((permission) => !granted.has(permission));
    if (missing.length === 0) return true;

    throw new ForbiddenException(
      `Your role doesn't allow this: ${missing.map((permission) => PERMISSION_CATALOGUE[permission].label.toLowerCase()).join(', ')}. Ask an admin for access.`,
    );
  }
}
