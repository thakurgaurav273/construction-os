import type { CertificationReminderStage } from '@prisma/client';
import { dateKeyToDbDate, dbDateToKey } from './attendance-dates';

export type CertificationStatus = 'valid' | 'expiring' | 'expired';

/** A certificate expiring within this many days is flagged for renewal. */
export const CERTIFICATION_WARNING_DAYS = 30;

const DAY_MS = 86_400_000;

export interface CertificationState {
  status: CertificationStatus;
  /** Whole days left until it expires (0 on its last valid day, negative once expired); null if it never expires. */
  daysToExpiry: number | null;
}

/**
 * Status on a given calendar day (`today` as YYYY-MM-DD in the organization's time zone). A certificate is
 * valid through the end of its expiry day.
 */
export function certificationState(expiresOn: Date | null, today: string): CertificationState {
  if (!expiresOn) return { status: 'valid', daysToExpiry: null };
  const daysToExpiry = Math.round((dateKeyToDbDate(dbDateToKey(expiresOn)).getTime() - dateKeyToDbDate(today).getTime()) / DAY_MS);
  if (daysToExpiry < 0) return { status: 'expired', daysToExpiry };
  if (daysToExpiry <= CERTIFICATION_WARNING_DAYS) return { status: 'expiring', daysToExpiry };
  return { status: 'valid', daysToExpiry };
}

/** Counts workers with at least one expiring and at least one expired certificate. */
export function countCertificationIssues(
  workers: { certifications: { expiresOn: Date | null }[] }[],
  today: string,
): { expiring: number; expired: number } {
  const statuses = workers.map((worker) => worker.certifications.map((certification) => certificationState(certification.expiresOn, today).status));
  return {
    expiring: statuses.filter((list) => list.includes('expiring')).length,
    expired: statuses.filter((list) => list.includes('expired')).length,
  };
}

/** One line per certificate that needs attention on `asOf`, e.g. "First Aid & CPR expired on 2026-08-05". */
export function describeCertificationIssues(certifications: { name: string; expiresOn: Date | null }[], asOf: string): string[] {
  return certifications.flatMap((certification) => {
    const { status } = certificationState(certification.expiresOn, asOf);
    if (status === 'valid' || !certification.expiresOn) return [];
    const day = dbDateToKey(certification.expiresOn);
    return [status === 'expired' ? `${certification.name} expired on ${day}` : `${certification.name} expires on ${day}`];
  });
}

/** Reports judge certificates at the end of their period, or today for a period still running. */
export function reportReferenceDay(periodEnd: Date, now: Date = new Date()): string {
  return dbDateToKey(periodEnd < now ? periodEnd : now);
}

/** The last week before expiry gets its own, more urgent reminder. */
export const CERTIFICATION_FINAL_WEEK_DAYS = 7;

const REMINDER_ORDER: CertificationReminderStage[] = ['EXPIRING_SOON', 'EXPIRING_THIS_WEEK', 'EXPIRED'];

/** Which reminder a certificate has reached on `today`, if any. */
export function reminderStage(expiresOn: Date | null, today: string): CertificationReminderStage | null {
  const { status, daysToExpiry } = certificationState(expiresOn, today);
  if (status === 'expired') return 'EXPIRED';
  if (daysToExpiry !== null && daysToExpiry <= CERTIFICATION_FINAL_WEEK_DAYS) return 'EXPIRING_THIS_WEEK';
  if (status === 'expiring') return 'EXPIRING_SOON';
  return null;
}

/**
 * The reminder to send now: the stage reached, if it is past the one already sent. A certificate added
 * three days before expiry goes straight to the final-week reminder; nothing is ever sent twice.
 */
export function reminderDue(
  expiresOn: Date | null,
  alreadySent: CertificationReminderStage | null,
  today: string,
): CertificationReminderStage | null {
  const reached = reminderStage(expiresOn, today);
  if (!reached) return null;
  if (alreadySent && REMINDER_ORDER.indexOf(reached) <= REMINDER_ORDER.indexOf(alreadySent)) return null;
  return reached;
}
