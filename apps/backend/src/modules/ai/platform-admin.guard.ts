import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isPlatformAdmin } from '../../common/platform/platform-admins';

/** Runs after JwtAuthGuard. Platform routes span every tenant, so organization roles don't apply here. */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const email = context.switchToHttp().getRequest<{ user?: { email?: string } }>().user?.email;
    if (!isPlatformAdmin(this.config, email)) throw new ForbiddenException('This area is for SitePilot platform administrators.');
    return true;
  }
}
