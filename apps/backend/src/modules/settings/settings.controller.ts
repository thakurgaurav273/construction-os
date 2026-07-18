import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, HttpCode } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SettingsService } from './settings.service';

interface AuthUser { id: string; organizationId: string }

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('members')
  getMembers(@CurrentUser() user: AuthUser) {
    return this.settings.getMembers(user.organizationId);
  }

  @Patch('members/:id/role')
  changeMemberRole(
    @CurrentUser() user: AuthUser,
    @Param('id') memberId: string,
    @Body() body: { role: string },
  ) {
    return this.settings.changeMemberRole(memberId, user.organizationId, body.role, user.id);
  }

  @Delete('members/:id')
  removeMember(@CurrentUser() user: AuthUser, @Param('id') memberId: string) {
    return this.settings.removeMember(memberId, user.organizationId, user.id);
  }

  @Post('invitations')
  @HttpCode(201)
  inviteMember(@CurrentUser() user: AuthUser, @Body() body: { email: string; role: string }) {
    return this.settings.inviteMember(body.email, body.role, user.organizationId, user.id);
  }

  @Get('invitations')
  getInvitations(@CurrentUser() user: AuthUser) {
    return this.settings.getInvitations(user.organizationId);
  }

  @Post('invitations/:id/resend')
  resendInvitation(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.settings.resendInvitation(id, user.organizationId);
  }

  @Delete('invitations/:id')
  @HttpCode(200)
  cancelInvitation(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.settings.cancelInvitation(id, user.organizationId);
  }
}