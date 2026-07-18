import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface GeneratedReport {
  id: string;
  name: string;
  type: string;
  format: string;
  status: string;
  fileUrl?: string;
  fileSize?: number;
  generatedBy: string;
  generatedAt: string;
  project?: { id: string; name: string };
}

export interface ReportSchedule {
  id: string;
  name: string;
  frequency: string;
  projects: string[];
  recipients: string[];
  enabled: boolean;
  lastRunAt?: string;
  nextRunAt: string;
}

export function useReportTemplates() {
  return useQuery<ReportTemplate[]>({
    queryKey: ['reports', 'templates'],
    queryFn: async () => {
      const res = await apiClient.get('/reports/templates');
      return res.data.data ?? res.data;
    },
  });
}

export function useReportHistory(options?: { page?: number; limit?: number }) {
  return useQuery<{ data: GeneratedReport[]; total: number; page: number; limit: number }>({
    queryKey: ['reports', 'history', options],
    queryFn: async () => {
      const res = await apiClient.get('/reports/history', { params: options });
      return res.data.data ?? res.data;
    },
  });
}

export function useReportSchedules() {
  return useQuery<ReportSchedule[]>({
    queryKey: ['reports', 'schedules'],
    queryFn: async () => {
      const res = await apiClient.get('/reports/schedule');
      return res.data.data ?? res.data;
    },
  });
}

export function useGenerateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { type: string; name: string; format?: string; projectIds?: string[] }) => {
      const res = await apiClient.post('/reports/generate', { ...data, format: data.format ?? 'PDF' });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', 'history'] });
    },
  });
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { reportId: string; name: string; frequency: string; recipients: string[]; nextRunAt: string }) => {
      const res = await apiClient.post('/reports/schedule', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', 'schedules'] });
    },
  });
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/reports/schedule/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', 'schedules'] });
    },
  });
}

export function useDeleteReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/reports/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', 'history'] });
    },
  });
}