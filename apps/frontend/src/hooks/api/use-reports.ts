import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { isInProgress } from '@/features/reports/report-presentation';
import type {
  GenerateReportInput, GeneratedReport, GeneratedReportDetail, ReportPage, ReportSchedule, ReportTemplate, ScheduleInput,
} from '@/features/reports/types';

function unwrap<T>(res: { data: { data?: T } & T }): T {
  return res.data.data ?? res.data;
}

/** While a report is queued or generating, its list and detail refresh until the files are ready. */
const POLL_MS = 3_000;

function useReportsMutation<TInput, TResult>(request: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function useReportTemplates() {
  return useQuery<ReportTemplate[]>({
    queryKey: ['reports', 'templates'],
    queryFn: async () => unwrap(await apiClient.get('/reports/templates')),
    staleTime: 5 * 60_000,
  });
}

export function useReportHistory(page = 1, limit = 20) {
  return useQuery<ReportPage>({
    queryKey: ['reports', 'history', page, limit],
    queryFn: async () => unwrap(await apiClient.get('/reports/history', { params: { page, limit } })),
    refetchInterval: (query) => (query.state.data?.items.some((report) => isInProgress(report.status)) ? POLL_MS : false),
  });
}

export function useReport(id: string | null) {
  return useQuery<GeneratedReportDetail>({
    queryKey: ['reports', 'detail', id],
    queryFn: async () => unwrap(await apiClient.get(`/reports/${id}`)),
    enabled: Boolean(id),
    refetchInterval: (query) => (query.state.data && isInProgress(query.state.data.status) ? POLL_MS : false),
  });
}

export function useReportSchedules() {
  return useQuery<ReportSchedule[]>({
    queryKey: ['reports', 'schedules'],
    queryFn: async () => unwrap(await apiClient.get('/reports/schedule')),
    // A schedule that is running reports back once its email has gone out.
    refetchInterval: (query) => (query.state.data?.some((schedule) => schedule.lastStatus === 'GENERATING') ? POLL_MS : false),
  });
}

export function useGenerateReport() {
  return useReportsMutation(async (input: GenerateReportInput) => unwrap<GeneratedReport>(await apiClient.post('/reports/generate', input)));
}

/** Download links are signed and short-lived, so each click asks for a fresh one. */
export function useDownloadReport() {
  return useMutation({
    mutationFn: async ({ id, format }: { id: string; format: 'pdf' | 'excel' }) => {
      const link = unwrap<{ url: string; fileName: string }>(await apiClient.get(`/reports/${id}/download`, { params: { format } }));
      const anchor = document.createElement('a');
      anchor.href = link.url;
      anchor.download = link.fileName;
      anchor.rel = 'noopener';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      return link;
    },
  });
}

export function useDeleteReport() {
  return useReportsMutation(async (id: string) => unwrap<{ id: string }>(await apiClient.delete(`/reports/${id}`)));
}

export function useCreateSchedule() {
  return useReportsMutation(async (input: ScheduleInput & { reportType: string }) => unwrap<ReportSchedule>(await apiClient.post('/reports/schedule', input)));
}

export function useUpdateSchedule() {
  return useReportsMutation(async ({ id, input }: { id: string; input: ScheduleInput }) => unwrap<ReportSchedule>(await apiClient.patch(`/reports/schedule/${id}`, input)));
}

export function useToggleSchedule() {
  return useReportsMutation(async (id: string) => unwrap<ReportSchedule>(await apiClient.patch(`/reports/schedule/${id}/toggle`)));
}

export function useRunSchedule() {
  return useReportsMutation(async (id: string) => unwrap<ReportSchedule>(await apiClient.post(`/reports/schedule/${id}/run`)));
}

export function useDeleteSchedule() {
  return useReportsMutation(async (id: string) => unwrap<{ id: string }>(await apiClient.delete(`/reports/schedule/${id}`)));
}
