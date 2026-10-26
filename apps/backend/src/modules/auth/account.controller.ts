import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Req, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Audit } from '../../common/audit';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MAX_IMAGE_BYTES } from '../../common/storage/image-uploads';
import { AccountService, PasswordChangeResult } from './account.service';
import { AUTH_COOKIES, AUTH_RATE_LIMIT } from './auth.constants';
import { AvatarService } from './avatar.service';
import { readCookie } from './auth-cookies';
import { PublicUser } from './auth.service';
import { ChangePasswordDto, UpdateProfileDto } from './dto/account.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SessionView, SessionsService } from './sessions.service';
import { AuthenticatedUser } from './strategies/jwt.strategy';

/**
 * The signed-in member's own account. Served under /auth because the refresh cookie is only sent there,
 * and it identifies which session is "this device".
 */
@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AccountController {
  constructor(
    private readonly account: AccountService,
    private readonly avatars: AvatarService,
    private readonly sessions: SessionsService,
  ) {}

  @Audit('account.profile_updated')
  @Patch('profile')
  updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto): Promise<PublicUser> {
    return this.account.updateProfile(user.id, dto);
  }

  @Audit('account.avatar_updated')
  @Post('profile/avatar')
  // The limit here stops oversized uploads before they are buffered; the service checks type and size again.
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_BYTES + 1 } }))
  uploadAvatar(@CurrentUser() user: AuthenticatedUser, @UploadedFile() file: Express.Multer.File | undefined): Promise<PublicUser> {
    return this.avatars.upload(user.id, file);
  }

  @Audit('account.avatar_removed')
  @Delete('profile/avatar')
  removeAvatar(@CurrentUser() user: AuthenticatedUser): Promise<PublicUser> {
    return this.avatars.remove(user.id);
  }

  /** Rate-limited like sign-in, since it checks the current password. */
  @Throttle(AUTH_RATE_LIMIT)
  @HttpCode(HttpStatus.OK)
  @Audit('account.password_changed')
  @Post('password')
  changePassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePasswordDto, @Req() req: Request): Promise<PasswordChangeResult> {
    return this.account.changePassword(user.id, dto, readCookie(req, AUTH_COOKIES.refresh));
  }

  @Get('sessions')
  listSessions(@CurrentUser() user: AuthenticatedUser, @Req() req: Request): Promise<SessionView[]> {
    return this.sessions.list(user.id, readCookie(req, AUTH_COOKIES.refresh));
  }

  /** Signs out every device except this one. */
  @Audit('account.other_sessions_ended')
  @Delete('sessions')
  async endOtherSessions(@CurrentUser() user: AuthenticatedUser, @Req() req: Request): Promise<{ endedSessions: number }> {
    return { endedSessions: await this.sessions.endOthers(user.id, readCookie(req, AUTH_COOKIES.refresh)) };
  }

  @Audit('account.session_ended')
  @Delete('sessions/:id')
  async endSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) sessionId: string,
    @Req() req: Request,
  ): Promise<{ success: true }> {
    await this.sessions.end(user.id, sessionId, readCookie(req, AUTH_COOKIES.refresh));
    return { success: true };
  }
}
