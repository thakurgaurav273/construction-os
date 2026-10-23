import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseEnumPipe, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { AiProvider } from '@prisma/client';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PermissionsGuard, RequirePermission } from '../../common/permissions';
import { Audit } from '../../common/audit';
import { AiAccessService, AiAccessStatus } from './ai-access.service';
import { AiCredentialsService, AiSettingsView } from './ai-credentials.service';
import { AccessRequestView, AiAccessRequestsService, TRIAL_DEFAULTS } from './ai-access-requests.service';
import { AiFeaturesService, ChatAnswerView, InsightSnapshotView } from './ai-features.service';
import {
  AiChatDto, CreateAiAccessRequestDto, SaveAiCredentialDto, SelectAiProviderDto, UpdateAiModelDto,
} from './dto/ai-settings.dto';

interface AuthUser { id: string; organizationId: string }

/** Model calls cost money, so they get their own per-client limit on top of the allowance. */
const AI_CALL_LIMIT = { default: { limit: 20, ttl: 60_000 } };

const providerParam = new ParseEnumPipe(AiProvider);

@Controller('ai')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AiController {
  constructor(
    private readonly access: AiAccessService,
    private readonly credentials: AiCredentialsService,
    private readonly requests: AiAccessRequestsService,
    private readonly features: AiFeaturesService,
  ) {}

  /** Whether AI can be used right now, for every member (so screens can explain why it's off). */
  @Get('status')
  status(@CurrentUser() user: AuthUser): Promise<AiAccessStatus> {
    return this.access.status(user.organizationId);
  }

  @RequirePermission('ai.manage')
  @Get('settings')
  async settings(@CurrentUser() user: AuthUser): Promise<AiSettingsView & { status: AiAccessStatus; requests: AccessRequestView[]; trialDefaults: typeof TRIAL_DEFAULTS }> {
    const [settings, status, requests] = await Promise.all([
      this.credentials.settings(user.organizationId),
      this.access.status(user.organizationId),
      this.requests.listForOrganization(user.organizationId),
    ]);
    return { ...settings, status, requests, trialDefaults: TRIAL_DEFAULTS };
  }

  @RequirePermission('ai.manage')
  @Audit('ai.key_saved')
  @Put('credentials/:provider')
  saveKey(
    @Param('provider', providerParam) provider: AiProvider,
    @Body() dto: SaveAiCredentialDto,
    @CurrentUser() user: AuthUser,
  ): Promise<AiSettingsView> {
    return this.credentials.save(user.organizationId, user.id, provider, dto.apiKey, dto.model);
  }

  @RequirePermission('ai.manage')
  @Audit('ai.model_changed')
  @Patch('credentials/:provider')
  updateModel(
    @Param('provider', providerParam) provider: AiProvider,
    @Body() dto: UpdateAiModelDto,
    @CurrentUser() user: AuthUser,
  ): Promise<AiSettingsView> {
    return this.credentials.updateModel(user.organizationId, provider, dto.model);
  }

  @RequirePermission('ai.manage')
  @Audit('ai.key_removed')
  @Delete('credentials/:provider')
  removeKey(@Param('provider', providerParam) provider: AiProvider, @CurrentUser() user: AuthUser): Promise<AiSettingsView> {
    return this.credentials.remove(user.organizationId, provider);
  }

  @RequirePermission('ai.manage')
  @Audit('ai.provider_selected')
  @Put('provider')
  selectProvider(@Body() dto: SelectAiProviderDto, @CurrentUser() user: AuthUser): Promise<AiSettingsView> {
    return this.credentials.select(user.organizationId, dto.provider ?? null);
  }

  @RequirePermission('ai.manage')
  @Audit('ai.access_requested')
  @Post('access-requests')
  requestAccess(@Body() dto: CreateAiAccessRequestDto, @CurrentUser() user: AuthUser): Promise<AccessRequestView> {
    return this.requests.create(user.organizationId, user.id, dto);
  }

  @RequirePermission('ai.manage')
  @Audit('ai.access_cancelled')
  @HttpCode(HttpStatus.OK)
  @Post('access-requests/:id/cancel')
  cancelRequest(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<AccessRequestView> {
    return this.requests.cancel(user.organizationId, id);
  }

  @RequirePermission('ai.use')
  @UseGuards(ThrottlerGuard)
  @Throttle(AI_CALL_LIMIT)
  @HttpCode(HttpStatus.OK)
  @Post('chat')
  organizationChat(@Body() dto: AiChatDto, @CurrentUser() user: AuthUser): Promise<ChatAnswerView> {
    return this.features.organizationChat(user.organizationId, user.id, dto.messages);
  }

  @RequirePermission('ai.use')
  @UseGuards(ThrottlerGuard)
  @Throttle(AI_CALL_LIMIT)
  @HttpCode(HttpStatus.OK)
  @Post('projects/:projectId/chat')
  projectChat(@Param('projectId') projectId: string, @Body() dto: AiChatDto, @CurrentUser() user: AuthUser): Promise<ChatAnswerView> {
    return this.features.projectChat(user.organizationId, user.id, projectId, dto.messages);
  }

  @RequirePermission('ai.use')
  @Audit('daily_report.ai_summary_generated', { idParam: 'reportId' })
  @UseGuards(ThrottlerGuard)
  @Throttle(AI_CALL_LIMIT)
  @HttpCode(HttpStatus.OK)
  @Post('projects/:projectId/daily-reports/:reportId/summary')
  summarizeReport(@Param('projectId') projectId: string, @Param('reportId') reportId: string, @CurrentUser() user: AuthUser) {
    return this.features.summarizeDailyReport(user.organizationId, user.id, projectId, reportId);
  }

  @RequirePermission('ai.use')
  @Get('insights')
  insights(@CurrentUser() user: AuthUser): Promise<InsightSnapshotView | null> {
    return this.features.latestInsights(user.organizationId);
  }

  @RequirePermission('ai.use')
  @UseGuards(ThrottlerGuard)
  @Throttle(AI_CALL_LIMIT)
  @HttpCode(HttpStatus.OK)
  @Post('insights/refresh')
  refreshInsights(@CurrentUser() user: AuthUser): Promise<InsightSnapshotView> {
    return this.features.refreshInsights(user.organizationId, user.id);
  }
}
