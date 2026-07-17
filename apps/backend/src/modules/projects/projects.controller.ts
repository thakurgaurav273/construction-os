import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

interface AuthUser {
  id: string;
  organizationId: string;
  role: string;
}

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.projectsService.findAll(user.organizationId);
  }

  @Post()
  create(@Body() dto: CreateProjectDto, @CurrentUser() user: AuthUser) {
    return this.projectsService.create(user.organizationId, user.id, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.projectsService.findOne(id, user.organizationId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto, @CurrentUser() user: AuthUser) {
    return this.projectsService.update(id, user.organizationId, user.id, dto);
  }

  @Get(':id/available-members')
  getAvailableMembers(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.projectsService.getAvailableMembers(id, user.organizationId);
  }

  @Post(':id/members')
  addMember(@Param('id') id: string, @Body() dto: AddMemberDto, @CurrentUser() user: AuthUser) {
    return this.projectsService.addMember(id, user.organizationId, user.id, dto);
  }
}
