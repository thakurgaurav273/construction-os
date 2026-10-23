import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { OrganizationSettingsService } from './organization-settings.service';
import { MailService } from '../../common/mail/mail.service';
import { IntegrationsService } from './integrations.service';

@Module({
  controllers: [SettingsController],
  providers: [SettingsService, OrganizationSettingsService, IntegrationsService, MailService],
})
export class SettingsModule {}