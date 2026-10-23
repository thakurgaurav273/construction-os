import {
  Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, HttpCode, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SettingsService } from './settings.service';
import { MAX_LOGO_BYTES, OrganizationSettingsService, OrganizationSettingsView } from './organization-settings.service';
import { UpdateBrandingDto, UpdateOrganizationSettingsDto } from './dto/organization.dto';
import { PermissionsGuard, RequirePermission } from '../../common/permissions';
import { ChangeMemberRoleDto, InviteMemberDto } from './dto/member.dto';
import { Audit } from '../../common/audit';

interface AuthUser { id: string; organizationId: string }

@Controller('settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly organization: OrganizationSettingsService,
  ) {}

  @Get('organization')
  getOrganization(@CurrentUser() user: AuthUser): Promise<OrganizationSettingsView> {
    return this.organization.get(user.organizationId);
  }

  @RequirePermission('organization.manage')
  @Audit('organization.updated')
  @Patch('organization')
  updateOrganization(@CurrentUser() user: AuthUser, @Body() dto: UpdateOrganizationSettingsDto): Promise<OrganizationSettingsView> {
    return this.organization.update(user.organizationId, dto);
  }

  @RequirePermission('organization.manage')
  @Audit('organization.branding_updated')
  @Patch('branding')
  updateBranding(@CurrentUser() user: AuthUser, @Body() dto: UpdateBrandingDto): Promise<OrganizationSettingsView> {
    return this.organization.updateBranding(user.organizationId, dto);
  }

  @RequirePermission('organization.manage')
  @Audit('organization.logo_updated')
  @Post('organization/logo')
  // The limit here stops oversized uploads before they are buffered; the service checks type and size again.
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_LOGO_BYTES + 1 } }))
  uploadLogo(@CurrentUser() user: AuthUser, @UploadedFile() file: Express.Multer.File | undefined): Promise<OrganizationSettingsView> {
    return this.organization.uploadLogo(user.organizationId, file);
  }

  @RequirePermission('organization.manage')
  @Audit('organization.logo_removed')
  @Delete('organization/logo')
  removeLogo(@CurrentUser() user: AuthUser): Promise<OrganizationSettingsView> {
    return this.organization.removeLogo(user.organizationId);
  }

  @Get('members')
  getMembers(@CurrentUser() user: AuthUser) {
    return this.settings.getMembers(user.organizationId);
  }

  @RequirePermission('members.manage')
  @Audit('member.role_changed')
  @Patch('members/:id/role')
  changeMemberRole(
    @CurrentUser() user: AuthUser,
    @Param('id') memberId: string,
    @Body() dto: ChangeMemberRoleDto,
  ) {
    return this.settings.changeMemberRole(memberId, user.organizationId, dto.role, user.id);
  }

  @RequirePermission('members.manage')
  @Audit('member.removed')
  @Delete('members/:id')
  removeMember(@CurrentUser() user: AuthUser, @Param('id') memberId: string) {
    return this.settings.removeMember(memberId, user.organizationId, user.id);
  }

  @RequirePermission('members.manage')
  @Audit('invitation.sent')
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
  @Audit('invitation.resent')
  @Post('invitations/:id/resend')
  resendInvitation(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.settings.resendInvitation(id, user.organizationId);
  }

  @RequirePermission('members.manage')
  @Audit('invitation.cancelled')
  @Delete('invitations/:id')
  @HttpCode(200)
  cancelInvitation(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.settings.cancelInvitation(id, user.organizationId);
  }
}