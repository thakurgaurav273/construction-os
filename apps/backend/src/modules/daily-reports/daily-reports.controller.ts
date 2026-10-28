import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile,
  UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DailyReportDetailView, DailyReportView } from './daily-report.mapper';
import { DailyReportWorkflowService } from './daily-report-workflow.service';
import { MAX_ATTACHMENT_SIZE_BYTES } from './daily-reports.constants';
import {
  DailyReportSummary, DailyReportsService, PaginatedDailyReports,
} from './daily-reports.service';
import { CreateDailyReportDto } from './dto/create-daily-report.dto';
import { DailyReportQueryDto } from './dto/daily-report-query.dto';
import { ApproveDailyReportDto, RejectDailyReportDto } from './dto/review-daily-report.dto';
import { UpdateDailyReportDto } from './dto/update-daily-report.dto';
import { PermissionsGuard, RequirePermission } from '../../common/permissions';
import { Audit } from '../../common/audit';

interface AuthUser { id: string; organizationId: string; role: string }

@Controller('daily-reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrganizationDailyReportsController {
  constructor(private readonly service: DailyReportsService) {}

  @RequirePermission('dailyReport.view')
  @Get()
  findAll(
    @Query() query: DailyReportQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<PaginatedDailyReports> {
    return this.service.findAllForOrganization(user.organizationId, query);
  }

  @RequirePermission('dailyReport.view')
  @Get('summary')
  getSummary(@CurrentUser() user: AuthUser): Promise<DailyReportSummary> {
    return this.service.getSummary(user.organizationId);
  }
}

@Controller('projects/:projectId/daily-reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DailyReportsController {
  constructor(
    private readonly service: DailyReportsService,
    private readonly workflow: DailyReportWorkflowService,
  ) {}

  @RequirePermission('dailyReport.view')
  @Get()
  findAll(
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<DailyReportView[]> {
    return this.service.findAllForProject(projectId, user.organizationId);
  }

  @RequirePermission('dailyReport.view')
  @Get(':reportId')
  findOne(
    @Param('projectId') projectId: string,
    @Param('reportId') reportId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<DailyReportDetailView> {
    return this.service.findOne(projectId, reportId, user.organizationId);
  }

  @RequirePermission('dailyReport.write')
  @Audit('daily_report.created')
  @Post()
  create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateDailyReportDto,
    @CurrentUser() user: AuthUser,
  ): Promise<DailyReportDetailView> {
    return this.service.create(projectId, user.organizationId, user.id, dto);
  }

  @RequirePermission('dailyReport.write')
  @Audit('daily_report.updated', { idParam: 'reportId' })
  @Patch(':reportId')
  update(
    @Param('projectId') projectId: string,
    @Param('reportId') reportId: string,
    @Body() dto: UpdateDailyReportDto,
    @CurrentUser() user: AuthUser,
  ): Promise<DailyReportDetailView> {
    return this.service.update(projectId, reportId, user.organizationId, user.id, dto);
  }

  @RequirePermission('dailyReport.write')
  @Audit('daily_report.submitted', { idParam: 'reportId' })
  @Post(':reportId/submit')
  submit(
    @Param('projectId') projectId: string,
    @Param('reportId') reportId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<DailyReportDetailView> {
    return this.workflow.submit(projectId, reportId, user.organizationId, user.id);
  }

  @RequirePermission('dailyReport.approve')
  @Audit('daily_report.approved', { idParam: 'reportId' })
  @Post(':reportId/approve')
  approve(
    @Param('projectId') projectId: string,
    @Param('reportId') reportId: string,
    @Body() dto: ApproveDailyReportDto,
    @CurrentUser() user: AuthUser,
  ): Promise<DailyReportDetailView> {
    return this.workflow.approve(projectId, reportId, user.organizationId, user.id, dto);
  }

  @RequirePermission('dailyReport.approve')
  @Audit('daily_report.rejected', { idParam: 'reportId' })
  @Post(':reportId/reject')
  reject(
    @Param('projectId') projectId: string,
    @Param('reportId') reportId: string,
    @Body() dto: RejectDailyReportDto,
    @CurrentUser() user: AuthUser,
  ): Promise<DailyReportDetailView> {
    return this.workflow.reject(projectId, reportId, user.organizationId, user.id, dto);
  }

  @RequirePermission('dailyReport.write')
  @Audit('daily_report.attachment_added', { idParam: 'reportId' })
  @Post(':reportId/attachments')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_ATTACHMENT_SIZE_BYTES } }))
  addAttachment(
    @Param('projectId') projectId: string,
    @Param('reportId') reportId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthUser,
  ): Promise<DailyReportDetailView> {
    return this.service.addAttachment(projectId, reportId, user.organizationId, user.id, file);
  }

  @RequirePermission('dailyReport.write')
  @Audit('daily_report.attachment_removed', { idParam: 'reportId' })
  @Delete(':reportId/attachments/:documentId')
  removeAttachment(
    @Param('projectId') projectId: string,
    @Param('reportId') reportId: string,
    @Param('documentId') documentId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<DailyReportDetailView> {
    return this.service.removeAttachment(projectId, reportId, documentId, user.organizationId, user.id);
  }
}
