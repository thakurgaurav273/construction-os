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
  async generate(@CurrentUser() user: AuthUser, @Body() body: any) {
    return this.reports.generate({ ...body, userId: user.id }, user.organizationId);
  }

  @Get('history')
  getHistory(@CurrentUser() user: AuthUser, @Query() query: any) {
    return this.reports.getHistory(user.organizationId, query);
  }

  @Post('schedule')
  createSchedule(@CurrentUser() user: AuthUser, @Body() body: any) {
    return this.reports.createSchedule(body, user.organizationId, user.id);
  }

  @Get('schedule')
  getSchedules(@CurrentUser() user: AuthUser) {
    return this.reports.getSchedules(user.organizationId);
  }

  @Delete('schedule/:id')
  deleteSchedule(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.reports.deleteSchedule(id, user.organizationId);
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