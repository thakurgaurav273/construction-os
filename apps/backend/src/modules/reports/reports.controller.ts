import { Body, Controller, Delete, ForbiddenException, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import type { Permission } from '@sitepilot/types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PermissionsGuard, RequirePermission } from '../../common/permissions';
import { Audit } from '../../common/audit';
import { ReportPage, ReportTemplateView, ReportsService } from './reports.service';
import { ReportDetailView, ReportScheduleView, ReportView } from './reports.mapper';
import { REPORT_TITLES, ReportTypeKey, visibleReportTypes } from './reports.constants';
import {
  CreateScheduleDto, GenerateReportDto, ReportDownloadQueryDto, ReportHistoryQueryDto, UpdateScheduleDto,
} from './dto/report.dto';

interface AuthUser { id: string; organizationId: string; role: string; permissions: Permission[] }

/** Report types whose data the member can see; financial ones follow finance.view like the finance pages. */
const visibleTypes = (user: AuthUser): ReportTypeKey[] => visibleReportTypes(user.permissions);

function assertCanUseType(user: AuthUser, type: string, action: string): void {
  if (!(visibleTypes(user) as string[]).includes(type)) {
    throw new ForbiddenException(`Your access doesn't include the data in ${(REPORT_TITLES[type] ?? type).toLowerCase()} reports, so you can't ${action} them.`);
  }
}

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @RequirePermission('report.view')
  @Get('templates')
  getTemplates(@CurrentUser() user: AuthUser): ReportTemplateView[] {
    return this.reports.getTemplates(visibleTypes(user));
  }

  @RequirePermission('report.manage')
  @Audit('report.generated')
  @Post('generate')
  generate(@CurrentUser() user: AuthUser, @Body() dto: GenerateReportDto): Promise<ReportView> {
    assertCanUseType(user, dto.type, 'generate');
    return this.reports.generate(dto, user.organizationId, user.id);
  }

  @RequirePermission('report.view')
  @Get('history')
  getHistory(@CurrentUser() user: AuthUser, @Query() query: ReportHistoryQueryDto): Promise<ReportPage> {
    return this.reports.getHistory(user.organizationId, query, visibleTypes(user));
  }

  @RequirePermission('report.manage')
  @Audit('report_schedule.created')
  @Post('schedule')
  createSchedule(@CurrentUser() user: AuthUser, @Body() dto: CreateScheduleDto): Promise<ReportScheduleView> {
    assertCanUseType(user, dto.reportType, 'schedule');
    return this.reports.createSchedule(dto, user.organizationId, user.id);
  }

  @RequirePermission('report.view')
  @Get('schedule')
  getSchedules(@CurrentUser() user: AuthUser): Promise<ReportScheduleView[]> {
    return this.reports.getSchedules(user.organizationId, visibleTypes(user));
  }

  @RequirePermission('report.manage')
  @Audit('report_schedule.deleted')
  @Delete('schedule/:id')
  deleteSchedule(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<{ id: string }> {
    return this.reports.deleteSchedule(id, user.organizationId, visibleTypes(user));
  }

  @RequirePermission('report.manage')
  @Audit('report_schedule.updated')
  @Patch('schedule/:id')
  updateSchedule(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateScheduleDto): Promise<ReportScheduleView> {
    return this.reports.updateSchedule(id, dto, user.organizationId, visibleTypes(user));
  }

  @RequirePermission('report.manage')
  @Audit('report_schedule.toggled')
  @Patch('schedule/:id/toggle')
  toggleSchedule(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<ReportScheduleView> {
    return this.reports.toggleSchedule(id, user.organizationId, visibleTypes(user));
  }

  @RequirePermission('report.manage')
  @Audit('report_schedule.run')
  @Post('schedule/:id/run')
  runSchedule(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<ReportScheduleView> {
    return this.reports.runScheduleNow(id, user.organizationId, user.id, visibleTypes(user));
  }

  @RequirePermission('report.view')
  @Get(':id/download')
  download(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Query() query: ReportDownloadQueryDto): Promise<{ url: string; fileName: string }> {
    return this.reports.downloadLink(id, query, user.organizationId, visibleTypes(user));
  }

  @RequirePermission('report.view')
  @Get(':id')
  getById(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<ReportDetailView> {
    return this.reports.getById(id, user.organizationId, visibleTypes(user));
  }

  @RequirePermission('report.manage')
  @Audit('report.deleted')
  @Delete(':id')
  delete(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<{ id: string }> {
    return this.reports.delete(id, user.organizationId, visibleTypes(user));
  }
}
