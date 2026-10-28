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
  /** Saved in the app by a platform admin, or set in the server environment. */
  source: 'app' | 'server';
}

const STORAGE_PROVIDERS: Record<StorageBackend, string> = {
  r2: 'Cloudflare R2',
  s3: 'Amazon S3',
  's3-compatible': 'S3-compatible storage',
  'local-disk': 'Local disk',
};

/**
 * Services the workspace depends on and whether they are connected. Email and storage are shared by every
 * tenant and set by platform admins (in the app or the server environment), so this is read-only; nothing
 * secret (keys, endpoints) is returned. AI keys are managed per organization under Settings → AI.
 */
@Injectable()
export class IntegrationsService {
  constructor(
    private readonly mail: MailService,
    private readonly storage: StorageService,
  ) {}

  async list(): Promise<IntegrationView[]> {
    return Promise.all([this.email(), this.fileStorage()]);
  }

  private async email(): Promise<IntegrationView> {
    const { configured, from, source } = await this.mail.status();
    if (!configured) {
      return {
        id: 'email',
        name: 'Email delivery',
        provider: null,
        state: 'not_configured',
        detail: 'Emails are not being sent. Invitations, password resets and email notifications won’t reach inboxes until a provider is connected.',
        source,
      };
    }
    return {
      id: 'email',
      name: 'Email delivery',
      provider: 'Resend',
      state: 'connected',
      detail: `Invitations, password resets and notifications are sent from ${from}.`,
      source,
    };
  }

  private async fileStorage(): Promise<IntegrationView> {
    const { backend, source } = await this.storage.status();
    return {
      id: 'storage',
      name: 'File storage',
      provider: STORAGE_PROVIDERS[backend],
      state: backend === 'local-disk' ? 'development' : 'connected',
      detail: backend === 'local-disk'
        ? 'Documents, photos and logos are stored on this server’s disk, which is meant for development only.'
        : 'Documents, photos and logos are stored in a private bucket and shared through expiring links.',
      source,
    };
  }
}
