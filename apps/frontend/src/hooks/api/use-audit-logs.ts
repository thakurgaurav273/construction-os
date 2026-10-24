import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export interface AuditLogEntry {
  id: string;
  action: string;
  /** Readable fragment from the server, e.g. "approved a purchase order". */
  summary: string;
  entityType: string;
  entityId: string | null;
  projectId: string | null;
  actor: { id: string | null; name: string };
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditLogPage {
  items: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditLogFilters {
  search?: string;
  entityType?: string;
  /** With entityType: one record's history. */
  entityId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export function useAuditLogs(filters: AuditLogFilters, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery<AuditLogPage>({
    queryKey: ['audit-logs', filters],
    queryFn: async () => {
      const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined && value !== ''));
      const res = await apiClient.get('/audit-logs', { params });
      return res.data.data ?? res.data;
    },
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}
