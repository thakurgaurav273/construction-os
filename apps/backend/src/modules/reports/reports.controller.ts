import { Body, Controller, Delete, ForbiddenException, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import type { Permission } from '@sitepilot/types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PermissionsGuard, RequirePermission } from '../../common/permissions';
import { Audit } from '../../common/audit';
import { ReportPage, ReportTemplateView, ReportsService } from './reports.service';
import { ReportDetailView, ReportScheduleView, ReportView } from './reports.mapper';
import {
  CreateScheduleDto, GenerateReportDto, ReportDownloadQueryDto, ReportHistoryQueryDto, UpdateScheduleDto,
} from './dto/report.dto';

interface AuthUser { id: string; organizationId: string; role: string; permissions: Permission[] }

/** Financial reports carry invoice, payment and budget data, so they follow finance.view like the finance pages. */
const canSeeFinance = (user: AuthUser): boolean => user.permissions.includes('finance.view');

function assertCanUseType(user: AuthUser, type: string, action: string): void {
  if (type === 'FINANCIAL' && !canSeeFinance(user)) {
    throw new ForbiddenException(`Your role doesn't include financial data, so it can't ${action} financial reports.`);
  }
}

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('templates')
  getTemplates(@CurrentUser() user: AuthUser): ReportTemplateView[] {
    return this.reports.getTemplates(canSeeFinance(user));
  }

  @RequirePermission('report.manage')
  @Audit('report.generated')
  @Post('generate')
  generate(@CurrentUser() user: AuthUser, @Body() dto: GenerateReportDto): Promise<ReportView> {
    assertCanUseType(user, dto.type, 'generate');
    return this.reports.generate(dto, user.organizationId, user.id);
  }

  @Get('history')
  getHistory(@CurrentUser() user: AuthUser, @Query() query: ReportHistoryQueryDto): Promise<ReportPage> {
    return this.reports.getHistory(user.organizationId, query, canSeeFinance(user));
  }

  @RequirePermission('report.manage')
  @Audit('report_schedule.created')
  @Post('schedule')
  createSchedule(@CurrentUser() user: AuthUser, @Body() dto: CreateScheduleDto): Promise<ReportScheduleView> {
    assertCanUseType(user, dto.reportType, 'schedule');
    return this.reports.createSchedule(dto, user.organizationId, user.id);
  }

  @Get('schedule')
  getSchedules(@CurrentUser() user: AuthUser): Promise<ReportScheduleView[]> {
    return this.reports.getSchedules(user.organizationId, canSeeFinance(user));
  }

  @RequirePermission('report.manage')
  @Audit('report_schedule.deleted')
  @Delete('schedule/:id')
  deleteSchedule(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<{ id: string }> {
    return this.reports.deleteSchedule(id, user.organizationId, canSeeFinance(user));
  }

  @RequirePermission('report.manage')
  @Audit('report_schedule.updated')
  @Patch('schedule/:id')
  updateSchedule(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateScheduleDto): Promise<ReportScheduleView> {
    return this.reports.updateSchedule(id, dto, user.organizationId, canSeeFinance(user));
  }

  @RequirePermission('report.manage')
  @Audit('report_schedule.toggled')
  @Patch('schedule/:id/toggle')
  toggleSchedule(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<ReportScheduleView> {
    return this.reports.toggleSchedule(id, user.organizationId, canSeeFinance(user));
  }

  @RequirePermission('report.manage')
  @Audit('report_schedule.run')
  @Post('schedule/:id/run')
  runSchedule(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<ReportScheduleView> {
    return this.reports.runScheduleNow(id, user.organizationId, user.id, canSeeFinance(user));
  }

  @Get(':id/download')
  download(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Query() query: ReportDownloadQueryDto): Promise<{ url: string; fileName: string }> {
    return this.reports.downloadLink(id, query, user.organizationId, canSeeFinance(user));
  }

  @Get(':id')
  getById(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<ReportDetailView> {
    return this.reports.getById(id, user.organizationId, canSeeFinance(user));
  }

  @RequirePermission('report.manage')
  @Audit('report.deleted')
  @Delete(':id')
  delete(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<{ id: string }> {
    return this.reports.delete(id, user.organizationId, canSeeFinance(user));
  }
}
