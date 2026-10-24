import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Notification } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from '../../common/mail/mail.service';
import type { DomainEvent } from '../../common/events';
import { PushService } from './push/push.service';
import { NotificationsGateway } from './notifications.gateway';
import {
  NOTIFICATION_CATEGORIES, NOTIFICATION_CATEGORY_KEYS, NotificationCategory, isNotificationCategory,
} from './notification-categories';
import type { NotificationPlan } from './notification-rules.service';
import { NotificationQueryDto, RegisterDeviceDto, UpdatePreferencesDto } from './dto/notification.dto';
import { escapeHtml } from '../../common/utils/escape-html';

export interface NotificationPage {
  items: Notification[];
  total: number;
  unread: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CategoryPreferenceView {
  category: NotificationCategory;
  label: string;
  description: string;
  inApp: boolean;
  email: boolean;
}

interface Channels { inApp: boolean; email: boolean }

/** What a notification is about: a user's action, or something the system noticed (e.g. a certificate expiring). */
export interface NotificationSource {
  organizationId: string;
  /** Stored on the notification, e.g. `po.approved` or `workforce.certification_reminder`. */
  event: string;
  entityType: string | null;
  entityId: string | null;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
    private readonly gateway: NotificationsGateway,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  /** Sends the notification planned for a user's action. */
  async deliver(event: DomainEvent, plan: NotificationPlan): Promise<void> {
    await this.send({ organizationId: event.organizationId, event: event.action, entityType: event.entityType, entityId: event.entityId }, plan);
  }

  /** Sends one plan to each recipient on the channels they've chosen for its category. */
  async send(source: NotificationSource, plan: NotificationPlan): Promise<void> {
    const recipients = [...new Set(plan.recipients)];
    if (recipients.length === 0) return;
    const channels = await this.channelsFor(recipients, source.organizationId, plan.category);
    const users = await this.prisma.user.findMany({
      where: { id: { in: recipients }, status: 'ACTIVE' },
      select: { id: true, email: true, name: true },
    });

    for (const user of users) {
      const choice = channels.get(user.id) ?? NOTIFICATION_CATEGORIES[plan.category].defaults;
      if (choice.inApp) {
        const notification = await this.prisma.notification.create({
          data: {
            organizationId: source.organizationId,
            userId: user.id,
            type: plan.type,
            category: plan.category,
            event: source.event,
            title: plan.title,
            message: plan.body,
            link: plan.link,
            entityType: source.entityType,
            entityId: source.entityId,
          },
        });
        this.gateway.emitToUser(source.organizationId, user.id, 'notification:new', notification);
        this.push.sendToUser(user.id, { title: plan.title, body: plan.body }).catch((error: unknown) => {
          this.logger.warn(`Push failed for user ${user.id}: ${error instanceof Error ? error.message : String(error)}`);
        });
      }
      if (choice.email) void this.sendEmail(user, plan);
    }
  }

  async list(userId: string, organizationId: string, query: NotificationQueryDto): Promise<NotificationPage> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const mine = { userId, organizationId };
    const where = { ...mine, ...(query.unreadOnly && { read: false }) };
    const [items, total, unread] = await Promise.all([
      this.prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { ...mine, read: false } }),
    ]);
    return { items, total, unread, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }

  async unreadCount(userId: string, organizationId: string): Promise<{ count: number }> {
    return { count: await this.prisma.notification.count({ where: { userId, organizationId, read: false } }) };
  }

  async markRead(id: string, userId: string, organizationId: string): Promise<Notification> {
    await this.findMine(id, userId, organizationId);
    return this.prisma.notification.update({ where: { id }, data: { read: true } });
  }

  async markAllRead(userId: string, organizationId: string): Promise<{ updated: number }> {
    const { count } = await this.prisma.notification.updateMany({ where: { userId, organizationId, read: false }, data: { read: true } });
    return { updated: count };
  }

  async remove(id: string, userId: string, organizationId: string): Promise<{ id: string }> {
    await this.findMine(id, userId, organizationId);
    await this.prisma.notification.delete({ where: { id } });
    return { id };
  }

  async getPreferences(userId: string, organizationId: string): Promise<CategoryPreferenceView[]> {
    const saved = await this.prisma.notificationPreference.findMany({ where: { userId, organizationId } });
    return NOTIFICATION_CATEGORY_KEYS.map((category) => {
      const info = NOTIFICATION_CATEGORIES[category];
      const row = saved.find((preference) => preference.category === category);
      return {
        category,
        label: info.label,
        description: info.description,
        inApp: row?.inApp ?? info.defaults.inApp,
        email: row?.email ?? info.defaults.email,
      };
    });
  }

  async updatePreferences(userId: string, organizationId: string, dto: UpdatePreferencesDto): Promise<CategoryPreferenceView[]> {
    await this.prisma.$transaction(dto.preferences
      .filter((preference) => isNotificationCategory(preference.category))
      .map((preference) => this.prisma.notificationPreference.upsert({
        where: { userId_organizationId_category: { userId, organizationId, category: preference.category } },
        create: { userId, organizationId, category: preference.category, inApp: preference.inApp, email: preference.email },
        update: { inApp: preference.inApp, email: preference.email },
      })));
    return this.getPreferences(userId, organizationId);
  }

  async registerDevice(userId: string, organizationId: string, dto: RegisterDeviceDto) {
    const device = { userId, organizationId, platform: dto.platform, browser: dto.browser, deviceName: dto.deviceName };
    return this.prisma.pushDevice.upsert({
      where: { token: dto.token },
      update: { ...device, active: true, lastSeenAt: new Date() },
      create: { ...device, token: dto.token },
    });
  }

  async unregisterDevice(userId: string, token: string): Promise<{ token: string }> {
    const device = await this.prisma.pushDevice.findFirst({ where: { token, userId } });
    if (!device) throw new NotFoundException('Device not found');
    await this.prisma.pushDevice.delete({ where: { token } });
    return { token };
  }

  private async channelsFor(userIds: string[], organizationId: string, category: NotificationCategory): Promise<Map<string, Channels>> {
    const rows = await this.prisma.notificationPreference.findMany({
      where: { userId: { in: userIds }, organizationId, category },
      select: { userId: true, inApp: true, email: true },
    });
    return new Map(rows.map((row) => [row.userId, { inApp: row.inApp, email: row.email }]));
  }

  private async sendEmail(user: { email: string; name: string }, plan: NotificationPlan): Promise<void> {
    const appUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:5173').replace(/\/$/, '');
    await this.mail.sendEmail({
      to: user.email,
      subject: plan.title,
      html: `<p>Hi ${escapeHtml(user.name)},</p><p>${escapeHtml(plan.body)}</p><p><a href="${appUrl}${plan.link}">Open in SitePilot</a></p>
<p style="color:#888;font-size:12px">You can change which emails you get in Settings → Notifications.</p>`,
    }).catch((error: unknown) => {
      this.logger.warn(`Notification email failed: ${error instanceof Error ? error.message : String(error)}`);
    });
  }

  private async findMine(id: string, userId: string, organizationId: string): Promise<void> {
    const notification = await this.prisma.notification.findFirst({ where: { id, userId, organizationId }, select: { id: true } });
    if (!notification) throw new NotFoundException('Notification not found');
  }
}
