import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PushService } from './push/push.service';
import { NotificationsGateway } from './notifications.gateway';

export interface NotifyInput {
  userId: string;
  orgId: string;
  type: string;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private push: PushService,
    private gateway: NotificationsGateway,
  ) {}

  async notify(input: NotifyInput): Promise<void> {
    const notification = await this.prisma.notification.create({
      data: {
        organizationId: input.orgId,
        userId: input.userId,
        type: input.type as any,
        title: input.title,
        message: input.body,
        entityType: input.entityType,
        entityId: input.entityId,
      },
    });

    // Fire and forget - never let push failure break the main flow
    const results = await Promise.allSettled([
      this.push.sendToUser(input.userId, { title: input.title, body: input.body }),
      Promise.resolve(this.gateway.emitToUser(input.userId, 'notification:new', notification)),
    ]);

    for (const result of results) {
      if (result.status === 'rejected') {
        this.logger.error(`Notification channel failed: ${result.reason}`);
      }
    }
  }

  async registerDevice(userId: string, orgId: string, dto: RegisterDeviceDto) {
    return this.prisma.pushDevice.upsert({
      where: { token: dto.token },
      update: {
        userId,
        organizationId: orgId,
        platform: dto.platform,
        browser: dto.browser,
        deviceName: dto.deviceName,
        active: true,
        lastSeenAt: new Date(),
      },
      create: {
        userId,
        organizationId: orgId,
        token: dto.token,
        platform: dto.platform,
        browser: dto.browser,
        deviceName: dto.deviceName,
      },
    });
  }

  async unregisterDevice(userId: string, token: string) {
    const device = await this.prisma.pushDevice.findFirst({ where: { token, userId } });
    if (!device) throw new NotFoundException('Device not found');
    await this.prisma.pushDevice.delete({ where: { token } });
    return { message: 'Device unregistered' };
  }

  async list(userId: string, orgId: string, options?: { page?: number; limit?: number; isRead?: boolean }) {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const where = { userId, organizationId: orgId, ...(options?.isRead !== undefined && { read: options.isRead }) };

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async markRead(id: string, userId: string, orgId: string) {
    const notification = await this.prisma.notification.findFirst({ where: { id, userId, organizationId: orgId } });
    if (!notification) throw new NotFoundException('Notification not found');
    return this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });
  }

  async markAllRead(userId: string, orgId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, organizationId: orgId, read: false },
      data: { read: true },
    });
    return { message: 'All notifications marked as read' };
  }

  async unreadCount(userId: string, orgId: string) {
    const count = await this.prisma.notification.count({ where: { userId, organizationId: orgId, read: false } });
    return { count };
  }

  async remove(id: string, userId: string, orgId: string) {
    const notification = await this.prisma.notification.findFirst({ where: { id, userId, organizationId: orgId } });
    if (!notification) throw new NotFoundException('Notification not found');
    await this.prisma.notification.delete({ where: { id } });
    return { message: 'Notification deleted' };
  }
}

export class RegisterDeviceDto {
  token!: string;
  platform!: string;
  browser?: string;
  deviceName?: string;
}