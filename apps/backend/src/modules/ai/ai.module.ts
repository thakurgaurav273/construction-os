import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MailService } from '../../common/mail/mail.service';
import { SecretBoxService } from '../../common/crypto/secret-box.service';
import { ProviderRegistry } from './providers/provider-registry';
import { AiAccessService } from './ai-access.service';
import { AiService } from './ai.service';
import { AiContextService } from './ai-context.service';
import { AiFeaturesService } from './ai-features.service';
import { AiConversationsService } from './ai-conversations.service';
import { AiCredentialsService } from './ai-credentials.service';
import { AiAccessRequestsService } from './ai-access-requests.service';
import { PlatformAiService } from './platform-ai.service';
import { PlatformAdminGuard } from './platform-admin.guard';
import { AiController } from './ai.controller';
import { PlatformController } from './platform.controller';

/** AI features (feature → AiService → provider adapter → model) and the platform console that funds trials. */
@Module({
  imports: [AuthModule],
  controllers: [AiController, PlatformController],
  providers: [
    SecretBoxService,
    ProviderRegistry,
    AiAccessService,
    AiService,
    AiContextService,
    AiFeaturesService,
    AiConversationsService,
    AiCredentialsService,
    AiAccessRequestsService,
    PlatformAiService,
    PlatformAdminGuard,
    MailService,
  ],
  exports: [AiService],
})
export class AiModule {}
