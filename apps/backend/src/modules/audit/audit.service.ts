import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AUDIT_ACTIONS, AuditAction, isAuditAction } from '../../common/audit';
import { AuditLogQueryDto } from './dto/audit-query.dto';
import { AuditValue } from './audit-metadata';
import { DomainEventsService } from '../../common/events';

export interface AuditEntry {
  action: AuditAction;
  organizationId: string;
  actorId: string | null;
  actorName: string;
  entityId?: string | null;
  projectId?: string | null;
  metadata?: AuditValue;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditLogView {
  id: string;
  action: string;
  /** Readable sentence fragment, e.g. "approved a purchase order". */
  summary: string;
  entityType: string;
  entityId: string | null;
  projectId: string | null;
  actor: { id: string | null; name: string };
  metadata: Prisma.JsonValue;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface AuditLogPage {
  items: AuditLogView[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const MAX_USER_AGENT_LENGTH = 300;

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: DomainEventsService,
  ) {}

  /**
   * Writes one entry. A failed write is logged rather than thrown: by the time it runs, the action itself
   * has already succeeded and been committed, so failing the request would only invite a duplicate retry.
   */
  async record(entry: AuditEntry): Promise<void> {
    try {
      const saved = await this.prisma.auditLog.create({
        data: {
          action: entry.action,
          entityType: AUDIT_ACTIONS[entry.action].entityType,
          entityId: entry.entityId ?? null,
          projectId: entry.projectId ?? null,
          actorId: entry.actorId,
          actorName: entry.actorName,
          metadata: entry.metadata === undefined ? undefined : (entry.metadata as Prisma.InputJsonValue),
          ipAddress: entry.ipAddress ?? null,
          userAgent: entry.userAgent?.slice(0, MAX_USER_AGENT_LENGTH) ?? null,
          organizationId: entry.organizationId,
        },
      });
      // Every audited action doubles as a domain event (e.g. for notifications).
      this.events.publish({
        action: entry.action,
        organizationId: saved.organizationId,
        actorId: saved.actorId,
        actorName: saved.actorName,
        entityType: saved.entityType,
        entityId: saved.entityId,
        projectId: saved.projectId,
        metadata: saved.metadata,
        occurredAt: saved.createdAt,
      });
    } catch (error) {
      this.logger.error(
        `Failed to write audit entry ${entry.action} for organization ${entry.organizationId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /** For events that affect a person in every organization they belong to, such as a password reset. */
  async recordForAllMemberships(userId: string, entry: Omit<AuditEntry, 'organizationId'>): Promise<void> {
    const memberships = await this.prisma.userOrganization.findMany({ where: { userId }, select: { organizationId: true } });
    await Promise.all(memberships.map(({ organizationId }) => this.record({ ...entry, organizationId })));
  }

  async findAll(organizationId: string, query: AuditLogQueryDto): Promise<AuditLogPage> {
    const where: Prisma.AuditLogWhereInput = { organizationId };
    if (query.actorId) where.actorId = query.actorId;
    if (query.entityType) where.entityType = query.entityType;
    if (query.entityId) where.entityId = query.entityId;
    if (query.projectId) where.projectId = query.projectId;
    if (query.action) where.action = query.action.endsWith('.') ? { startsWith: query.action } : query.action;
    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from && { gte: new Date(query.from) }),
        ...(query.to && { lte: endOfDayIfDateOnly(query.to) }),
      };
    }
    if (query.search) {
      where.OR = [
        { actorName: { contains: query.search, mode: 'insensitive' } },
        { entityId: { contains: query.search, mode: 'insensitive' } },
        { action: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        action: row.action,
        summary: isAuditAction(row.action) ? AUDIT_ACTIONS[row.action].label : row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        projectId: row.projectId,
        actor: { id: row.actorId, name: row.actorName },
        metadata: row.metadata,
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
        createdAt: row.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }
}

/** "2026-10-23" as an upper bound means the whole day. */
function endOfDayIfDateOnly(value: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T23:59:59.999Z`) : new Date(value);
}
