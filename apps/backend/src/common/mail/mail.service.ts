import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private resend: Resend;

  constructor() {
    if (process.env.RESEND_API_KEY) {
      this.resend = new Resend(process.env.RESEND_API_KEY);
    }
  }

  async sendInvitationEmail(to: string, organizationName: string, role: string, acceptUrl: string): Promise<boolean> {
    if (!this.resend) {
      this.logger.log(`[stub] Would send invitation email to ${to} for ${organizationName}`);
      return true;
    }

    try {
      await this.resend.emails.send({
        from: 'noreply@sitepilot.dev',
        to,
        subject: `Invitation to join ${organizationName}`,
        html: `
          <h2>You've been invited to join ${organizationName}</h2>
          <p>Role: <strong>${role}</strong></p>
          <p><a href="${acceptUrl}" style="background-color: #6366f1; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none;">Accept Invitation</a></p>
          <p style="color: #999; font-size: 12px;">This invitation expires in 7 days.</p>
        `,
      });
      this.logger.log(`Invitation email sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send invitation email to ${to}:`, error);
      return false;
    }
  }

  async sendEmail({ to, subject, html }: SendEmailParams): Promise<boolean> {
    if (!this.resend) {
      this.logger.log(`[stub] Would send email to ${to}: ${subject}`);
      return true;
    }

    try {
      await this.resend.emails.send({ from: 'noreply@sitepilot.dev', to, subject, html });
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
      return false;
    }
  }
}