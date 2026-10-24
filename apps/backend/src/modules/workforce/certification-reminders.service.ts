import { Injectable, Logger, OnApplicationBootstrap, OnModuleInit } from '@nestjs/common';
import { CertificationReminderStage, Prisma } from '@prisma/client';
import { JobsService } from '../../common/jobs';
import { PrismaService } from '../../database/prisma.service';
import { NotificationRecipientsService } from '../notifications/notification-recipients.service';
import { NotificationsService } from '../notifications/notifications.service';
import { toLocalDateKey, toLocalMinutes } from './attendance-dates';
import { resolveTimeZone } from './attendance-insights.service';
import { CERTIFICATION_WARNING_DAYS, certificationState, reminderDue } from './certification-status';

const REMINDER_JOB = 'workforce.certification-reminders';
const REMINDER_TICK_MS = 60 * 60 * 1000;
/** Reminders go out from this local hour, so nobody gets them in the middle of the night. */
const REMINDER_LOCAL_HOUR = 8;
const DAY_MS = 86_400_000;
/** The digest names this many certificates and counts the rest. */
const LISTED_PER_DIGEST = 5;

const CANDIDATE_SELECT = {
  id: true,
  name: true,
  expiresOn: true,
  remindedStage: true,
  organizationId: true,
  organization: { select: { timezone: true } },
  worker: { select: { name: true, projectId: true, project: { select: { name: true } } } },
} satisfies Prisma.WorkerCertificationSelect;

type Candidate = Prisma.WorkerCertificationGetPayload<{ select: typeof CANDIDATE_SELECT }>;

interface ClaimedReminder {
  certification: Candidate;
  stage: CertificationReminderStage;
  daysToExpiry: number;
}

/**
 * Tells workforce managers when a certificate is 30 days from expiry, in its final week, and once it has
 * expired: one digest per project (to its team where possible), each stage at most once per certificate.
 */
@Injectable()
export class CertificationRemindersService implements OnModuleInit, OnApplicationBootstrap {
  private readonly logger = new Logger(CertificationRemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobsService,
    private readonly notifications: NotificationsService,
    private readonly recipients: NotificationRecipientsService,
  ) {}

  onModuleInit(): void {
    this.jobs.register(REMINDER_JOB, async () => { await this.sendDueReminders(); });
    this.jobs.every(REMINDER_JOB, REMINDER_TICK_MS, {});
  }

  /** The hourly tick first fires an hour after start, so check once now too (claims make repeats harmless). */
  onApplicationBootstrap(): void {
    this.sendDueReminders().catch((error: unknown) => {
      this.logger.error('Certification reminders failed at startup', error instanceof Error ? error.stack : undefined);
    });
  }

  /** Returns how many certificates were reminded about. Safe to run as often as you like. */
  async sendDueReminders(now: Date = new Date()): Promise<number> {
    const claimed = await this.claimDueReminders(now);
    const groups = new Map<string, ClaimedReminder[]>();
    for (const reminder of claimed) {
      const key = `${reminder.certification.organizationId}:${reminder.certification.worker.projectId ?? ''}`;
      groups.set(key, [...(groups.get(key) ?? []), reminder]);
    }
    for (const reminders of groups.values()) {
      await this.sendDigest(reminders).catch((error: unknown) => {
        this.logger.error('Certification reminder failed', error instanceof Error ? error.stack : undefined);
      });
    }
    return claimed.length;
  }

  /**
   * Finds certificates that have reached a new stage and marks each one in a conditional update first, so two
   * instances (or an overlapping run) never remind about the same stage twice.
   */
  private async claimDueReminders(now: Date): Promise<ClaimedReminder[]> {
    const candidates = await this.prisma.workerCertification.findMany({
      where: {
        // A day of slack covers organizations whose calendar day is ahead of UTC.
        expiresOn: { not: null, lte: new Date(now.getTime() + (CERTIFICATION_WARNING_DAYS + 1) * DAY_MS) },
        OR: [{ remindedStage: null }, { remindedStage: { not: 'EXPIRED' } }],
        worker: { deactivatedAt: null },
      },
      select: CANDIDATE_SELECT,
    });

    const claimed: ClaimedReminder[] = [];
    for (const certification of candidates) {
      const timeZone = resolveTimeZone(certification.organization.timezone);
      if (toLocalMinutes(now, timeZone) < REMINDER_LOCAL_HOUR * 60) continue;
      const today = toLocalDateKey(now, timeZone);
      const stage = reminderDue(certification.expiresOn, certification.remindedStage, today);
      if (!stage) continue;

      const { count } = await this.prisma.workerCertification.updateMany({
        where: { id: certification.id, remindedStage: certification.remindedStage, expiresOn: certification.expiresOn },
        data: { remindedStage: stage },
      });
      if (count === 1) {
        claimed.push({ certification, stage, daysToExpiry: certificationState(certification.expiresOn, today).daysToExpiry ?? 0 });
      }
    }
    return claimed;
  }

  private async sendDigest(reminders: ClaimedReminder[]): Promise<void> {
    const [first] = reminders;
    const { organizationId, worker } = first.certification;
    const recipients = await this.recipients.withPermission('workforce.manage', organizationId, null, worker.projectId);
    const ordered = [...reminders].sort((a, b) => a.daysToExpiry - b.daysToExpiry);
    const anyExpired = ordered.some((reminder) => reminder.stage === 'EXPIRED');
    const where = worker.project ? ` on ${worker.project.name}` : '';

    const title = ordered.length === 1
      ? `${first.certification.worker.name}'s ${first.certification.name} ${expiryPhrase(first.daysToExpiry)}`
      : `${ordered.length} certificates${where} need renewal`;
    const listed = ordered.slice(0, LISTED_PER_DIGEST);
    const lines = groupByWorker(listed).map(([workerName, items]) => (
      `${workerName}: ${items.map((reminder) => `${reminder.certification.name} ${expiryPhrase(reminder.daysToExpiry)}`).join(', ')}`
    ));
    const more = ordered.length - listed.length;
    const body = ordered.length === 1
      ? `Renew it${where} before ${anyExpired ? 'they work on site again' : 'it lapses'}, then update the dates on the worker's record.`
      : `${lines.join('; ')}${more > 0 ? `; and ${more} more` : ''}.`;

    await this.notifications.send(
      {
        organizationId,
        event: 'workforce.certification_reminder',
        entityType: 'worker_certification',
        entityId: ordered.length === 1 ? first.certification.id : null,
      },
      { recipients, category: 'reminders', type: anyExpired ? 'ERROR' : 'WARNING', title, body, link: '/dashboard/workforce' },
    );
  }
}

/** Keeps the urgency order, with each worker's certificates together under the worker's first (most urgent) one. */
function groupByWorker(reminders: ClaimedReminder[]): [string, ClaimedReminder[]][] {
  const groups = new Map<string, ClaimedReminder[]>();
  for (const reminder of reminders) {
    const name = reminder.certification.worker.name;
    groups.set(name, [...(groups.get(name) ?? []), reminder]);
  }
  return [...groups.entries()];
}

/** "expires in 6 days", "expires today", "expired 3 days ago". */
export function expiryPhrase(daysToExpiry: number): string {
  if (daysToExpiry === 0) return 'expires today';
  if (daysToExpiry > 0) return `expires in ${daysToExpiry} day${daysToExpiry === 1 ? '' : 's'}`;
  return `expired ${-daysToExpiry} day${daysToExpiry === -1 ? '' : 's'} ago`;
}
