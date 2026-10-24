import { Injectable } from '@nestjs/common';
import type { HelpProgress, TourKey, TourProgress, TourStatus } from '@sitepilot/types';
import { PrismaService } from '../../database/prisma.service';
import { CHECKLIST_KEY, ChecklistSteps, TOUR_KEY_PREFIX, isTourKey } from './help-keys';

/** A member's own tour progress and the organization's getting-started checklist. */
@Injectable()
export class HelpService {
  constructor(private readonly prisma: PrismaService) {}

  async getProgress(userId: string, organizationId: string): Promise<HelpProgress> {
    const [rows, steps] = await Promise.all([
      this.prisma.helpProgress.findMany({ where: { userId, organizationId }, orderBy: { updatedAt: 'asc' } }),
      this.checklistSteps(organizationId),
    ]);
    const tours: TourProgress[] = rows.flatMap((row) => {
      const tour = row.key.slice(TOUR_KEY_PREFIX.length);
      if (!row.key.startsWith(TOUR_KEY_PREFIX) || !isTourKey(tour)) return [];
      return [{ tour, status: row.status, updatedAt: row.updatedAt.toISOString() }];
    });
    return { tours, checklist: { dismissed: rows.some((row) => row.key === CHECKLIST_KEY), steps } };
  }

  async setTourStatus(userId: string, organizationId: string, tour: TourKey, status: TourStatus): Promise<HelpProgress> {
    const key = `${TOUR_KEY_PREFIX}${tour}`;
    await this.prisma.helpProgress.upsert({
      where: { userId_organizationId_key: { userId, organizationId, key } },
      create: { userId, organizationId, key, status },
      update: { status },
    });
    return this.getProgress(userId, organizationId);
  }

  /** Forgets one tour (or every tour) so it plays again. */
  async restartTours(userId: string, organizationId: string, tour?: TourKey): Promise<HelpProgress> {
    await this.prisma.helpProgress.deleteMany({
      where: tour
        ? { userId, organizationId, key: `${TOUR_KEY_PREFIX}${tour}` }
        : { userId, organizationId, key: { startsWith: TOUR_KEY_PREFIX } },
    });
    return this.getProgress(userId, organizationId);
  }

  async setChecklistDismissed(userId: string, organizationId: string, dismissed: boolean): Promise<HelpProgress> {
    if (dismissed) {
      await this.prisma.helpProgress.upsert({
        where: { userId_organizationId_key: { userId, organizationId, key: CHECKLIST_KEY } },
        create: { userId, organizationId, key: CHECKLIST_KEY, status: 'SKIPPED' },
        update: {},
      });
    } else {
      await this.prisma.helpProgress.deleteMany({ where: { userId, organizationId, key: CHECKLIST_KEY } });
    }
    return this.getProgress(userId, organizationId);
  }

  /** Existence checks only, so the checklist stays cheap however much data an organization has. */
  private async checklistSteps(organizationId: string): Promise<ChecklistSteps> {
    const exists = (count: Promise<number>): Promise<boolean> => count.then((total) => total > 0);
    const [members, invitations, projects, reports, attendance, stores, orders, boqLines] = await Promise.all([
      this.prisma.userOrganization.count({ where: { organizationId }, take: 2 }),
      exists(this.prisma.invitation.count({ where: { organizationId }, take: 1 })),
      exists(this.prisma.project.count({ where: { organizationId }, take: 1 })),
      exists(this.prisma.dailyReport.count({ where: { organizationId, status: { not: 'DRAFT' } }, take: 1 })),
      exists(this.prisma.attendance.count({ where: { organizationId }, take: 1 })),
      exists(this.prisma.warehouse.count({ where: { organizationId }, take: 1 })),
      exists(this.prisma.purchaseOrder.count({ where: { organizationId }, take: 1 })),
      exists(this.prisma.contractItem.count({ where: { contract: { organizationId } }, take: 1 })),
    ]);
    return {
      // Sending an invitation counts: the step is about the owner reaching out, not the invitee's timing.
      'invite-team': members > 1 || invitations,
      'create-project': projects,
      'submit-daily-report': reports,
      'record-attendance': attendance,
      'add-store': stores,
      'raise-purchase-order': orders,
      'add-boq': boqLines,
    };
  }
}
