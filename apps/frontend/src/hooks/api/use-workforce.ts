import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export type AttendanceStatus = 'PRESENT' | 'LATE' | 'HALF_DAY' | 'ABSENT' | 'ON_LEAVE';
export type WorkerType = 'EMPLOYEE' | 'SUBCONTRACTOR';
export type WorkerShift = 'DAY' | 'NIGHT';
export type CertStatus = 'valid' | 'expiring' | 'expired';

/** Status is worked out by the API from the expiry date and the organization's today. */
export interface Certification {
  id: string;
  name: string;
  issuer: string | null;
  certificateNumber: string | null;
  /** Calendar days as YYYY-MM-DD. */
  issuedOn: string | null;
  expiresOn: string | null;
  status: CertStatus;
  /** Days left (0 on the last valid day, negative once expired); null when it never expires. */
  daysToExpiry: number | null;
}

export interface CertificationInput {
  name: string;
  issuer: string | null;
  certificateNumber: string | null;
  issuedOn: string | null;
  expiresOn: string | null;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relation: string;
}

export interface Worker {
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
  certifications: Certification[];
  ppeCompliant: boolean;
  emergencyContact: EmergencyContact | null;
  isActive: boolean;
  todayStatus: AttendanceStatus | null;
  attendanceRate: number | null;
  lastCheckInAt: string | null;
}

export interface AttendanceHistoryItem {
  date: string;
  status: AttendanceStatus;
  checkInAt: string | null;
  checkOutAt: string | null;
  hoursWorked: number | null;
  project: { id: string; name: string };
}

export interface WorkerDetail extends Worker {
  week: { date: string; status: AttendanceStatus | null }[];
  recentAttendance: AttendanceHistoryItem[];
}

export interface WorkforceStats {
  total: number;
  presentToday: number;
  lateToday: number;
  absentToday: number;
  onLeaveToday: number;
  notMarkedToday: number;
  subcontractors: number;
  safetyCompliance: number;
  /** Workers with a certificate expiring within 30 days. */
  expiringCerts: number;
  /** Workers with at least one expired certificate. */
  expiredCerts: number;
  attendanceRate7d: number | null;
}

export interface AttendanceCounts {
  present: number;
  late: number;
  halfDay: number;
  absent: number;
  onLeave: number;
}

export interface AttendanceTrend {
  daily: (AttendanceCounts & { date: string })[];
  weekly: { weekStart: string; weekEnd: string; onSite: number; absent: number; attendanceRate: number | null }[];
}

export interface RosterWorker {
  id: string;
  name: string;
  initials: string;
  role: string;
  trade: string;
  type: WorkerType;
  shift: WorkerShift;
}

export interface AttendanceRecord {
  id: string;
  workerId: string;
  status: AttendanceStatus;
  checkInAt: string | null;
  checkOutAt: string | null;
  hoursWorked: number | null;
  notes: string | null;
  markedBy: { id: string; name: string };
}

export interface AttendanceRoster {
  date: string;
  isToday: boolean;
  summary: AttendanceCounts & { total: number; notMarked: number };
  entries: { worker: RosterWorker; record: AttendanceRecord | null }[];
}

export interface WorkerInput {
  name: string;
  role: string;
  trade: string;
  type: WorkerType;
  shift: WorkerShift;
  phone: string | null;
  email: string | null;
  experienceYears: number;
  supervisor: string | null;
  projectId: string | null;
  skills: string[];
  ppeCompliant: boolean;
  emergencyContact: EmergencyContact | null;
}

export interface MarkAttendanceInput {
  date: string;
  entries: { workerId: string; status: AttendanceStatus; notes?: string | null }[];
}

function unwrap<T>(res: { data: { data?: T } & T }): T {
  return res.data.data ?? res.data;
}

/** Attendance changes ripple into worker rows, stats, trends, rosters and the dashboard. */
function invalidateWorkforce(qc: QueryClient): void {
  qc.invalidateQueries({ queryKey: ['workforce'] });
  qc.invalidateQueries({ queryKey: ['attendance'] });
  qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
}

export function useWorkforce({ includeInactive = false }: { includeInactive?: boolean } = {}) {
  return useQuery<Worker[]>({
    queryKey: ['workforce', 'list', { includeInactive }],
    queryFn: async () => unwrap(await apiClient.get('/workforce', { params: { includeInactive: String(includeInactive) } })),
    staleTime: 30_000,
  });
}

export function useWorker(workerId: string | null) {
  return useQuery<WorkerDetail>({
    queryKey: ['workforce', 'detail', workerId],
    queryFn: async () => unwrap(await apiClient.get(`/workforce/${workerId}`)),
    enabled: !!workerId,
    staleTime: 30_000,
  });
}

export function useWorkforceStats(projectId?: string) {
  return useQuery<WorkforceStats>({
    queryKey: ['workforce', 'stats', projectId ?? 'all'],
    queryFn: async () => unwrap(await apiClient.get('/workforce/stats', { params: { projectId } })),
    staleTime: 30_000,
  });
}

export function useAttendanceTrend(projectId?: string) {
  return useQuery<AttendanceTrend>({
    queryKey: ['workforce', 'trend', projectId ?? 'all'],
    queryFn: async () => unwrap(await apiClient.get('/workforce/attendance/trend', { params: { projectId } })),
    staleTime: 60_000,
  });
}

export function useProjectWorkforce(projectId: string) {
  return useQuery<Worker[]>({
    queryKey: ['workforce', 'project', projectId],
    queryFn: async () => unwrap(await apiClient.get(`/projects/${projectId}/workforce`)),
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

export function useProjectWorkforceStats(projectId: string) {
  return useWorkforceStats(projectId);
}

export function useAttendanceRoster(projectId: string | null, date?: string) {
  return useQuery<AttendanceRoster>({
    queryKey: ['attendance', projectId, date ?? 'today'],
    queryFn: async () => unwrap(await apiClient.get(`/projects/${projectId}/attendance`, { params: { date } })),
    enabled: !!projectId,
    staleTime: 15_000,
  });
}

export function useMarkAttendance(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: MarkAttendanceInput): Promise<AttendanceRoster> =>
      unwrap(await apiClient.put(`/projects/${projectId}/attendance`, input)),
    onSuccess: () => {
      invalidateWorkforce(qc);
      qc.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

export function useShiftEvent(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ workerId, event }: { workerId: string; event: 'check-in' | 'check-out' }): Promise<AttendanceRecord> =>
      unwrap(await apiClient.post(`/projects/${projectId}/attendance/${event}`, { workerId })),
    onSuccess: () => invalidateWorkforce(qc),
  });
}

export function useCreateWorker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: WorkerInput): Promise<WorkerDetail> => unwrap(await apiClient.post('/workforce', input)),
    onSuccess: () => invalidateWorkforce(qc),
  });
}

export function useUpdateWorker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ workerId, input }: { workerId: string; input: Partial<WorkerInput> }): Promise<WorkerDetail> =>
      unwrap(await apiClient.patch(`/workforce/${workerId}`, input)),
    onSuccess: () => invalidateWorkforce(qc),
  });
}

export function useSetWorkerActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ workerId, active }: { workerId: string; active: boolean }): Promise<WorkerDetail> =>
      unwrap(await apiClient.post(`/workforce/${workerId}/${active ? 'reactivate' : 'deactivate'}`)),
    onSuccess: () => invalidateWorkforce(qc),
  });
}

export function useAddCertification(workerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CertificationInput): Promise<WorkerDetail> =>
      unwrap(await apiClient.post(`/workforce/${workerId}/certifications`, input)),
    onSuccess: () => invalidateWorkforce(qc),
  });
}

export function useUpdateCertification(workerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ certificationId, input }: { certificationId: string; input: CertificationInput }): Promise<WorkerDetail> =>
      unwrap(await apiClient.patch(`/workforce/${workerId}/certifications/${certificationId}`, input)),
    onSuccess: () => invalidateWorkforce(qc),
  });
}

export function useRemoveCertification(workerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (certificationId: string): Promise<WorkerDetail> =>
      unwrap(await apiClient.delete(`/workforce/${workerId}/certifications/${certificationId}`)),
    onSuccess: () => invalidateWorkforce(qc),
  });
}
