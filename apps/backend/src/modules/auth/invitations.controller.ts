import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import { AUTH_RATE_LIMIT } from './auth.constants';
import { setAuthCookies } from './auth-cookies';
import { SessionView } from './auth.service';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { InvitationAcceptanceService, InvitationPreview } from './invitation-acceptance.service';
import { Audit } from '../../common/audit';

/** Public: the invitation token in the link is the credential. Sending and managing invitations lives in Settings. */
@Controller('invitations')
@UseGuards(ThrottlerGuard)
@Throttle(AUTH_RATE_LIMIT)
export class InvitationsController {
  constructor(
    private readonly invitations: InvitationAcceptanceService,
    private readonly config: ConfigService,
  ) {}

  @Get(':token')
  preview(@Param('token') token: string): Promise<InvitationPreview> {
    return this.invitations.preview(token);
  }

  @HttpCode(HttpStatus.OK)
  @Audit('invitation.accepted')
  @Post(':token/accept')
  async accept(
    @Param('token') token: string,
    @Body() dto: AcceptInvitationDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SessionView> {
    const { session, tokens } = await this.invitations.accept(token, dto);
    setAuthCookies(res, this.config, tokens);
    return session;
  }
}
