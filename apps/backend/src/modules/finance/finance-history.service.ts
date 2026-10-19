import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { InvoiceTimelineEvent } from './invoice.mapper';

export type FinanceActivityType = 'approval' | 'alert' | 'update';

export interface FinanceEvent {
  invoice: { id: string; invoiceNumber: string; projectId: string | null; organizationId: string };
  actorId: string;
  type: FinanceActivityType;
  title: string;
  description: string;
  paymentNumber?: string;
}

/**
 * Invoice and payment events are written to the shared activity feed against the invoice, so the project
 * timeline and the invoice's own history read from one immutable source.
 */
@Injectable()
export class FinanceHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async record(tx: Prisma.TransactionClient, event: FinanceEvent): Promise<void> {
    const { invoice, actorId, type, title, description, paymentNumber } = event;
    await tx.activity.create({
      data: {
        type,
        title,
        description,
        entityType: 'invoice',
        entityId: invoice.id,
        metadata: { invoiceNumber: invoice.invoiceNumber, ...(paymentNumber ? { paymentNumber } : {}) },
        actorId,
        projectId: invoice.projectId,
        organizationId: invoice.organizationId,
      },
    });
  }

  async timeline(invoiceId: string, organizationId: string): Promise<InvoiceTimelineEvent[]> {
    const events = await this.prisma.activity.findMany({
      where: { organizationId, entityType: 'invoice', entityId: invoiceId },
      include: { actor: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return events.map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      actor: event.actor.name,
      date: event.createdAt,
    }));
  }
}
