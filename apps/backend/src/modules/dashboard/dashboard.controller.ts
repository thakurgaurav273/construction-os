import { Controller, Get, UseGuards } from '@nestjs/common';
import type { Permission } from '@sitepilot/types';
import { DashboardService, DashboardStats } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PermissionsGuard } from '../../common/permissions';

interface AuthUser {
  id: string;
  organizationId: string;
  role: string;
  permissions: Permission[];
}

@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  getStats(@CurrentUser() user: AuthUser): Promise<DashboardStats> {
    return this.dashboardService.getStats(user);
  }
}
