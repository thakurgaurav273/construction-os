import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Notification, PushDevice } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PermissionsGuard } from '../../common/permissions';
import { CategoryPreferenceView, NotificationPage, NotificationsService } from './notifications.service';
import { NotificationQueryDto, RegisterDeviceDto, UpdatePreferencesDto } from './dto/notification.dto';

interface AuthUser { id: string; organizationId: string }

/** A member's own inbox and delivery preferences; nobody can read or change another member's. */
@Controller('notifications')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  findMine(@CurrentUser() user: AuthUser, @Query() query: NotificationQueryDto): Promise<NotificationPage> {
    return this.notifications.list(user.id, user.organizationId, query);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: AuthUser): Promise<{ count: number }> {
    return this.notifications.unreadCount(user.id, user.organizationId);
  }

  @Get('preferences')
  getPreferences(@CurrentUser() user: AuthUser): Promise<CategoryPreferenceView[]> {
    return this.notifications.getPreferences(user.id, user.organizationId);
  }

  @Put('preferences')
  updatePreferences(@CurrentUser() user: AuthUser, @Body() dto: UpdatePreferencesDto): Promise<CategoryPreferenceView[]> {
    return this.notifications.updatePreferences(user.id, user.organizationId, dto);
  }

  @Post('devices')
  registerDevice(@CurrentUser() user: AuthUser, @Body() dto: RegisterDeviceDto): Promise<PushDevice> {
    return this.notifications.registerDevice(user.id, user.organizationId, dto);
  }

  @Delete('devices/:token')
  unregisterDevice(@CurrentUser() user: AuthUser, @Param('token') token: string): Promise<{ token: string }> {
    return this.notifications.unregisterDevice(user.id, token);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser() user: AuthUser): Promise<{ updated: number }> {
    return this.notifications.markAllRead(user.id, user.organizationId);
  }

  @Patch(':id/read')
  markRead(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<Notification> {
    return this.notifications.markRead(id, user.id, user.organizationId);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<{ id: string }> {
    return this.notifications.remove(id, user.id, user.organizationId);
  }
}
