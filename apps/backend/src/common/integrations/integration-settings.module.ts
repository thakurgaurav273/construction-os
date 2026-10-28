import { Global, Module } from '@nestjs/common';
import { SecretBoxService } from '../crypto/secret-box.service';
import { IntegrationSettingsStore } from './integration-settings.store';

@Global()
@Module({
  providers: [IntegrationSettingsStore, SecretBoxService],
  exports: [IntegrationSettingsStore],
})
export class IntegrationSettingsModule {}
