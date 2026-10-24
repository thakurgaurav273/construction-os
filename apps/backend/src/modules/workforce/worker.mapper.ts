import { AttendanceStatus, Prisma, WorkerCertification, WorkerShift, WorkerType } from '@prisma/client';
import { dbDateToKey } from './attendance-dates';
import { CertificationStatus, certificationState } from './certification-status';

export const WORKER_INCLUDE = {
  project: { select: { id: true, name: true } },
  certifications: { orderBy: [{ expiresOn: { sort: 'asc', nulls: 'last' } }, { name: 'asc' }] },
} satisfies Prisma.WorkerInclude;

type WorkerRecord = Prisma.WorkerGetPayload<{ include: typeof WORKER_INCLUDE }>;

export interface WorkerAttendanceSummary {
  todayStatus: AttendanceStatus | null;
  /** Share of marked days (excluding approved leave) the worker was on site; half days count half. */
  attendanceRate: number | null;
  lastCheckInAt: Date | null;
}

export const EMPTY_ATTENDANCE_SUMMARY: WorkerAttendanceSummary = {
  todayStatus: null,
  attendanceRate: null,
  lastCheckInAt: null,
};

export interface CertificationView {
  id: string;
  name: string;
  issuer: string | null;
  certificateNumber: string | null;
  /** Calendar days as YYYY-MM-DD. */
  issuedOn: string | null;
  expiresOn: string | null;
  status: CertificationStatus;
  daysToExpiry: number | null;
}

export interface WorkerView extends WorkerAttendanceSummary {
  id: string;
  name: string;
  initials: string;
  role: string;
  trade: string;
  type: WorkerType;
  shift: WorkerShift;
  phone: string | null;
  email: string | null;
  experienceYears: number;
  supervisor: string | null;
  projectId: string | null;
  project: string | null;
  skills: string[];
  certifications: CertificationView[];
  ppeCompliant: boolean;
  emergencyContact: Prisma.JsonValue;
  isActive: boolean;
}

export interface AttendanceHistoryItem {
  date: string;
  status: AttendanceStatus;
  checkInAt: Date | null;
  checkOutAt: Date | null;
  hoursWorked: number | null;
  project: { id: string; name: string };
}

export interface WorkerDetailView extends WorkerView {
  week: { date: string; status: AttendanceStatus | null }[];
  recentAttendance: AttendanceHistoryItem[];
}

/** `today` is the organization's calendar day, which decides each certificate's status. */
export function toWorkerView(worker: WorkerRecord, summary: WorkerAttendanceSummary, today: string): WorkerView {
  return {
    id: worker.id,
    name: worker.name,
    initials: worker.initials,
    role: worker.role,
    trade: worker.trade,
    type: worker.type,
    shift: worker.shift,
    phone: worker.phone,
    email: worker.email,
    experienceYears: worker.experienceYears,
    supervisor: worker.supervisor,
    projectId: worker.projectId,
    project: worker.project?.name ?? null,
    skills: worker.skills,
    certifications: worker.certifications.map((certification) => toCertificationView(certification, today)),
    ppeCompliant: worker.ppeCompliant,
    emergencyContact: worker.emergencyContact,
    isActive: worker.deactivatedAt === null,
    ...summary,
  };
}

export function toCertificationView(certification: WorkerCertification, today: string): CertificationView {
  return {
    id: certification.id,
    name: certification.name,
    issuer: certification.issuer,
    certificateNumber: certification.certificateNumber,
    issuedOn: certification.issuedOn ? dbDateToKey(certification.issuedOn) : null,
    expiresOn: certification.expiresOn ? dbDateToKey(certification.expiresOn) : null,
    ...certificationState(certification.expiresOn, today),
  };
}

export function deriveInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? `${words[0][0]}${words[words.length - 1][0]}` : (words[0] ?? '').slice(0, 2);
  return letters.toUpperCase();
}
