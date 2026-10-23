import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrgRole } from '@prisma/client';
import { EmailAttachment, MailService } from '../../common/mail/mail.service';
import { rolesWithPermission } from '../../common/permissions';
import { StorageService } from '../../common/storage/storage.service';
import { escapeHtml } from '../../common/utils/escape-html';
import { PrismaService } from '../../database/prisma.service';
import type { ReportDocument } from './content/report-document';
import { formatValue, periodLabel, projectsLabel } from './render/report-format';
import { isReportDocument } from './reports.mapper';
import { REPORT_LINK_TTL_SECONDS } from './reports.constants';

/** Above this the files go as download links only; most mail servers reject much larger messages. */
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export type DeliveryStatus = 'DELIVERED' | 'PARTIAL' | 'FAILED' | 'NO_RECIPIENTS';

const fileName = (key: string): string => key.slice(key.lastIndexOf('/') + 1);

/**
 * Emails a finished scheduled report to its recipients: members holding the chosen roles plus any extra
 * addresses. Financial reports only go to roles that can see finance. The outcome lands on the schedule.
 */
@Injectable()
export class ReportDeliveryService {
  private readonly logger = new Logger(ReportDeliveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async deliver(reportId: string): Promise<DeliveryStatus> {
    const report = await this.prisma.generatedReport.findUniqueOrThrow({ where: { id: reportId } });
    const schedule = report.scheduleId
      ? await this.prisma.reportSchedule.findUnique({ where: { id: report.scheduleId } })
      : null;
    if (!schedule || !isReportDocument(report.data)) return 'FAILED';

    const recipients = await this.recipients(report.organizationId, report.type, schedule.recipients, schedule.emails);
    if (recipients.length === 0) {
      const reason = report.type === 'FINANCIAL' && schedule.recipients.length > 0
        ? 'Financial reports only go to roles with finance access, and no one with access was chosen.'
        : 'No one has the chosen roles yet, and no extra emails are set.';
      return this.record(schedule.id, 'NO_RECIPIENTS', reason);
    }

    const keys = [report.pdfKey, report.excelKey].filter((key): key is string => Boolean(key));
    const [attachments, links] = await Promise.all([
      this.attachments(keys),
      Promise.all(keys.map(async (key) => ({ name: fileName(key), url: await this.storage.getSignedDownloadUrl(key, REPORT_LINK_TTL_SECONDS, fileName(key)) }))),
    ]);
    const currency = (await this.prisma.organization.findUniqueOrThrow({ where: { id: report.organizationId }, select: { currency: true } })).currency;
    const html = this.emailHtml(report.data, currency, links, report.id, Boolean(attachments));
    const subject = `${report.data.title} · ${periodLabel(report.data.period)}`;

    // One message per person, so recipients don't see each other's addresses.
    const results = await Promise.all(recipients.map((to) => this.mail.sendEmail({ to, subject, html, attachments })));
    const failed = results.filter((sent) => !sent).length;
    if (failed === 0) return this.record(schedule.id, 'DELIVERED', null);
    if (failed === results.length) return this.record(schedule.id, 'FAILED', 'The email service rejected every message. An admin can check Settings → Integrations.');
    return this.record(schedule.id, 'PARTIAL', `${failed} of ${results.length} emails couldn’t be sent.`);
  }

  private async recipients(organizationId: string, type: string, roles: string[], emails: string[]): Promise<string[]> {
    const financeRoles = rolesWithPermission('finance.view');
    const chosenRoles = Object.values(OrgRole).filter((role) => roles.includes(role) && (type !== 'FINANCIAL' || financeRoles.includes(role)));
    const members = chosenRoles.length
      ? await this.prisma.userOrganization.findMany({
        where: { organizationId, role: { in: chosenRoles }, user: { status: 'ACTIVE' } },
        select: { user: { select: { email: true } } },
      })
      : [];
    const unique = new Map<string, string>();
    for (const email of [...members.map((member) => member.user.email), ...emails]) unique.set(email.toLowerCase(), email);
    return [...unique.values()];
  }

  private async attachments(keys: string[]): Promise<EmailAttachment[] | undefined> {
    try {
      const files = await Promise.all(keys.map(async (key) => ({ filename: fileName(key), content: await this.storage.download(key) })));
      const size = files.reduce((sum, file) => sum + file.content.length, 0);
      return size <= MAX_ATTACHMENT_BYTES ? files : undefined;
    } catch (error) {
      this.logger.warn(`Sending report links without attachments: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
  }

  private emailHtml(document: ReportDocument, currency: string, links: { name: string; url: string }[], reportId: string, attached: boolean): string {
    const appUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:5173').replace(/\/$/, '');
    const metrics = document.metrics
      .map((metric) => `<tr><td style="padding:4px 16px 4px 0;color:#64748b">${escapeHtml(metric.label)}</td><td style="padding:4px 0;font-weight:600">${escapeHtml(formatValue(metric.value, metric.kind, currency))}</td></tr>`)
      .join('');
    const downloads = links
      .map((link) => `<li><a href="${escapeHtml(link.url)}">${escapeHtml(link.name)}</a></li>`)
      .join('');
    return `<div style="font-family:Arial,sans-serif;color:#0f172a;max-width:600px">
<p style="color:#64748b;margin:0">${escapeHtml(document.organizationName)}</p>
<h2 style="margin:4px 0">${escapeHtml(document.title)}</h2>
<p style="color:#64748b;margin:0 0 16px">${escapeHtml(periodLabel(document.period))} · ${escapeHtml(projectsLabel(document.projectNames, document.allProjects))}</p>
${document.aiSummary ? `<p style="background:#f1f5f9;padding:12px;border-radius:6px">${escapeHtml(document.aiSummary)}</p>` : ''}
<table style="border-collapse:collapse;margin-bottom:16px">${metrics}</table>
<p>${attached ? 'The full report is attached. You can also download it' : 'Download the full report'} for the next 7 days:</p>
<ul>${downloads}</ul>
<p><a href="${appUrl}/dashboard/reports?report=${reportId}">Open in SitePilot</a></p>
<p style="color:#94a3b8;font-size:12px">You receive this because a scheduled report in SitePilot includes you. Ask an admin to change its recipients.</p>
</div>`;
  }

  private async record(scheduleId: string, status: DeliveryStatus, error: string | null): Promise<DeliveryStatus> {
    await this.prisma.reportSchedule.updateMany({ where: { id: scheduleId }, data: { lastStatus: status, lastError: error } });
    if (error) this.logger.warn(`Scheduled report ${scheduleId}: ${status} — ${error}`);
    return status;
  }
}
