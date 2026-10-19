import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export type DailyReportStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
export type IssueSeverity = 'minor' | 'medium' | 'high';

export interface LabourDetails {
  skilled: number;
  unskilled: number;
  supervisors: number;
}

export interface MaterialConsumed {
  material: string;
  quantity: number;
  unit: string;
}

export interface EquipmentUsed {
  name: string;
  hours: number;
}

export interface ReportIssue {
  severity: IssueSeverity;
  description: string;
}

export interface ReportUser {
  id: string;
  name: string;
  avatar: string | null;
}

export interface DailyReportAttachment {
  id: string;
  name: string;
  type: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface DailyReport {
  id: string;
  projectId: string;
  project: { id: string; name: string; code: string };
  date: string;
  weather: string | null;
  overallProgress: number | null;
  workCompleted: string | null;
  remarks: string | null;
  labourCount: number;
  status: DailyReportStatus;
  aiSummary: string | null;
  labourDetails: LabourDetails | null;
  materialsConsumed: MaterialConsumed[];
  equipmentUsed: EquipmentUsed[];
  issues: ReportIssue[];
  submittedBy: ReportUser;
  submittedAt: string | null;
  reviewedBy: ReportUser | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  attachmentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DailyReportDetail extends DailyReport {
  attachments: DailyReportAttachment[];
}

export interface DailyReportInput {
  date: string;
  weather: string;
  overallProgress: number | null;
  workCompleted: string;
  remarks: string;
  labourDetails: LabourDetails;
  materialsConsumed: MaterialConsumed[];
  equipmentUsed: EquipmentUsed[];
  issues: ReportIssue[];
}

export interface DailyReportListQuery {
  page: number;
  limit: number;
  search?: string;
  status?: DailyReportStatus;
  projectId?: string;
}

export interface PaginatedDailyReports {
  items: DailyReport[];
  total: number;
  page: number;
  limit: number;
}

export type DailyReportSummary = Record<DailyReportStatus, number> & { total: number };

export type ReviewDecision = { reportId: string; decision: 'approve'; note?: string } | {
  reportId: string;
  decision: 'reject';
  note: string;
};

const reportKey = (projectId: string, reportId: string) => ['daily-report', projectId, reportId];

function storeReport(qc: QueryClient, report: DailyReportDetail): void {
  qc.setQueryData(reportKey(report.projectId, report.id), report);
  qc.invalidateQueries({ queryKey: ['daily-reports'] });
  qc.invalidateQueries({ queryKey: ['project', report.projectId] });
}

export function useDailyReports(projectId: string) {
  return useQuery<DailyReport[]>({
    queryKey: ['daily-reports', 'project', projectId],
    queryFn: async () => {
      const res = await apiClient.get(`/projects/${projectId}/daily-reports`);
      return res.data.data ?? res.data;
    },
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

export function useOrganizationDailyReports(query: DailyReportListQuery) {
  return useQuery<PaginatedDailyReports>({
    queryKey: ['daily-reports', 'organization', query],
    queryFn: async () => {
      const res = await apiClient.get('/daily-reports', { params: query });
      return res.data.data ?? res.data;
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useDailyReportSummary() {
  return useQuery<DailyReportSummary>({
    queryKey: ['daily-reports', 'summary'],
    queryFn: async () => {
      const res = await apiClient.get('/daily-reports/summary');
      return res.data.data ?? res.data;
    },
    staleTime: 30_000,
  });
}

export function useDailyReport(projectId: string, reportId: string) {
  return useQuery<DailyReportDetail>({
    queryKey: reportKey(projectId, reportId),
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
    mutationFn: async (input: DailyReportInput): Promise<DailyReportDetail> => {
      const res = await apiClient.post(`/projects/${projectId}/daily-reports`, input);
      return res.data.data ?? res.data;
    },
    onSuccess: (report) => storeReport(qc, report),
  });
}

export function useUpdateDailyReport(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ reportId, input }: { reportId: string; input: DailyReportInput }): Promise<DailyReportDetail> => {
      const res = await apiClient.patch(`/projects/${projectId}/daily-reports/${reportId}`, input);
      return res.data.data ?? res.data;
    },
    onSuccess: (report) => storeReport(qc, report),
  });
}

export function useSubmitDailyReport(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reportId: string): Promise<DailyReportDetail> => {
      const res = await apiClient.post(`/projects/${projectId}/daily-reports/${reportId}/submit`);
      return res.data.data ?? res.data;
    },
    onSuccess: (report) => storeReport(qc, report),
  });
}

export function useReviewDailyReport(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ reportId, decision, note }: ReviewDecision): Promise<DailyReportDetail> => {
      const res = await apiClient.post(`/projects/${projectId}/daily-reports/${reportId}/${decision}`, { note });
      return res.data.data ?? res.data;
    },
    onSuccess: (report) => storeReport(qc, report),
  });
}

export function useUploadReportAttachment(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ reportId, file }: { reportId: string; file: File }): Promise<DailyReportDetail> => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post(`/projects/${projectId}/daily-reports/${reportId}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data ?? res.data;
    },
    onSuccess: (report) => {
      storeReport(qc, report);
      qc.invalidateQueries({ queryKey: ['documents', projectId] });
    },
  });
}

export function useDeleteReportAttachment(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ reportId, documentId }: { reportId: string; documentId: string }): Promise<DailyReportDetail> => {
      const res = await apiClient.delete(`/projects/${projectId}/daily-reports/${reportId}/attachments/${documentId}`);
      return res.data.data ?? res.data;
    },
    onSuccess: (report) => {
      storeReport(qc, report);
      qc.invalidateQueries({ queryKey: ['documents', projectId] });
    },
  });
}
