import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Permission } from '@sitepilot/types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReportsService } from './reports.service';
import { PermissionsGuard, RequirePermission } from '../../common/permissions';

interface AuthUser { id: string; organizationId: string; role: string; permissions: Permission[] }

/** Financial reports carry invoice, payment and budget data, so they follow finance.view like the finance pages. */
const canSeeFinance = (user: AuthUser): boolean => user.permissions.includes('finance.view');

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('templates')
  getTemplates() {
    return this.reports.getTemplates();
  }

  @RequirePermission('report.manage')
  @Post('generate')
  async generate(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    if (body.type === 'FINANCIAL' && !canSeeFinance(user)) {
      throw new ForbiddenException("Your role doesn't include financial data, so it can't generate financial reports.");
    }
    return this.reports.generate({ ...(body as { type: string; name: string; format: string; projectIds?: string[] }), userId: user.id }, user.organizationId);
  }

  @Get('history')
  getHistory(@CurrentUser() user: AuthUser, @Query() query: Record<string, string>) {
    return this.reports.getHistory(user.organizationId, query, canSeeFinance(user));
  }

  @RequirePermission('report.manage')
  @Post('schedule')
  createSchedule(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.reports.createSchedule(body as Parameters<ReportsService['createSchedule']>[0], user.organizationId, user.id);
  }

  @Get('schedule')
  getSchedules(@CurrentUser() user: AuthUser) {
    return this.reports.getSchedules(user.organizationId);
  }

  @RequirePermission('report.manage')
  @Delete('schedule/:id')
  deleteSchedule(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.reports.deleteSchedule(id, user.organizationId);
  }

  @RequirePermission('report.manage')
  @Patch('schedule/:id')
  updateSchedule(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.reports.updateSchedule(id, body, user.organizationId);
  }

  @RequirePermission('report.manage')
  @Patch('schedule/:id/toggle')
  toggleSchedule(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.reports.toggleSchedule(id, user.organizationId);
  }

  @Get(':id')
  async getById(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const report = await this.reports.getById(id, user.organizationId, canSeeFinance(user));
    if (!report) throw new NotFoundException('Report not found.');
    return report;
  }

  @RequirePermission('report.manage')
  @Delete(':id')
  delete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.reports.delete(id, user.organizationId);
  }
}