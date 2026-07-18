import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export interface Worker {
  id: string;
  name: string;
  initials: string;
  role: string;
  trade: string;
  type: 'Employee' | 'Subcontractor';
  phone: string | null;
  email: string | null;
  status: 'active' | 'late' | 'absent' | 'on_leave';
  experienceYears: number;
  shift: 'Day' | 'Night';
  attendancePercent: number;
  lastCheckIn: string | null;
  supervisor: string | null;
  projectId: string | null;
  project: string | null;
  skills: string[];
  certifications: { name: string; expiryDate: string; status: 'valid' | 'expiring' | 'expired' }[];
  ppeCompliant: boolean;
  weeklyAttendance: { day: string; present: boolean; late: boolean }[] | null;
  recentActivity: { action: string; time: string; type: string }[] | null;
  emergencyContact: { name: string; phone: string; relation: string } | null;
}

export interface WorkforceStats {
  total: number;
  presentToday: number;
  absentToday: number;
  subcontractors: number;
  safetyCompliance: number;
  expiringCerts: number;
}

export function useWorkforce() {
  return useQuery<Worker[]>({
    queryKey: ['workforce'],
    queryFn: async () => {
      const res = await apiClient.get('/workforce');
      return res.data.data ?? res.data;
    },
    staleTime: 30_000,
  });
}

export function useWorkforceStats() {
  return useQuery<WorkforceStats>({
    queryKey: ['workforce', 'stats'],
    queryFn: async () => {
      const res = await apiClient.get('/workforce/stats');
      return res.data.data ?? res.data;
    },
    staleTime: 30_000,
  });
}

export function useProjectWorkforce(projectId: string) {
  return useQuery<Worker[]>({
    queryKey: ['workforce', 'project', projectId],
    queryFn: async () => {
      const res = await apiClient.get(`/projects/${projectId}/workforce`);
      return res.data.data ?? res.data;
    },
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

export function useProjectWorkforceStats(projectId: string) {
  return useQuery<WorkforceStats>({
    queryKey: ['workforce', 'project', projectId, 'stats'],
    queryFn: async () => {
      const res = await apiClient.get(`/projects/${projectId}/workforce/stats`);
      return res.data.data ?? res.data;
    },
    enabled: !!projectId,
    staleTime: 30_000,
  });
}
