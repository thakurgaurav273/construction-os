import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PlatformIntegrationKind } from '@prisma/client';
import { keyHint } from '../../common/crypto/secret-box.service';
import { IntegrationRecord, IntegrationSettingsStore } from '../../common/integrations/integration-settings.store';
import { MailService } from '../../common/mail/mail.service';
import { StorageService } from '../../common/storage/storage.service';
import { SaveEmailIntegrationDto, SaveStorageIntegrationDto } from './dto/platform-integration.dto';

/** What a platform admin sees about the saved settings. Secrets appear only as a hint (last 4 characters). */
export interface PlatformIntegrationsView {
  storage: IntegrationRecord | null;
  email: IntegrationRecord | null;
  /** False until the server has AI_KEYS_ENCRYPTION_KEY, which also seals these secrets. */
  canSave: boolean;
}

/**
 * Email and file storage for every tenant, set up by platform super admins (ADR-048). Each save is tested
 * first (a probe file in the bucket, a test email to the admin), so a broken setting is never put live.
 */
@Injectable()
export class PlatformIntegrationsService {
  private readonly logger = new Logger(PlatformIntegrationsService.name);

  constructor(
    private readonly store: IntegrationSettingsStore,
    private readonly storage: StorageService,
    private readonly mail: MailService,
  ) {}

  async view(): Promise<PlatformIntegrationsView> {
    const [storage, email] = await Promise.all([this.store.describe('STORAGE'), this.store.describe('EMAIL')]);
    return { storage, email, canSave: this.store.canStoreSecrets };
  }

  async saveStorage(dto: SaveStorageIntegrationDto, adminEmail: string): Promise<PlatformIntegrationsView> {
    this.assertCanSave();
    const settings = compact({
      bucket: dto.bucket,
      region: dto.provider === 's3' ? dto.region : undefined,
      endpoint: dto.provider === 's3' ? dto.endpoint : undefined,
      accountId: dto.provider === 'r2' ? dto.accountId : undefined,
    });
    const secrets = { accessKeyId: dto.accessKeyId.trim(), secretAccessKey: dto.secretAccessKey.trim() };
    await this.verified(() => this.storage.verify({ provider: dto.provider, ...settings, ...secrets }));
    await this.store.save('STORAGE', { provider: dto.provider, settings, secrets, secretHint: keyHint(secrets.accessKeyId), updatedByEmail: adminEmail });
    this.logger.log(`File storage set to ${dto.provider} bucket ${settings.bucket} by ${adminEmail}.`);
    return this.view();
  }

  async saveEmail(dto: SaveEmailIntegrationDto, adminEmail: string): Promise<PlatformIntegrationsView> {
    this.assertCanSave();
    const apiKey = dto.apiKey.trim();
    const fromAddress = dto.fromAddress.trim();
    await this.verified(() => this.mail.verify(apiKey, fromAddress, adminEmail));
    await this.store.save('EMAIL', { provider: 'resend', settings: { fromAddress }, secrets: { apiKey }, secretHint: keyHint(apiKey), updatedByEmail: adminEmail });
    this.logger.log(`Email delivery set to Resend (${fromAddress}) by ${adminEmail}.`);
    return this.view();
  }

  /** Falls back to the server environment's settings. */
  async remove(kind: PlatformIntegrationKind, adminEmail: string): Promise<PlatformIntegrationsView> {
    await this.store.remove(kind);
    this.logger.log(`Saved ${kind.toLowerCase()} settings removed by ${adminEmail}; using the server environment.`);
    return this.view();
  }

  private assertCanSave(): void {
    if (!this.store.canStoreSecrets) {
      throw new BadRequestException('The server has no encryption key, so keys can’t be stored safely. Set AI_KEYS_ENCRYPTION_KEY first.');
    }
  }

  private async verified(check: () => Promise<void>): Promise<void> {
    try {
      await check();
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'These settings didn’t work. Check them and try again.');
    }
  }
}

function compact(values: Record<string, string | undefined>): Record<string, string> {
  return Object.fromEntries(Object.entries(values)
    .map(([key, value]) => [key, value?.trim()] as const)
    .filter((entry): entry is readonly [string, string] => Boolean(entry[1])));
}
