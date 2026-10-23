import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PermissionsGuard, RequirePermission } from '../../common/permissions';
import { Audit } from '../../common/audit';
import { BudgetService, ProjectBudgetView } from './budget.service';
import { CreateBudgetHeadDto, UpdateBudgetHeadDto } from './dto/budget.dto';

interface AuthUser { id: string; organizationId: string }

@Controller('projects/:projectId/budget')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProjectBudgetController {
  constructor(private readonly budgets: BudgetService) {}

  @RequirePermission('finance.view')
  @Get()
  get(@CurrentUser() user: AuthUser, @Param('projectId', ParseUUIDPipe) projectId: string): Promise<ProjectBudgetView> {
    return this.budgets.forProject(projectId, user.organizationId);
  }

  /** Names only, no money: anyone raising an order or bill picks the head it belongs to. */
  @Get('categories')
  categories(@CurrentUser() user: AuthUser, @Param('projectId', ParseUUIDPipe) projectId: string): Promise<string[]> {
    return this.budgets.categories(projectId, user.organizationId);
  }

  @RequirePermission('budget.manage')
  @Audit('budget_head.created')
  @Post('heads')
  create(@CurrentUser() user: AuthUser, @Param('projectId', ParseUUIDPipe) projectId: string, @Body() dto: CreateBudgetHeadDto): Promise<ProjectBudgetView> {
    return this.budgets.createHead(projectId, user.organizationId, dto);
  }

  @RequirePermission('budget.manage')
  @Audit('budget_head.updated')
  @Patch('heads/:headId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('headId', ParseUUIDPipe) headId: string,
    @Body() dto: UpdateBudgetHeadDto,
  ): Promise<ProjectBudgetView> {
    return this.budgets.updateHead(projectId, headId, user.organizationId, dto);
  }

  @RequirePermission('budget.manage')
  @Audit('budget_head.deleted')
  @Delete('heads/:headId')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('headId', ParseUUIDPipe) headId: string,
  ): Promise<ProjectBudgetView> {
    return this.budgets.deleteHead(projectId, headId, user.organizationId);
  }
}
