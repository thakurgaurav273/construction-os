import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProcurementAnalytics, ProcurementAnalyticsService } from './procurement-analytics.service';
import { ProcurementSummary, ProcurementSummaryService } from './procurement-summary.service';
import { PermissionsGuard } from '../../common/permissions';

interface AuthUser { id: string; organizationId: string; role: string }

@Controller('procurement')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProcurementInsightsController {
  constructor(
    private readonly summary: ProcurementSummaryService,
    private readonly analytics: ProcurementAnalyticsService,
  ) {}

  @Get('summary')
  getSummary(@CurrentUser() user: AuthUser): Promise<ProcurementSummary> {
    return this.summary.getSummary(user.organizationId);
  }

  @Get('analytics')
  getAnalytics(@CurrentUser() user: AuthUser): Promise<ProcurementAnalytics> {
    return this.analytics.getAnalytics(user.organizationId);
  }
}
