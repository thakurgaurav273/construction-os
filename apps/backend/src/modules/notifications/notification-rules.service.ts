import { Injectable, OnModuleInit } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditAction } from '../../common/audit';
import { DomainEvent, DomainEventsService } from '../../common/events';
import { NotificationCategory } from './notification-categories';
import { NotificationRecipientsService } from './notification-recipients.service';
import { NotificationsService } from './notifications.service';

/** One message to a group of people about one event. */
export interface NotificationPlan {
  recipients: string[];
  category: NotificationCategory;
  type: NotificationType;
  title: string;
  body: string;
  link: string;
}

type Rule = (event: DomainEvent) => Promise<NotificationPlan[]>;

function reviewNote(event: DomainEvent): string {
  const metadata = event.metadata as { input?: { note?: unknown } } | null;
  const note = typeof metadata?.input?.note === 'string' ? metadata.input.note.trim() : '';
  return note ? ` Note: "${note}"` : '';
}

function addedUserId(event: DomainEvent): string | null {
  const metadata = event.metadata as { input?: { userId?: unknown } } | null;
  return typeof metadata?.input?.userId === 'string' ? metadata.input.userId : null;
}

function formatDay(date: Date): string {
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/**
 * Turns domain events into notifications: who needs to act, and who needs to hear the outcome of something
 * they asked for. New rules only need an entry in `rules`.
 */
@Injectable()
export class NotificationRulesService implements OnModuleInit {
  private readonly rules: Partial<Record<AuditAction, Rule>> = {
    'purchase_order.submitted': (event) => this.purchaseOrderSubmitted(event),
    'purchase_order.approved': (event) => this.purchaseOrderDecided(event, NotificationType.SUCCESS, 'approved'),
    'purchase_order.rejected': (event) => this.purchaseOrderDecided(event, NotificationType.ERROR, 'rejected'),
    'purchase_order.changes_requested': (event) => this.purchaseOrderDecided(event, NotificationType.WARNING, 'sent back for changes'),
    'daily_report.submitted': (event) => this.dailyReportSubmitted(event),
    'daily_report.approved': (event) => this.dailyReportDecided(event, NotificationType.SUCCESS, 'approved'),
    'daily_report.rejected': (event) => this.dailyReportDecided(event, NotificationType.WARNING, 'sent back'),
    'invoice.submitted': (event) => this.invoiceSubmitted(event),
    'invoice.approved': (event) => this.invoiceDecided(event, NotificationType.SUCCESS, 'approved'),
    'invoice.rejected': (event) => this.invoiceDecided(event, NotificationType.ERROR, 'rejected'),
    'payment.requested': (event) => this.paymentRequested(event),
    'payment.approved': (event) => this.paymentApproved(event),
    'payment.rejected': (event) => this.paymentDecided(event, NotificationType.ERROR, 'rejected'),
    'payment.released': (event) => this.paymentDecided(event, NotificationType.SUCCESS, 'released'),
    'transfer.requested': (event) => this.transferRequested(event),
    'transfer.approved': (event) => this.transferDecided(event, NotificationType.SUCCESS, 'approved'),
    'transfer.rejected': (event) => this.transferDecided(event, NotificationType.ERROR, 'rejected'),
    'transfer.received': (event) => this.transferDecided(event, NotificationType.SUCCESS, 'received'),
    'member.role_changed': (event) => this.roleChanged(event),
    'project.member_added': (event) => this.addedToProject(event),
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: DomainEventsService,
    private readonly recipients: NotificationRecipientsService,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit(): void {
    this.events.subscribe(async (event) => {
      const rule = this.rules[event.action];
      if (!rule || !event.entityId) return;
      const plans = await rule(event);
      for (const plan of plans) await this.notifications.deliver(event, plan);
    });
  }

  private async purchaseOrderSubmitted(event: DomainEvent): Promise<NotificationPlan[]> {
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id: event.entityId ?? '' },
      select: { poNumber: true, projectId: true, vendor: { select: { name: true } } },
    });
    if (!order) return [];
    return [{
      recipients: await this.recipients.withPermission('po.approve', event.organizationId, event.actorId, order.projectId),
      category: 'approvals',
      type: NotificationType.INFO,
      title: `${order.poNumber} needs your approval`,
      body: `${event.actorName} submitted ${order.poNumber}${order.vendor ? ` for ${order.vendor.name}` : ''}.`,
      link: '/dashboard/procurement',
    }];
  }

  private async purchaseOrderDecided(event: DomainEvent, type: NotificationType, verb: string): Promise<NotificationPlan[]> {
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id: event.entityId ?? '' },
      select: { poNumber: true, requestedById: true },
    });
    if (!order) return [];
    return [{
      recipients: this.recipients.only(order.requestedById, event.actorId),
      category: 'decisions',
      type,
      title: `${order.poNumber} ${verb}`,
      body: `${event.actorName} ${verb} your purchase order ${order.poNumber}.${reviewNote(event)}`,
      link: '/dashboard/procurement',
    }];
  }

  private async dailyReportSubmitted(event: DomainEvent): Promise<NotificationPlan[]> {
    const report = await this.prisma.dailyReport.findUnique({
      where: { id: event.entityId ?? '' },
      select: { date: true, projectId: true, project: { select: { name: true } } },
    });
    if (!report) return [];
    return [{
      recipients: await this.recipients.withPermission('dailyReport.approve', event.organizationId, event.actorId, report.projectId),
      category: 'approvals',
      type: NotificationType.INFO,
      title: `Daily report for ${formatDay(report.date)} awaits review`,
      body: `${event.actorName} submitted the ${report.project.name} site report.`,
      link: `/dashboard/projects/${report.projectId}/daily-reports/${event.entityId}`,
    }];
  }

  private async dailyReportDecided(event: DomainEvent, type: NotificationType, verb: string): Promise<NotificationPlan[]> {
    const report = await this.prisma.dailyReport.findUnique({
      where: { id: event.entityId ?? '' },
      select: { date: true, projectId: true, submittedById: true, project: { select: { name: true } } },
    });
    if (!report) return [];
    return [{
      recipients: this.recipients.only(report.submittedById, event.actorId),
      category: 'decisions',
      type,
      title: `Daily report ${verb}`,
      body: `${event.actorName} ${verb} your ${report.project.name} report for ${formatDay(report.date)}.${reviewNote(event)}`,
      link: `/dashboard/projects/${report.projectId}/daily-reports/${event.entityId}`,
    }];
  }

  private async invoiceSubmitted(event: DomainEvent): Promise<NotificationPlan[]> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: event.entityId ?? '' },
      select: { invoiceNumber: true, vendorName: true, projectId: true },
    });
    if (!invoice) return [];
    return [{
      recipients: await this.recipients.withPermission('invoice.approve', event.organizationId, event.actorId, invoice.projectId),
      category: 'approvals',
      type: NotificationType.INFO,
      title: `Bill ${invoice.invoiceNumber} needs approval`,
      body: `${event.actorName} submitted ${invoice.vendorName}'s bill ${invoice.invoiceNumber}.`,
      link: '/dashboard/finance',
    }];
  }

  private async invoiceDecided(event: DomainEvent, type: NotificationType, verb: string): Promise<NotificationPlan[]> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: event.entityId ?? '' },
      select: { invoiceNumber: true, vendorName: true, createdById: true },
    });
    if (!invoice) return [];
    return [{
      recipients: this.recipients.only(invoice.createdById, event.actorId),
      category: 'decisions',
      type,
      title: `Bill ${invoice.invoiceNumber} ${verb}`,
      body: `${event.actorName} ${verb} ${invoice.vendorName}'s bill ${invoice.invoiceNumber}.${reviewNote(event)}`,
      link: '/dashboard/finance',
    }];
  }

  private async findPayment(id: string | null): Promise<{ paymentNumber: string; vendorName: string; requestedById: string | null } | null> {
    return this.prisma.payment.findUnique({
      where: { id: id ?? '' },
      select: { paymentNumber: true, vendorName: true, requestedById: true },
    });
  }

  private async paymentRequested(event: DomainEvent): Promise<NotificationPlan[]> {
    const payment = await this.findPayment(event.entityId);
    if (!payment) return [];
    return [{
      recipients: await this.recipients.withPermission('payment.approve', event.organizationId, event.actorId),
      category: 'approvals',
      type: NotificationType.INFO,
      title: `Payment ${payment.paymentNumber} needs approval`,
      body: `${event.actorName} requested a payment to ${payment.vendorName}.`,
      link: '/dashboard/finance',
    }];
  }

  /** The requester hears it was approved; whoever releases money hears there's a payment to make. */
  private async paymentApproved(event: DomainEvent): Promise<NotificationPlan[]> {
    const payment = await this.findPayment(event.entityId);
    if (!payment) return [];
    const releasers = await this.recipients.withPermission('payment.release', event.organizationId, event.actorId);
    return [
      ...(await this.paymentDecided(event, NotificationType.SUCCESS, 'approved')),
      {
        recipients: releasers.filter((userId) => userId !== payment.requestedById),
        category: 'approvals',
        type: NotificationType.INFO,
        title: `Payment ${payment.paymentNumber} is ready to release`,
        body: `${event.actorName} approved the payment to ${payment.vendorName}.`,
        link: '/dashboard/finance',
      },
    ];
  }

  private async paymentDecided(event: DomainEvent, type: NotificationType, verb: string): Promise<NotificationPlan[]> {
    const payment = await this.findPayment(event.entityId);
    if (!payment) return [];
    return [{
      recipients: this.recipients.only(payment.requestedById, event.actorId),
      category: 'decisions',
      type,
      title: `Payment ${payment.paymentNumber} ${verb}`,
      body: `${event.actorName} ${verb} the payment to ${payment.vendorName}.${reviewNote(event)}`,
      link: '/dashboard/finance',
    }];
  }

  private async transferRequested(event: DomainEvent): Promise<NotificationPlan[]> {
    const transfer = await this.prisma.stockTransfer.findUnique({
      where: { id: event.entityId ?? '' },
      select: { code: true, fromWarehouse: { select: { name: true } }, toWarehouse: { select: { name: true } } },
    });
    if (!transfer) return [];
    return [{
      recipients: await this.recipients.withPermission('inventory.transfer', event.organizationId, event.actorId),
      category: 'approvals',
      type: NotificationType.INFO,
      title: `${transfer.code} needs approval`,
      body: `${event.actorName} requested stock from ${transfer.fromWarehouse.name} to ${transfer.toWarehouse.name}.`,
      link: '/dashboard/inventory',
    }];
  }

  private async transferDecided(event: DomainEvent, type: NotificationType, verb: string): Promise<NotificationPlan[]> {
    const transfer = await this.prisma.stockTransfer.findUnique({
      where: { id: event.entityId ?? '' },
      select: { code: true, requestedById: true, toWarehouse: { select: { name: true } } },
    });
    if (!transfer) return [];
    return [{
      recipients: this.recipients.only(transfer.requestedById, event.actorId),
      category: 'decisions',
      type,
      title: `${transfer.code} ${verb}`,
      body: `${event.actorName} ${verb} your transfer to ${transfer.toWarehouse.name}.${reviewNote(event)}`,
      link: '/dashboard/inventory',
    }];
  }

  private async roleChanged(event: DomainEvent): Promise<NotificationPlan[]> {
    const membership = await this.prisma.userOrganization.findFirst({
      where: { userId: event.entityId ?? '', organizationId: event.organizationId },
      select: { userId: true, role: true },
    });
    if (!membership) return [];
    return [{
      recipients: this.recipients.only(membership.userId, event.actorId),
      category: 'team',
      type: NotificationType.INFO,
      title: 'Your role changed',
      body: `${event.actorName} changed your role to ${membership.role.replace(/_/g, ' ').toLowerCase()}.`,
      link: '/dashboard',
    }];
  }

  private async addedToProject(event: DomainEvent): Promise<NotificationPlan[]> {
    const project = await this.prisma.project.findUnique({ where: { id: event.entityId ?? '' }, select: { id: true, name: true } });
    if (!project) return [];
    return [{
      recipients: this.recipients.only(addedUserId(event), event.actorId),
      category: 'team',
      type: NotificationType.INFO,
      title: `You were added to ${project.name}`,
      body: `${event.actorName} added you to the project team.`,
      link: `/dashboard/projects/${project.id}`,
    }];
  }
}
