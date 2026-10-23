import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseEnumPipe, Post, Put, Query, UseGuards,
} from '@nestjs/common';
import { AiAccessRequestStatus, AiProvider } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PlatformAdminGuard } from './platform-admin.guard';
import { AccessRequestView, AiAccessRequestsService } from './ai-access-requests.service';
import { PlatformAiService, TenantSummary } from './platform-ai.service';
import { DecideAiAccessRequestDto, RejectAiAccessRequestDto, SaveAiCredentialDto } from './dto/ai-settings.dto';

interface PlatformUser { email: string }

const providerParam = new ParseEnumPipe(AiProvider);
const statusQuery = new ParseEnumPipe(AiAccessRequestStatus, { optional: true });

/**
 * The SitePilot operator console. Spans every tenant, so it is guarded by the platform admin allow-list
 * (PLATFORM_ADMIN_EMAILS), not by organization roles.
 */
@Controller('platform')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class PlatformController {
  constructor(
    private readonly platform: PlatformAiService,
    private readonly requests: AiAccessRequestsService,
  ) {}

  @Get('tenants')
  tenants(): Promise<TenantSummary[]> {
    return this.platform.tenants();
  }

  @Get('ai/requests')
  accessRequests(@Query('status', statusQuery) status?: AiAccessRequestStatus): Promise<AccessRequestView[]> {
    return this.requests.listAll(status);
  }

  @HttpCode(HttpStatus.OK)
  @Post('ai/requests/:id/approve')
  approve(@Param('id') id: string, @Body() dto: DecideAiAccessRequestDto, @CurrentUser() user: PlatformUser): Promise<AccessRequestView> {
    return this.requests.approve(id, user.email, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('ai/requests/:id/reject')
  reject(@Param('id') id: string, @Body() dto: RejectAiAccessRequestDto, @CurrentUser() user: PlatformUser): Promise<AccessRequestView> {
    return this.requests.reject(id, user.email, dto.note);
  }

  @Get('ai/providers')
  providers() {
    return this.platform.providersView();
  }

  @Put('ai/providers/:provider')
  saveKey(@Param('provider', providerParam) provider: AiProvider, @Body() dto: SaveAiCredentialDto, @CurrentUser() user: PlatformUser) {
    return this.platform.saveKey(provider, dto.apiKey, dto.model, user.email);
  }

  @HttpCode(HttpStatus.OK)
  @Post('ai/providers/:provider/default')
  makeDefault(@Param('provider', providerParam) provider: AiProvider) {
    return this.platform.makeDefault(provider);
  }

  @Delete('ai/providers/:provider')
  removeKey(@Param('provider', providerParam) provider: AiProvider) {
    return this.platform.removeKey(provider);
  }

  @Get('ai/usage')
  usage() {
    return this.platform.platformUsage();
  }
}
