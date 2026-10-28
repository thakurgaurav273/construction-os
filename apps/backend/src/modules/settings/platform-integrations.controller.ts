import { Body, Controller, Delete, Get, Put, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PlatformAdminGuard } from '../ai/platform-admin.guard';
import { SaveEmailIntegrationDto, SaveStorageIntegrationDto } from './dto/platform-integration.dto';
import { PlatformIntegrationsService, PlatformIntegrationsView } from './platform-integrations.service';

interface PlatformUser { email: string }

/** Each save contacts the provider (a probe upload, a test email), so keep retries modest. */
const SAVE_LIMIT = { default: { limit: 10, ttl: 60_000 } };

/**
 * Email and file storage for the whole install. They serve every tenant, so only platform super admins
 * (PLATFORM_ADMIN_EMAILS) can see or change them; organization owners only see their status.
 */
@Controller('platform/integrations')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class PlatformIntegrationsController {
  constructor(private readonly integrations: PlatformIntegrationsService) {}

  @Get()
  view(): Promise<PlatformIntegrationsView> {
    return this.integrations.view();
  }

  @Throttle(SAVE_LIMIT)
  @Put('storage')
  saveStorage(@Body() dto: SaveStorageIntegrationDto, @CurrentUser() user: PlatformUser): Promise<PlatformIntegrationsView> {
    return this.integrations.saveStorage(dto, user.email);
  }

  @Delete('storage')
  removeStorage(@CurrentUser() user: PlatformUser): Promise<PlatformIntegrationsView> {
    return this.integrations.remove('STORAGE', user.email);
  }

  @Throttle(SAVE_LIMIT)
  @Put('email')
  saveEmail(@Body() dto: SaveEmailIntegrationDto, @CurrentUser() user: PlatformUser): Promise<PlatformIntegrationsView> {
    return this.integrations.saveEmail(dto, user.email);
  }

  @Delete('email')
  removeEmail(@CurrentUser() user: PlatformUser): Promise<PlatformIntegrationsView> {
    return this.integrations.remove('EMAIL', user.email);
  }
}
