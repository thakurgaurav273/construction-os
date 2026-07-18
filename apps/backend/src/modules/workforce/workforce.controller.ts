import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { WorkforceService } from './workforce.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

interface AuthUser {
  id: string;
  organizationId: string;
  role: string;
}

@Controller('workforce')
@UseGuards(JwtAuthGuard)
export class WorkforceController {
  constructor(private readonly workforceService: WorkforceService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.workforceService.findAll(user.organizationId);
  }

  @Get('stats')
  getStats(@CurrentUser() user: AuthUser) {
    return this.workforceService.getStats(user.organizationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.workforceService.findOne(id, user.organizationId);
  }
}

@Controller('projects/:projectId/workforce')
@UseGuards(JwtAuthGuard)
export class ProjectWorkforceController {
  constructor(private readonly workforceService: WorkforceService) {}

  @Get()
  findByProject(
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.workforceService.findByProject(projectId, user.organizationId);
  }

  @Get('stats')
  getProjectStats(
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.workforceService.getProjectStats(projectId, user.organizationId);
  }
}
