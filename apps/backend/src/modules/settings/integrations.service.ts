import { Injectable } from '@nestjs/common';
import { MailService } from '../../common/mail/mail.service';
import { StorageBackend, StorageService } from '../../common/storage/storage.service';

export type IntegrationState = 'connected' | 'development' | 'not_configured';

export interface IntegrationView {
  id: 'email' | 'storage';
  name: string;
  provider: string | null;
  state: IntegrationState;
  /** What the state means for the organization, in plain words. */
  detail: string;
}

const STORAGE_PROVIDERS: Record<StorageBackend, string> = {
  r2: 'Cloudflare R2',
  's3-compatible': 'S3-compatible storage',
  'local-default': 'Local MinIO',
  'local-disk': 'Local disk',
};

/**
 * Services the workspace depends on and whether they are connected. Configuration comes from the server
 * environment, so this is read-only; nothing secret (keys, endpoints) is returned. AI keys are managed per
 * organization under Settings → AI.
 */
@Injectable()
export class IntegrationsService {
  constructor(
    private readonly mail: MailService,
    private readonly storage: StorageService,
  ) {}

  list(): IntegrationView[] {
    return [this.email(), this.fileStorage()];
  }

  private email(): IntegrationView {
    if (!this.mail.isDeliveryConfigured) {
      return {
        id: 'email',
        name: 'Email delivery',
        provider: null,
        state: 'not_configured',
        detail: 'Emails are not being sent. Invitations, password resets and email notifications won’t reach inboxes until a provider is connected.',
      };
    }
    return {
      id: 'email',
      name: 'Email delivery',
      provider: 'Resend',
      state: 'connected',
      detail: `Invitations, password resets and notifications are sent from ${this.mail.senderAddress}.`,
    };
  }

  private fileStorage(): IntegrationView {
    const backend = this.storage.backend;
    return {
      id: 'storage',
      name: 'File storage',
      provider: STORAGE_PROVIDERS[backend],
      state: backend === 'local-default' || backend === 'local-disk' ? 'development' : 'connected',
      detail: backend === 'local-default' || backend === 'local-disk'
        ? 'Documents, photos and logos are stored on the default local server, which is meant for development only.'
        : 'Documents, photos and logos are stored in object storage and shared through expiring links.',
    };
  }
}
