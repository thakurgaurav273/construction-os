import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReportsService } from './reports.service';

interface AuthUser { id: string; organizationId: string; role: string }

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('templates')
  getTemplates() {
    return this.reports.getTemplates();
  }

  @Post('generate')
  async generate(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.reports.generate({ ...(body as { type: string; name: string; format: string; projectIds?: string[] }), userId: user.id }, user.organizationId);
  }

  @Get('history')
  getHistory(@CurrentUser() user: AuthUser, @Query() query: Record<string, string>) {
    return this.reports.getHistory(user.organizationId, query);
  }

  @Post('schedule')
  createSchedule(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.reports.createSchedule(body as Parameters<ReportsService['createSchedule']>[0], user.organizationId, user.id);
  }

  @Get('schedule')
  getSchedules(@CurrentUser() user: AuthUser) {
    return this.reports.getSchedules(user.organizationId);
  }

  @Delete('schedule/:id')
  deleteSchedule(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.reports.deleteSchedule(id, user.organizationId);
  }

  @Patch('schedule/:id')
  updateSchedule(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.reports.updateSchedule(id, body, user.organizationId);
  }

  @Patch('schedule/:id/toggle')
  toggleSchedule(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.reports.toggleSchedule(id, user.organizationId);
  }

  @Get(':id')
  getById(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.reports.getById(id, user.organizationId);
  }

  @Delete(':id')
  delete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.reports.delete(id, user.organizationId);
  }
}