import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { OrganizationSettingsService } from './organization-settings.service';
import { MailService } from '../../common/mail/mail.service';
import { IntegrationsService } from './integrations.service';
import { PlatformIntegrationsController } from './platform-integrations.controller';
import { PlatformIntegrationsService } from './platform-integrations.service';

@Module({
  controllers: [SettingsController, PlatformIntegrationsController],
  providers: [SettingsService, OrganizationSettingsService, IntegrationsService, PlatformIntegrationsService, MailService],
})
export class SettingsModule {}