import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PermissionsGuard, RequirePermission } from '../../common/permissions';
import { Audit } from '../../common/audit';
import { OptionalNoteDto, RequiredNoteDto } from '../procurement/dto/review-note.dto';
import type { Paginated } from '../projects/projects.service';
import { CreateMaterialRequestDto, IssueAgainstRequestDto, MaterialRequestQueryDto } from './dto/material-request.dto';
import { MaterialRequestDetailView, MaterialRequestView } from './material-request.mapper';
import { MaterialRequestWorkflowService } from './material-request-workflow.service';
import { MaterialRequestsService } from './material-requests.service';

interface AuthUser { id: string; organizationId: string; role: string }

@Controller('material-requests')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MaterialRequestsController {
  constructor(
    private readonly requests: MaterialRequestsService,
    private readonly workflow: MaterialRequestWorkflowService,
  ) {}

  @Get()
  findAll(@Query() query: MaterialRequestQueryDto, @CurrentUser() user: AuthUser): Promise<Paginated<MaterialRequestView>> {
    return this.requests.findAll(user.organizationId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<MaterialRequestDetailView> {
    return this.requests.findOne(id, user.organizationId);
  }

  @RequirePermission('material.request')
  @Audit('material_request.raised')
  @Post()
  create(@Body() dto: CreateMaterialRequestDto, @CurrentUser() user: AuthUser): Promise<MaterialRequestDetailView> {
    return this.requests.create(user.organizationId, user.id, dto);
  }

  @RequirePermission('material.issue')
  @Audit('material_request.approved')
  @Post(':id/approve')
  approve(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<MaterialRequestDetailView> {
    return this.workflow.approve(id, user.organizationId, user.id);
  }

  @RequirePermission('material.issue')
  @Audit('material_request.rejected')
  @Post(':id/reject')
  reject(@Param('id') id: string, @Body() dto: RequiredNoteDto, @CurrentUser() user: AuthUser): Promise<MaterialRequestDetailView> {
    return this.workflow.reject(id, user.organizationId, user.id, dto.note);
  }

  @RequirePermission('material.request')
  @Audit('material_request.cancelled')
  @Post(':id/cancel')
  cancel(@Param('id') id: string, @Body() dto: OptionalNoteDto, @CurrentUser() user: AuthUser): Promise<MaterialRequestDetailView> {
    return this.workflow.cancel(id, user.organizationId, user.id, dto.note);
  }

  @RequirePermission('material.issue')
  @Audit('material_request.closed')
  @Post(':id/close')
  close(@Param('id') id: string, @Body() dto: RequiredNoteDto, @CurrentUser() user: AuthUser): Promise<MaterialRequestDetailView> {
    return this.workflow.close(id, user.organizationId, user.id, dto.note);
  }

  @RequirePermission('material.issue')
  @Audit('material_request.issued')
  @Post(':id/issue')
  issue(@Param('id') id: string, @Body() dto: IssueAgainstRequestDto, @CurrentUser() user: AuthUser): Promise<MaterialRequestDetailView> {
    return this.workflow.issue(id, user.organizationId, user.id, dto);
  }
}
