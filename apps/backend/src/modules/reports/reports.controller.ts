import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Permission } from '@sitepilot/types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReportsService } from './reports.service';
import { CreateScheduleDto, GenerateReportDto, ReportHistoryQueryDto, UpdateScheduleDto } from './dto/report.dto';
import { PermissionsGuard, RequirePermission } from '../../common/permissions';
import { Audit } from '../../common/audit';

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
  @Audit('report.generated')
  @Post('generate')
  async generate(@CurrentUser() user: AuthUser, @Body() dto: GenerateReportDto) {
    if (dto.type === 'FINANCIAL' && !canSeeFinance(user)) {
      throw new ForbiddenException("Your role doesn't include financial data, so it can't generate financial reports.");
    }
    return this.reports.generate({ ...dto, userId: user.id }, user.organizationId);
  }

  @Get('history')
  getHistory(@CurrentUser() user: AuthUser, @Query() query: ReportHistoryQueryDto) {
    return this.reports.getHistory(user.organizationId, query, canSeeFinance(user));
  }

  @RequirePermission('report.manage')
  @Audit('report_schedule.created')
  @Post('schedule')
  createSchedule(@CurrentUser() user: AuthUser, @Body() dto: CreateScheduleDto) {
    if (dto.reportType === 'FINANCIAL' && !canSeeFinance(user)) {
      throw new ForbiddenException("Your role doesn't include financial data, so it can't schedule financial reports.");
    }
    return this.reports.createSchedule(dto, user.organizationId, user.id);
  }

  @Get('schedule')
  getSchedules(@CurrentUser() user: AuthUser) {
    return this.reports.getSchedules(user.organizationId);
  }

  @RequirePermission('report.manage')
  @Audit('report_schedule.deleted')
  @Delete('schedule/:id')
  deleteSchedule(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.reports.deleteSchedule(id, user.organizationId);
  }

  @RequirePermission('report.manage')
  @Audit('report_schedule.updated')
  @Patch('schedule/:id')
  updateSchedule(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateScheduleDto) {
    return this.reports.updateSchedule(id, dto, user.organizationId);
  }

  @RequirePermission('report.manage')
  @Audit('report_schedule.toggled')
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
  @Audit('report.deleted')
  @Delete(':id')
  delete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.reports.delete(id, user.organizationId);
  }
}