import { AttendanceStatus, Prisma, WorkerShift, WorkerType } from '@prisma/client';

export const WORKER_INCLUDE = {
  project: { select: { id: true, name: true } },
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
  certifications: Prisma.JsonValue;
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

export function toWorkerView(worker: WorkerRecord, summary: WorkerAttendanceSummary): WorkerView {
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
    certifications: worker.certifications ?? [],
    ppeCompliant: worker.ppeCompliant,
    emergencyContact: worker.emergencyContact,
    isActive: worker.deactivatedAt === null,
    ...summary,
  };
}

export function deriveInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? `${words[0][0]}${words[words.length - 1][0]}` : (words[0] ?? '').slice(0, 2);
  return letters.toUpperCase();
}
