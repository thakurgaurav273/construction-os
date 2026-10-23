import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiAccessRequest, AiAccessRequestKind, AiAccessRequestStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from '../../common/mail/mail.service';
import { escapeHtml } from '../../common/utils/escape-html';
import { AuditService } from '../audit/audit.service';
import { platformAdminEmails } from '../../common/platform/platform-admins';
import { CreateAiAccessRequestDto, DecideAiAccessRequestDto } from './dto/ai-settings.dto';

/** A first trial: two weeks and 100 requests, unless the platform admin grants something else. */
export const TRIAL_DEFAULTS = { requests: 100, days: 14 } as const;
const DEFAULT_TOP_UP_REQUESTS = 200;

export interface AccessRequestView {
  id: string;
  organizationId: string;
  organizationName: string;
  kind: AiAccessRequestKind;
  status: AiAccessRequestStatus;
  requestedRequests: number;
  reason: string | null;
  requestedBy: { id: string; name: string; email: string };
  createdAt: Date;
  decidedByEmail: string | null;
  decidedAt: Date | null;
  decisionNote: string | null;
  grantedRequests: number | null;
  expiresAt: Date | null;
}

const VIEW_INCLUDE = {
  organization: { select: { name: true } },
  requestedBy: { select: { id: true, name: true, email: true } },
} as const;

type RequestRow = AiAccessRequest & { organization: { name: string }; requestedBy: { id: string; name: string; email: string } };

function toView(row: RequestRow): AccessRequestView {
  return {
    id: row.id,
    organizationId: row.organizationId,
    organizationName: row.organization.name,
    kind: row.kind,
    status: row.status,
    requestedRequests: row.requestedRequests,
    reason: row.reason,
    requestedBy: row.requestedBy,
    createdAt: row.createdAt,
    decidedByEmail: row.decidedByEmail,
    decidedAt: row.decidedAt,
    decisionNote: row.decisionNote,
    grantedRequests: row.grantedRequests,
    expiresAt: row.expiresAt,
  };
}

/**
 * Tenants ask to use the platform's AI (a first trial, then top-ups); platform admins approve or reject.
 * One open request per tenant at a time, and only one trial ever.
 */
@Injectable()
export class AiAccessRequestsService {
  private readonly logger = new Logger(AiAccessRequestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async listForOrganization(organizationId: string): Promise<AccessRequestView[]> {
    const rows = await this.prisma.aiAccessRequest.findMany({ where: { organizationId }, include: VIEW_INCLUDE, orderBy: { createdAt: 'desc' }, take: 20 });
    return rows.map(toView);
  }

  async create(organizationId: string, userId: string, dto: CreateAiAccessRequestDto): Promise<AccessRequestView> {
    const [pending, trialGranted] = await Promise.all([
      this.prisma.aiAccessRequest.count({ where: { organizationId, status: AiAccessRequestStatus.PENDING } }),
      this.prisma.aiAccessRequest.count({ where: { organizationId, kind: AiAccessRequestKind.TRIAL, status: AiAccessRequestStatus.APPROVED } }),
    ]);
    if (pending > 0) throw new ConflictException('A request is already waiting for approval.');
    if (dto.kind === AiAccessRequestKind.TRIAL && trialGranted > 0) {
      throw new BadRequestException('Your organization has already had its free trial. Request more usage instead.');
    }
    if (dto.kind === AiAccessRequestKind.TOP_UP && trialGranted === 0) {
      throw new BadRequestException('Start with a free trial first.');
    }

    const row = await this.prisma.aiAccessRequest.create({
      data: {
        organizationId,
        kind: dto.kind,
        requestedRequests: dto.kind === AiAccessRequestKind.TRIAL ? TRIAL_DEFAULTS.requests : dto.requestedRequests ?? DEFAULT_TOP_UP_REQUESTS,
        reason: dto.reason?.trim() || null,
        requestedById: userId,
      },
      include: VIEW_INCLUDE,
    });
    void this.emailPlatformAdmins(toView(row));
    return toView(row);
  }

  async cancel(organizationId: string, id: string): Promise<AccessRequestView> {
    await this.claim(id, { organizationId }, { status: AiAccessRequestStatus.CANCELLED });
    return this.findView(id);
  }

  async listAll(status?: AiAccessRequestStatus): Promise<AccessRequestView[]> {
    const rows = await this.prisma.aiAccessRequest.findMany({
      where: status ? { status } : {},
      include: VIEW_INCLUDE,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 200,
    });
    return rows.map(toView);
  }

  /**
   * Grants requests for a number of days. A top-up extends the current allowance rather than replacing it:
   * expiry becomes the later of the existing expiry and today + days.
   */
  async approve(id: string, adminEmail: string, dto: DecideAiAccessRequestDto): Promise<AccessRequestView> {
    const request = await this.findRow(id);
    const now = new Date();
    const days = dto.days ?? TRIAL_DEFAULTS.days;
    const live = await this.prisma.aiAccessRequest.aggregate({
      where: { organizationId: request.organizationId, status: AiAccessRequestStatus.APPROVED, expiresAt: { gt: now } },
      _max: { expiresAt: true },
    });
    const fromToday = new Date(now.getTime() + days * 86_400_000);
    const expiresAt = live._max.expiresAt && live._max.expiresAt > fromToday ? live._max.expiresAt : fromToday;

    await this.claim(id, {}, {
      status: AiAccessRequestStatus.APPROVED,
      grantedRequests: dto.grantedRequests ?? request.requestedRequests,
      startsAt: now,
      expiresAt,
      decidedByEmail: adminEmail,
      decidedAt: now,
      decisionNote: dto.note?.trim() || null,
    });
    await this.recordDecision(request, 'ai.access_approved', adminEmail, dto.note);
    return this.findView(id);
  }

  async reject(id: string, adminEmail: string, note: string): Promise<AccessRequestView> {
    const request = await this.findRow(id);
    await this.claim(id, {}, {
      status: AiAccessRequestStatus.REJECTED,
      decidedByEmail: adminEmail,
      decidedAt: new Date(),
      decisionNote: note.trim(),
    });
    await this.recordDecision(request, 'ai.access_rejected', adminEmail, note);
    return this.findView(id);
  }

  /** Conditional update so a request can only be decided or cancelled once. */
  private async claim(id: string, scope: { organizationId?: string }, data: Partial<AiAccessRequest>): Promise<void> {
    const { count } = await this.prisma.aiAccessRequest.updateMany({
      where: { id, status: AiAccessRequestStatus.PENDING, ...scope },
      data,
    });
    if (count === 0) {
      const exists = await this.prisma.aiAccessRequest.count({ where: { id, ...scope } });
      if (!exists) throw new NotFoundException('Request not found');
      throw new ConflictException('This request has already been decided.');
    }
  }

  /** Platform decisions land in the tenant's own audit log, which also notifies the requester. */
  private async recordDecision(request: AiAccessRequest, action: 'ai.access_approved' | 'ai.access_rejected', adminEmail: string, note?: string): Promise<void> {
    await this.audit.record({
      action,
      organizationId: request.organizationId,
      actorId: null,
      actorName: `SitePilot platform (${adminEmail})`,
      entityId: request.id,
      metadata: { input: { note: note?.trim() || null } },
    });
  }

  private async findRow(id: string): Promise<AiAccessRequest> {
    const row = await this.prisma.aiAccessRequest.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Request not found');
    return row;
  }

  private async findView(id: string): Promise<AccessRequestView> {
    return toView(await this.prisma.aiAccessRequest.findUniqueOrThrow({ where: { id }, include: VIEW_INCLUDE }));
  }

  private async emailPlatformAdmins(request: AccessRequestView): Promise<void> {
    const appUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:5173').replace(/\/$/, '');
    const what = request.kind === AiAccessRequestKind.TRIAL ? 'a free AI trial' : `${request.requestedRequests} more AI requests`;
    for (const to of platformAdminEmails(this.config)) {
      await this.mail.sendEmail({
        to,
        subject: `${request.organizationName} requested ${what}`,
        html: `<p>${escapeHtml(request.requestedBy.name)} (${escapeHtml(request.requestedBy.email)}) at ${escapeHtml(request.organizationName)} requested ${what}.</p>
${request.reason ? `<p>Reason: ${escapeHtml(request.reason)}</p>` : ''}<p><a href="${appUrl}/platform">Review it in the platform console</a></p>`,
      }).catch((error: unknown) => this.logger.warn(`Couldn't email platform admin: ${error instanceof Error ? error.message : String(error)}`));
    }
  }
}
