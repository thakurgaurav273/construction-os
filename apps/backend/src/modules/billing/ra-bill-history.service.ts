import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { billCode } from './contract.mapper';

export interface BillHistoryEntry {
  bill: { id: string; sequence: number; projectId: string; organizationId: string };
  actorId: string;
  stage: string;
  note?: string;
  /** Mirrors the event onto the project's activity feed. */
  activity?: { type: 'approval' | 'alert' | 'update'; title: string; description: string };
}

/** Single place that writes a bill's timeline and the matching project activity. */
@Injectable()
export class RaBillHistoryService {
  async record(tx: Prisma.TransactionClient, entry: BillHistoryEntry): Promise<void> {
    const { bill, actorId, stage, note, activity } = entry;
    const actor = await tx.user.findUnique({ where: { id: actorId }, select: { name: true } });
    await tx.raBillEvent.create({ data: { billId: bill.id, stage, actorName: actor?.name ?? 'Unknown user', note: note?.trim() ?? '' } });

    if (!activity) return;
    await tx.activity.create({
      data: {
        type: activity.type,
        title: activity.title,
        description: activity.description,
        entityType: 'ra_bill',
        entityId: bill.id,
        metadata: { billCode: billCode(bill.sequence) },
        actorId,
        projectId: bill.projectId,
        organizationId: bill.organizationId,
      },
    });
  }
}
