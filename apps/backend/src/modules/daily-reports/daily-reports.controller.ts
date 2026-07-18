import {
  Body, Controller, Get, Param, Post, UploadedFile,
  UseGuards, UseInterceptors, Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DailyReportsService } from './daily-reports.service';
import { CreateDailyReportDto } from './dto/create-daily-report.dto';

interface AuthUser { id: string; organizationId: string; role: string }

@Controller('projects/:projectId/daily-reports')
@UseGuards(JwtAuthGuard)
export class DailyReportsController {
  constructor(private readonly service: DailyReportsService) {}

  @Get()
  findAll(@Param('projectId') projectId: string, @CurrentUser() user: AuthUser) {
    return this.service.findAll(projectId, user.organizationId);
  }

  @Get(':reportId')
  findOne(
    @Param('projectId') projectId: string,
    @Param('reportId') reportId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findOne(projectId, reportId, user.organizationId);
  }

  @Post()
  create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateDailyReportDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.create(projectId, user.organizationId, user.id, dto);
  }
}
