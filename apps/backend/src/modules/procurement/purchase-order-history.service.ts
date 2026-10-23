import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export type ProcurementActivityType = 'approval' | 'alert' | 'update';

export interface HistoryEntry {
  order: { id: string; poNumber: string; projectId: string | null; organizationId: string };
  actorId: string;
  stage: string;
  note?: string;
  /** Mirrors the event onto the project's activity feed. */
  activity?: { type: ProcurementActivityType; title: string; description: string };
}

/** Single place that writes a purchase order's timeline and the matching project activity. */
@Injectable()
export class PurchaseOrderHistoryService {
  async record(tx: Prisma.TransactionClient, entry: HistoryEntry): Promise<void> {
    const { order, actorId, stage, note, activity } = entry;
    const [actor, position] = await Promise.all([
      tx.user.findUnique({ where: { id: actorId }, select: { name: true } }),
      tx.poApprovalStep.count({ where: { purchaseOrderId: order.id } }),
    ]);

    await tx.poApprovalStep.create({
      data: {
        purchaseOrderId: order.id,
        stage,
        actor: actor?.name ?? 'Unknown user',
        note: note?.trim() ?? '',
        sortOrder: position,
      },
    });

    if (!activity) return;
    await tx.activity.create({
      data: {
        type: activity.type,
        title: activity.title,
        description: activity.description,
        entityType: 'purchase_order',
        entityId: order.id,
        metadata: { poNumber: order.poNumber },
        actorId,
        projectId: order.projectId,
        organizationId: order.organizationId,
      },
    });
  }
}

export function formatRupees(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}
