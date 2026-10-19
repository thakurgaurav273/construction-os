import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';
import { PermissionsGuard } from '../../common/permissions';

interface AuthUser { id: string; organizationId: string; role: string }

@Controller('notifications')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class NotificationsController {
  constructor(private notifications: NotificationsService) {}

  @Post('devices')
  registerDevice(@CurrentUser() user: AuthUser, @Body() dto: any) {
    return this.notifications.registerDevice(user.id, user.organizationId, dto);
  }

  @Delete('devices/:token')
  unregisterDevice(@CurrentUser() user: AuthUser, @Param('token') token: string) {
    return this.notifications.unregisterDevice(user.id, token);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: AuthUser) {
    return this.notifications.unreadCount(user.id, user.organizationId);
  }

  @Get()
  findMine(@CurrentUser() user: AuthUser, @Query() query: any) {
    return this.notifications.list(user.id, user.organizationId, query);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.notifications.markAllRead(user.id, user.organizationId);
  }

  @Patch(':id/read')
  markRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.notifications.markRead(id, user.id, user.organizationId);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.notifications.remove(id, user.id, user.organizationId);
  }
}