import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { invalidateStock, type MaterialIssue, type Paginated } from './use-materials';

export type MaterialRequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'PARTLY_ISSUED'
  | 'ISSUED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'CLOSED';

/** `OPEN` is everything still waiting on someone: pending, approved and part-issued requests. */
export type MaterialRequestStatusFilter = MaterialRequestStatus | 'OPEN';

export interface MaterialRequestItem {
  id: string;
  materialId: string;
  name: string;
  sku: string;
  unit: string;
  quantity: number;
  issued: number;
  remaining: number;
}

export interface MaterialRequest {
  id: string;
  code: string;
  status: MaterialRequestStatus;
  projectId: string;
  project: { id: string; name: string; code: string };
  neededBy: string | null;
  note: string | null;
  reviewNote: string | null;
  requestedBy: { id: string; name: string };
  reviewedBy: { id: string; name: string } | null;
  reviewedAt: string | null;
  closedBy: { id: string; name: string } | null;
  closedAt: string | null;
  createdAt: string;
  items: MaterialRequestItem[];
}

export interface MaterialRequestDetail extends MaterialRequest {
  issues: MaterialIssue[];
}

export interface MaterialRequestFilters {
  status?: MaterialRequestStatusFilter;
  projectId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface MaterialRequestInput {
  projectId: string;
  neededBy?: string;
  note?: string;
  items: { materialId: string; quantity: number }[];
}

export interface IssueAgainstRequestInput {
  warehouseId: string;
  issuedOn?: string;
  note?: string;
  lines: { itemId: string; quantity: number }[];
}

export type MaterialRequestAction = 'approve' | 'reject' | 'cancel' | 'close';

export function useMaterialRequests(filters: MaterialRequestFilters = {}, options: { enabled?: boolean } = {}) {
  return useQuery<Paginated<MaterialRequest>>({
    queryKey: ['material-requests', filters],
    queryFn: async () => {
      const res = await apiClient.get('/material-requests', { params: filters });
      return res.data.data ?? res.data;
    },
    enabled: options.enabled ?? true,
    staleTime: 30_000,
  });
}

export function useMaterialRequest(id: string | null) {
  return useQuery<MaterialRequestDetail>({
    queryKey: ['material-request', id],
    queryFn: async () => {
      const res = await apiClient.get(`/material-requests/${id}`);
      return res.data.data ?? res.data;
    },
    enabled: !!id,
    staleTime: 30_000,
  });
}

function invalidateRequests(queryClient: ReturnType<typeof useQueryClient>, id?: string): void {
  queryClient.invalidateQueries({ queryKey: ['material-requests'] });
  if (id) queryClient.invalidateQueries({ queryKey: ['material-request', id] });
}

export function useCreateMaterialRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: MaterialRequestInput): Promise<MaterialRequestDetail> => {
      const res = await apiClient.post('/material-requests', input);
      return res.data.data ?? res.data;
    },
    onSuccess: () => invalidateRequests(queryClient),
  });
}

export function useMaterialRequestAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action, note }: { id: string; action: MaterialRequestAction; note?: string }): Promise<MaterialRequestDetail> => {
      const res = await apiClient.post(`/material-requests/${id}/${action}`, action === 'approve' ? {} : { note });
      return res.data.data ?? res.data;
    },
    onSuccess: (_result, { id }) => invalidateRequests(queryClient, id),
  });
}

/** Issuing moves stock, so the site's materials, store stock and the request all refresh. */
export function useIssueAgainstRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: IssueAgainstRequestInput }): Promise<MaterialRequestDetail> => {
      const res = await apiClient.post(`/material-requests/${id}/issue`, input);
      return res.data.data ?? res.data;
    },
    onSuccess: (request, { id }) => {
      invalidateRequests(queryClient, id);
      invalidateStock(queryClient, request.projectId);
    },
  });
}
