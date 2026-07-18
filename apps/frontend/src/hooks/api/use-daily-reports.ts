import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export interface DailyReport {
  id: string;
  projectId: string;
  date: string;
  weather: string | null;
  overallProgress: number | null;
  workCompleted: string | null;
  remarks: string | null;
  labourCount: number;
  status: 'DRAFT' | 'SUBMITTED';
  aiSummary: string | null;
  labourDetails: Record<string, unknown> | null;
  materialsConsumed: Record<string, unknown>[];
  equipmentUsed: Record<string, unknown>[];
  issues: Record<string, unknown>[];
  submittedBy: { id: string; name: string; avatar: string | null } | null;
  createdAt: string;
}

export interface CreateDailyReportInput {
  date?: string;
  weather?: string;
  overallProgress?: number;
  workCompleted?: string;
  remarks?: string;
  labourCount?: number;
  status?: 'DRAFT' | 'SUBMITTED';
  labourDetails?: Record<string, unknown>;
  materialsConsumed?: Record<string, unknown>[];
  equipmentUsed?: Record<string, unknown>[];
  issues?: Record<string, unknown>[];
}

export function useDailyReports(projectId: string) {
  return useQuery<DailyReport[]>({
    queryKey: ['daily-reports', projectId],
    queryFn: async () => {
      const res = await apiClient.get(`/projects/${projectId}/daily-reports`);
      return res.data.data ?? res.data;
    },
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

export function useDailyReport(projectId: string, reportId: string) {
  return useQuery<DailyReport>({
    queryKey: ['daily-report', projectId, reportId],
    queryFn: async () => {
      const res = await apiClient.get(`/projects/${projectId}/daily-reports/${reportId}`);
      return res.data.data ?? res.data;
    },
    enabled: !!projectId && !!reportId,
    staleTime: 30_000,
  });
}

export function useCreateDailyReport(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateDailyReportInput) => {
      const res = await apiClient.post(`/projects/${projectId}/daily-reports`, data);
      return res.data.data ?? res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily-reports', projectId] });
    },
  });
}
