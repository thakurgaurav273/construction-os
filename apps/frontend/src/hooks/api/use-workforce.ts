import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type { Worker } from '@/data/workforce-demo';

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
