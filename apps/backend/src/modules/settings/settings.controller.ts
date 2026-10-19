import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, HttpCode } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SettingsService } from './settings.service';
import { PermissionsGuard, RequirePermission } from '../../common/permissions';
import { ChangeMemberRoleDto, InviteMemberDto } from './dto/member.dto';

interface AuthUser { id: string; organizationId: string }

@Controller('settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('members')
  getMembers(@CurrentUser() user: AuthUser) {
    return this.settings.getMembers(user.organizationId);
  }

  @RequirePermission('members.manage')
  @Patch('members/:id/role')
  changeMemberRole(
    @CurrentUser() user: AuthUser,
    @Param('id') memberId: string,
    @Body() dto: ChangeMemberRoleDto,
  ) {
    return this.settings.changeMemberRole(memberId, user.organizationId, dto.role, user.id);
  }

  @RequirePermission('members.manage')
  @Delete('members/:id')
  removeMember(@CurrentUser() user: AuthUser, @Param('id') memberId: string) {
    return this.settings.removeMember(memberId, user.organizationId, user.id);
  }

  @RequirePermission('members.manage')
  @Post('invitations')
  @HttpCode(201)
  inviteMember(@CurrentUser() user: AuthUser, @Body() dto: InviteMemberDto) {
    return this.settings.inviteMember(dto.email, dto.role, user.organizationId, user.id);
  }

  @RequirePermission('members.manage')
  @Get('invitations')
  getInvitations(@CurrentUser() user: AuthUser) {
    return this.settings.getInvitations(user.organizationId);
  }

  @RequirePermission('members.manage')
  @Post('invitations/:id/resend')
  resendInvitation(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.settings.resendInvitation(id, user.organizationId);
  }

  @RequirePermission('members.manage')
  @Delete('invitations/:id')
  @HttpCode(200)
  cancelInvitation(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.settings.cancelInvitation(id, user.organizationId);
  }
}