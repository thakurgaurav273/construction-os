import { Injectable, Logger, Optional } from '@nestjs/common';
import { Resend } from 'resend';
import { INTEGRATION_CACHE_MS, IntegrationSettingsStore } from '../integrations/integration-settings.store';

export interface EmailAttachment {
  filename: string;
  content: Buffer;
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}

interface Sender {
  resend: Resend;
  from: string;
}

/** Where email is sent from, and whether that was set in the app or in the server environment. */
export interface MailStatus {
  configured: boolean;
  from: string;
  source: 'app' | 'server';
}

const DEFAULT_SENDER = 'noreply@sitepilot.dev';

/**
 * Sends email through Resend. A key a platform admin saved in the app wins over RESEND_API_KEY. Without
 * either, emails are only logged, which is fine locally but not in production.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly serverSender: Sender | null;
  private cached: { sender: Sender | null; source: MailStatus['source']; loadedAt: number; version: number | null } | null = null;

  constructor(@Optional() private readonly integrations?: IntegrationSettingsStore) {
    this.serverSender = process.env.RESEND_API_KEY
      ? { resend: new Resend(process.env.RESEND_API_KEY), from: process.env.EMAIL_FROM || DEFAULT_SENDER }
      : null;
    integrations?.onChange('EMAIL', () => {
      this.cached = null;
    });
  }

  async status(): Promise<MailStatus> {
    const { sender, source } = await this.current();
    return { configured: Boolean(sender), from: sender?.from ?? (process.env.EMAIL_FROM || DEFAULT_SENDER), source };
  }

  /** Sends a test email with an unsaved key; throws a message for the admin when Resend refuses it. */
  async verify(apiKey: string, from: string, to: string): Promise<void> {
    const { error } = await new Resend(apiKey).emails.send({
      from,
      to,
      subject: 'SitePilot email is connected',
      html: '<p>This test email confirms SitePilot can send invitations, password resets and notifications from this address.</p>',
    });
    if (error) throw new Error(describeResendError(error));
  }

  async sendInvitationEmail(to: string, organizationName: string, role: string, acceptUrl: string): Promise<boolean> {
    const { sender } = await this.current();
    if (!sender) {
      this.logger.log(`[stub] Would send invitation email to ${to} for ${organizationName}`);
      return true;
    }

    try {
      const { error } = await sender.resend.emails.send({
        from: sender.from,
        to,
        subject: `Invitation to join ${organizationName}`,
        html: `
          <h2>You've been invited to join ${organizationName}</h2>
          <p>Role: <strong>${role}</strong></p>
          <p><a href="${acceptUrl}" style="background-color: #6366f1; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none;">Accept Invitation</a></p>
          <p style="color: #999; font-size: 12px;">This invitation expires in 7 days.</p>
        `,
      });
      if (error) throw new Error(error.message);
      this.logger.log(`Invitation email sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send invitation email to ${to}:`, error);
      return false;
    }
  }

  async sendEmail({ to, subject, html, attachments }: SendEmailParams): Promise<boolean> {
    const { sender } = await this.current();
    if (!sender) {
      const files = attachments?.length ? ` with ${attachments.map((attachment) => attachment.filename).join(', ')}` : '';
      this.logger.log(`[stub] Would send email to ${to}: ${subject}${files}`);
      return true;
    }

    try {
      const { error } = await sender.resend.emails.send({ from: sender.from, to, subject, html, attachments });
      if (error) throw new Error(error.message);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
      return false;
    }
  }

  /** The saved Resend key when there is one, else RESEND_API_KEY. Re-checked every 30 s for saves on other instances. */
  private async current(): Promise<{ sender: Sender | null; source: MailStatus['source'] }> {
    const now = Date.now();
    if (this.cached && now - this.cached.loadedAt < INTEGRATION_CACHE_MS) return this.cached;
    const saved = await this.integrations?.describe('EMAIL');
    const version = saved ? saved.updatedAt.getTime() : null;
    if (this.cached && this.cached.version === version) {
      this.cached.loadedAt = now;
      return this.cached;
    }
    const secrets = saved ? (await this.integrations?.find('EMAIL'))?.secrets : undefined;
    const sender = saved && secrets?.apiKey
      ? { resend: new Resend(secrets.apiKey), from: saved.settings.fromAddress || DEFAULT_SENDER }
      : this.serverSender;
    this.cached = { sender, source: saved ? 'app' : 'server', loadedAt: now, version };
    return this.cached;
  }
}

function describeResendError(error: { name?: string; message?: string }): string {
  if (error.name === 'validation_error' && /domain/i.test(error.message ?? '')) {
    return 'Resend hasn’t verified the sender’s domain. Verify it in Resend, or send from an address on a verified domain.';
  }
  if (['missing_api_key', 'invalid_api_key', 'restricted_api_key'].includes(error.name ?? '') || /api key/i.test(error.message ?? '')) {
    return 'Resend rejected this API key. Create a key with sending access and try again.';
  }
  return error.message ? `Resend couldn’t send the test email: ${error.message}` : 'Resend couldn’t send the test email. Check the key and sender address.';
}
