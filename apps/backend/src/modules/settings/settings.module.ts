import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { MailService } from '../../common/mail/mail.service';

@Module({
  controllers: [SettingsController],
  providers: [SettingsService, MailService],
})
export class SettingsModule {}