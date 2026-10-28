import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { WorkforceService, WorkforceStats } from './workforce.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AttendanceTrend } from './attendance-insights.service';
import { ProjectFilterQueryDto, WorkforceQueryDto } from './dto/attendance.dto';
import { CreateWorkerDto } from './dto/create-worker.dto';
import { UpdateWorkerDto } from './dto/update-worker.dto';
import { WorkerDetailView, WorkerView } from './worker.mapper';
import { PermissionsGuard, RequirePermission } from '../../common/permissions';
import { Audit } from '../../common/audit';

interface AuthUser {
  id: string;
  organizationId: string;
  role: string;
}

@Controller('workforce')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class WorkforceController {
  constructor(private readonly workforceService: WorkforceService) {}

  @RequirePermission('workforce.view')
  @Get()
  findAll(@Query() query: WorkforceQueryDto, @CurrentUser() user: AuthUser): Promise<WorkerView[]> {
    return this.workforceService.findAll(user.organizationId, query);
  }

  @RequirePermission('workforce.view')
  @Get('stats')
  getStats(@Query() query: ProjectFilterQueryDto, @CurrentUser() user: AuthUser): Promise<WorkforceStats> {
    return this.workforceService.getStats(user.organizationId, query.projectId);
  }

  @RequirePermission('workforce.view')
  @Get('attendance/trend')
  getAttendanceTrend(@Query() query: ProjectFilterQueryDto, @CurrentUser() user: AuthUser): Promise<AttendanceTrend> {
    return this.workforceService.getAttendanceTrend(user.organizationId, query.projectId);
  }

  @RequirePermission('workforce.view')
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<WorkerDetailView> {
    return this.workforceService.findOne(id, user.organizationId);
  }

  @RequirePermission('workforce.manage')
  @Audit('worker.created')
  @Post()
  create(@Body() dto: CreateWorkerDto, @CurrentUser() user: AuthUser): Promise<WorkerDetailView> {
    return this.workforceService.create(user.organizationId, user.id, dto);
  }

  @RequirePermission('workforce.manage')
  @Audit('worker.updated')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWorkerDto,
    @CurrentUser() user: AuthUser,
  ): Promise<WorkerDetailView> {
    return this.workforceService.update(id, user.organizationId, user.id, dto);
  }

  @RequirePermission('workforce.manage')
  @Audit('worker.deactivated')
  @Post(':id/deactivate')
  deactivate(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<WorkerDetailView> {
    return this.workforceService.setActive(id, user.organizationId, false);
  }

  @RequirePermission('workforce.manage')
  @Audit('worker.reactivated')
  @Post(':id/reactivate')
  reactivate(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<WorkerDetailView> {
    return this.workforceService.setActive(id, user.organizationId, true);
  }
}

@Controller('projects/:projectId/workforce')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProjectWorkforceController {
  constructor(private readonly workforceService: WorkforceService) {}

  @RequirePermission('workforce.view')
  @Get()
  findByProject(
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<WorkerView[]> {
    return this.workforceService.findAll(user.organizationId, { projectId });
  }

  @RequirePermission('workforce.view')
  @Get('stats')
  getProjectStats(
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<WorkforceStats> {
    return this.workforceService.getStats(user.organizationId, projectId);
  }
}
