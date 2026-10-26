import {
  Body, Controller, Get, HttpCode, HttpStatus, Logger, Post, Req, Res, UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AUTH_COOKIES, AUTH_RATE_LIMIT } from './auth.constants';
import { clearAuthCookies, readCookie, setAuthCookies } from './auth-cookies';
import { AuthService, SessionView } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password.dto';
import { RegisterDto } from './dto/register.dto';
import { SwitchOrganizationDto } from './dto/switch-organization.dto';
import { MembershipView, OrganizationSwitchService } from './organization-switch.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PasswordResetService } from './password-reset.service';
import { sessionClientOf } from './session-client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from './strategies/jwt.strategy';
import { Audit } from '../../common/audit';

/**
 * Session tokens are only ever sent as HttpOnly cookies, never in a response body, so page scripts
 * (and anything injected into them) can't read them.
 */
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly passwordReset: PasswordResetService,
    private readonly organizationSwitch: OrganizationSwitchService,
    private readonly config: ConfigService,
  ) {}

  @Throttle(AUTH_RATE_LIMIT)
  @Audit('auth.registered')
  @Post('register')
  async register(@Body() dto: RegisterDto, @Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<SessionView> {
    const { session, tokens } = await this.authService.register(dto, sessionClientOf(req));
    setAuthCookies(res, this.config, tokens);
    return session;
  }

  @Throttle(AUTH_RATE_LIMIT)
  @HttpCode(HttpStatus.OK)
  @Audit('auth.signed_in')
  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<SessionView> {
    const { session, tokens } = await this.authService.login(dto, sessionClientOf(req));
    setAuthCookies(res, this.config, tokens);
    return session;
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<{ success: true }> {
    try {
      setAuthCookies(res, this.config, await this.authService.refresh(readCookie(req, AUTH_COOKIES.refresh), sessionClientOf(req)));
      return { success: true };
    } catch (error) {
      clearAuthCookies(res, this.config);
      throw error;
    }
  }

  /** Works with an expired access token: the refresh cookie identifies the session to end. */
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<{ success: true }> {
    await this.authService.logout(readCookie(req, AUTH_COOKIES.refresh));
    clearAuthCookies(res, this.config);
    return { success: true };
  }

  /** Always answers the same way and returns before any email is sent, so it can't reveal which emails have accounts. */
  @Throttle(AUTH_RATE_LIMIT)
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto): { success: true; message: string; data: null } {
    this.passwordReset.requestReset(dto).catch((error: unknown) => {
      this.logger.error('Password reset request failed', error instanceof Error ? error.stack : undefined);
    });
    return { success: true, message: 'If an account exists for that email, a reset link is on its way.', data: null };
  }

  @Throttle(AUTH_RATE_LIMIT)
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto, @Res({ passthrough: true }) res: Response): Promise<{ success: true }> {
    await this.passwordReset.resetPassword(dto);
    clearAuthCookies(res, this.config);
    return { success: true };
  }

  /** The signed-in member, including their current role and permissions in this organization. */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }

  /** Every organization the signed-in person belongs to, for the organization switcher. */
  @Get('organizations')
  @UseGuards(JwtAuthGuard)
  listOrganizations(@CurrentUser() user: AuthenticatedUser): Promise<MembershipView[]> {
    return this.organizationSwitch.listMemberships(user.id, user.organizationId);
  }

  /** Moves this session to another of their organizations; recorded in that organization's audit log by the service. */
  @HttpCode(HttpStatus.OK)
  @Post('switch-organization')
  @UseGuards(JwtAuthGuard)
  async switchOrganization(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SwitchOrganizationDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SessionView> {
    const { session, tokens } = await this.organizationSwitch.switchTo(user.id, readCookie(req, AUTH_COOKIES.refresh), dto.organizationId, sessionClientOf(req));
    setAuthCookies(res, this.config, tokens);
    return session;
  }
}
