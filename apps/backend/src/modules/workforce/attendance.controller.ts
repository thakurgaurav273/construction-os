import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AttendanceRecordView, AttendanceRoster, AttendanceService } from './attendance.service';
import { AttendanceDateQueryDto, MarkAttendanceDto, WorkerShiftEventDto } from './dto/attendance.dto';
import { PermissionsGuard, RequirePermission } from '../../common/permissions';

interface AuthUser {
  id: string;
  organizationId: string;
  role: string;
}

@Controller('projects/:projectId/attendance')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  getRoster(
    @Param('projectId') projectId: string,
    @Query() query: AttendanceDateQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<AttendanceRoster> {
    return this.attendanceService.getRoster(user.organizationId, projectId, query.date);
  }

  @RequirePermission('attendance.mark')
  @Put()
  markAttendance(
    @Param('projectId') projectId: string,
    @Body() dto: MarkAttendanceDto,
    @CurrentUser() user: AuthUser,
  ): Promise<AttendanceRoster> {
    return this.attendanceService.markAttendance(user.organizationId, projectId, user.id, dto);
  }

  @RequirePermission('attendance.mark')
  @Post('check-in')
  checkIn(
    @Param('projectId') projectId: string,
    @Body() dto: WorkerShiftEventDto,
    @CurrentUser() user: AuthUser,
  ): Promise<AttendanceRecordView> {
    return this.attendanceService.checkIn(user.organizationId, projectId, user.id, dto.workerId);
  }

  @RequirePermission('attendance.mark')
  @Post('check-out')
  checkOut(
    @Param('projectId') projectId: string,
    @Body() dto: WorkerShiftEventDto,
    @CurrentUser() user: AuthUser,
  ): Promise<AttendanceRecordView> {
    return this.attendanceService.checkOut(user.organizationId, projectId, user.id, dto.workerId);
  }
}
