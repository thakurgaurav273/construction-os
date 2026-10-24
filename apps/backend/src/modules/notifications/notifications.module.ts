import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MailService } from '../../common/mail/mail.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationRulesService } from './notification-rules.service';
import { NotificationRecipientsService } from './notification-recipients.service';
import { PushService } from './push/push.service';
import { PUSH_PROVIDER } from './push/push-provider.interface';
import { FirebasePushProvider } from './push/firebase-push.provider';

@Module({
  imports: [AuthModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationRulesService,
    NotificationRecipientsService,
    PushService,
    NotificationsGateway,
    MailService,
    { provide: PUSH_PROVIDER, useClass: FirebasePushProvider },
  ],
  exports: [NotificationsService, NotificationRecipientsService],
})
export class NotificationsModule {}
