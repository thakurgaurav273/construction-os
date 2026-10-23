import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PermissionsGuard, RequirePermission } from '../../common/permissions';
import { MaterialPlanDto, SiteStockMovementDto } from './dto/site-stock-movement.dto';
import { MaterialIssueView, ProjectMaterialsView } from './project-materials.mapper';
import { ProjectMaterialsService } from './project-materials.service';
import { Audit } from '../../common/audit';

interface AuthUser { id: string; organizationId: string; role: string }

@Controller('projects/:projectId/materials')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProjectMaterialsController {
  constructor(private readonly service: ProjectMaterialsService) {}

  @Get()
  findAll(
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ProjectMaterialsView> {
    return this.service.findForProject(projectId, user.organizationId);
  }

  @RequirePermission('material.issue')
  @Audit('material.issued')
  @Post('issues')
  issue(
    @Param('projectId') projectId: string,
    @Body() dto: SiteStockMovementDto,
    @CurrentUser() user: AuthUser,
  ): Promise<MaterialIssueView> {
    return this.service.issue(projectId, user.organizationId, user.id, dto);
  }

  @RequirePermission('material.issue')
  @Audit('material.returned')
  @Post('returns')
  returnToStore(
    @Param('projectId') projectId: string,
    @Body() dto: SiteStockMovementDto,
    @CurrentUser() user: AuthUser,
  ): Promise<MaterialIssueView> {
    return this.service.returnToStore(projectId, user.organizationId, user.id, dto);
  }

  @RequirePermission('project.update')
  @Audit('material.plan_set', { idParam: 'materialId' })
  @Put(':materialId/plan')
  setPlan(
    @Param('projectId') projectId: string,
    @Param('materialId') materialId: string,
    @Body() dto: MaterialPlanDto,
    @CurrentUser() user: AuthUser,
  ): Promise<{ planned: number }> {
    return this.service.setPlan(projectId, materialId, user.organizationId, dto);
  }
}
