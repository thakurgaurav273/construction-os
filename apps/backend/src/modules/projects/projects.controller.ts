import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ProjectsService, Paginated, ProjectActivityView } from './projects.service';
import { ProjectMembersService, AvailableMember } from './project-members.service';
import { ProjectLifecycleService } from './project-lifecycle.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AddMemberDto, ChangeProjectRoleDto } from './dto/add-member.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectQueryDto } from './dto/project-query.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectOption, ProjectSummary } from './project.mapper';
import { PermissionsGuard, RequirePermission } from '../../common/permissions';
import { Audit } from '../../common/audit';

interface AuthUser {
  id: string;
  organizationId: string;
  role: string;
}

@Controller('projects')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly members: ProjectMembersService,
    private readonly lifecycle: ProjectLifecycleService,
  ) {}

  @Get()
  findAll(@Query() query: ProjectQueryDto, @CurrentUser() user: AuthUser): Promise<Paginated<ProjectSummary>> {
    return this.projectsService.findAll(user.organizationId, query);
  }

  /** Every project that can take new work, for pickers. Registered before `:id` so "options" isn't read as an id. */
  @Get('options')
  findOptions(@CurrentUser() user: AuthUser): Promise<ProjectOption[]> {
    return this.projectsService.findOptions(user.organizationId);
  }

  @RequirePermission('project.create')
  @Audit('project.created')
  @Post()
  create(@Body() dto: CreateProjectDto, @CurrentUser() user: AuthUser) {
    return this.projectsService.create(user.organizationId, user.id, dto);
  }

  @Get(':id/activities')
  findActivities(@Param('id') id: string, @Query() query: PaginationDto, @CurrentUser() user: AuthUser): Promise<Paginated<ProjectActivityView>> {
    return this.projectsService.findActivities(id, user.organizationId, query.page, query.limit);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.projectsService.findOne(id, user.organizationId);
  }

  @RequirePermission('project.update')
  @Audit('project.updated')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto, @CurrentUser() user: AuthUser) {
    return this.projectsService.update(id, user.organizationId, user.id, dto);
  }

  @RequirePermission('project.update')
  @Audit('project.archived')
  @HttpCode(HttpStatus.OK)
  @Post(':id/archive')
  async archive(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.lifecycle.archive(id, user.organizationId, user.id);
    return this.projectsService.findOne(id, user.organizationId);
  }

  @RequirePermission('project.update')
  @Audit('project.restored')
  @HttpCode(HttpStatus.OK)
  @Post(':id/restore')
  async restore(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.lifecycle.restore(id, user.organizationId, user.id);
    return this.projectsService.findOne(id, user.organizationId);
  }

  @RequirePermission('project.delete')
  @Audit('project.deleted')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<{ id: string }> {
    return this.lifecycle.remove(id, user.organizationId, user.id);
  }

  @Get(':id/available-members')
  getAvailableMembers(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<AvailableMember[]> {
    return this.members.getAvailableMembers(id, user.organizationId);
  }

  @RequirePermission('project.members.manage')
  @Audit('project.member_added')
  @Post(':id/members')
  async addMember(@Param('id') id: string, @Body() dto: AddMemberDto, @CurrentUser() user: AuthUser) {
    await this.members.addMember(id, user.organizationId, user.id, dto);
    return this.projectsService.findOne(id, user.organizationId);
  }

  @RequirePermission('project.members.manage')
  @Audit('project.member_role_changed')
  @Patch(':id/members/:userId')
  async changeMemberRole(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: ChangeProjectRoleDto,
    @CurrentUser() user: AuthUser,
  ) {
    await this.members.changeRole(id, userId, user.organizationId, user.id, dto.role);
    return this.projectsService.findOne(id, user.organizationId);
  }

  @RequirePermission('project.members.manage')
  @Audit('project.member_removed')
  @Delete(':id/members/:userId')
  async removeMember(@Param('id') id: string, @Param('userId') userId: string, @CurrentUser() user: AuthUser) {
    await this.members.removeMember(id, userId, user.organizationId, user.id);
    return this.projectsService.findOne(id, user.organizationId);
  }
}
