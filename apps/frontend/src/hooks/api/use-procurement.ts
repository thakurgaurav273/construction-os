import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type {
  Delivery, ProcurementAnalytics, ProcurementSummary, PurchaseOrder, PurchaseOrderDetail, PurchaseOrderInput,
  PurchaseOrderStatus, QuoteInput, ReceiveGoodsInput, ReorderSuggestion, Rfq, RfqDetail, RfqInput, ScheduleDeliveryInput,
  Vendor, VendorInput,
} from '@/features/procurement/types';

function unwrap<T>(res: { data: { data?: T } & T }): T {
  return res.data.data ?? res.data;
}

/**
 * Every procurement write moves KPIs, analytics, vendor stats and at least one list,
 * so mutations refresh the whole procurement namespace rather than guessing which views changed.
 */
function invalidateProcurement(qc: QueryClient): void {
  qc.invalidateQueries({ queryKey: ['procurement'] });
  // Goods receipts post to stock.
  qc.invalidateQueries({ queryKey: ['inventory'] });
  qc.invalidateQueries({ queryKey: ['materials'] });
  qc.invalidateQueries({ queryKey: ['material'] });
  qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
  qc.invalidateQueries({ queryKey: ['timeline'] });
}

function useProcurementMutation<TInput, TResult>(request: (input: TInput) => Promise<TResult>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: request, onSuccess: () => invalidateProcurement(qc) });
}

/* ---------- Queries ---------- */

export interface PurchaseOrderFilters {
  projectId?: string;
  vendorId?: string;
  status?: PurchaseOrderStatus;
}

export function usePurchaseOrders(filters: PurchaseOrderFilters = {}) {
  return useQuery<PurchaseOrder[]>({
    queryKey: ['procurement', 'purchase-orders', filters],
    queryFn: async () => unwrap(await apiClient.get('/purchase-orders', { params: filters })),
    staleTime: 30_000,
  });
}

export function usePurchaseOrder(id: string | null) {
  return useQuery<PurchaseOrderDetail>({
    queryKey: ['procurement', 'purchase-order', id],
    queryFn: async () => unwrap(await apiClient.get(`/purchase-orders/${id}`)),
    enabled: !!id,
    staleTime: 15_000,
  });
}

export function useVendors() {
  return useQuery<Vendor[]>({
    queryKey: ['procurement', 'vendors'],
    queryFn: async () => unwrap(await apiClient.get('/vendors')),
    staleTime: 30_000,
  });
}

export function useRfqs() {
  return useQuery<Rfq[]>({
    queryKey: ['procurement', 'rfqs'],
    queryFn: async () => unwrap(await apiClient.get('/rfqs')),
    staleTime: 30_000,
  });
}

export function useRfq(id: string | null) {
  return useQuery<RfqDetail>({
    queryKey: ['procurement', 'rfq', id],
    queryFn: async () => unwrap(await apiClient.get(`/rfqs/${id}`)),
    enabled: !!id,
    staleTime: 15_000,
  });
}

export function useDeliveries() {
  return useQuery<Delivery[]>({
    queryKey: ['procurement', 'deliveries'],
    queryFn: async () => unwrap(await apiClient.get('/deliveries')),
    staleTime: 30_000,
  });
}

export function useProcurementSummary() {
  return useQuery<ProcurementSummary>({
    queryKey: ['procurement', 'summary'],
    queryFn: async () => unwrap(await apiClient.get('/procurement/summary')),
    staleTime: 30_000,
  });
}

export function useProcurementAnalytics() {
  return useQuery<ProcurementAnalytics>({
    queryKey: ['procurement', 'analytics'],
    queryFn: async () => unwrap(await apiClient.get('/procurement/analytics')),
    staleTime: 60_000,
  });
}

/* ---------- Purchase orders ---------- */

export function useCreatePurchaseOrder() {
  return useProcurementMutation(async (input: PurchaseOrderInput): Promise<PurchaseOrderDetail> =>
    unwrap(await apiClient.post('/purchase-orders', input)));
}

export function useUpdatePurchaseOrder() {
  return useProcurementMutation(async ({ id, input }: { id: string; input: PurchaseOrderInput }): Promise<PurchaseOrderDetail> =>
    unwrap(await apiClient.patch(`/purchase-orders/${id}`, input)));
}

export type PurchaseOrderTransition = 'submit' | 'approve' | 'reject' | 'request-changes' | 'cancel' | 'duplicate';

/** Status changes; reject and request-changes require a note, the rest accept an optional one. */
export function usePurchaseOrderTransition() {
  return useProcurementMutation(
    async ({ id, transition, note }: { id: string; transition: PurchaseOrderTransition; note?: string }): Promise<PurchaseOrderDetail> =>
      unwrap(await apiClient.post(`/purchase-orders/${id}/${transition}`, note ? { note } : {})),
  );
}

/* ---------- Deliveries ---------- */

export function useScheduleDelivery() {
  return useProcurementMutation(async ({ orderId, input }: { orderId: string; input: ScheduleDeliveryInput }): Promise<Delivery> =>
    unwrap(await apiClient.post(`/purchase-orders/${orderId}/deliveries`, input)));
}

export function useReceiveGoods() {
  return useProcurementMutation(async ({ orderId, input }: { orderId: string; input: ReceiveGoodsInput }): Promise<Delivery> =>
    unwrap(await apiClient.post(`/purchase-orders/${orderId}/receipts`, input)));
}

export function useDeliveryTransition() {
  return useProcurementMutation(async ({ id, transition }: { id: string; transition: 'in-transit' | 'cancel' }): Promise<Delivery> =>
    unwrap(await apiClient.post(`/deliveries/${id}/${transition}`)));
}

/* ---------- Vendors ---------- */

export function useCreateVendor() {
  return useProcurementMutation(async (input: VendorInput): Promise<Vendor> => unwrap(await apiClient.post('/vendors', input)));
}

export function useUpdateVendor() {
  return useProcurementMutation(async ({ id, input }: { id: string; input: VendorInput }): Promise<Vendor> =>
    unwrap(await apiClient.patch(`/vendors/${id}`, input)));
}

export function useSetVendorActive() {
  return useProcurementMutation(async ({ id, active }: { id: string; active: boolean }): Promise<Vendor> =>
    unwrap(await apiClient.post(`/vendors/${id}/${active ? 'reactivate' : 'deactivate'}`)));
}

/* ---------- RFQs ---------- */

export function useCreateRfq() {
  return useProcurementMutation(async (input: RfqInput): Promise<RfqDetail> => unwrap(await apiClient.post('/rfqs', input)));
}

export function useInviteVendors() {
  return useProcurementMutation(async ({ id, vendorIds }: { id: string; vendorIds: string[] }): Promise<RfqDetail> =>
    unwrap(await apiClient.post(`/rfqs/${id}/invitations`, { vendorIds })));
}

export function useRecordQuote() {
  return useProcurementMutation(
    async ({ id, invitationId, input }: { id: string; invitationId: string; input: QuoteInput }): Promise<RfqDetail> =>
      unwrap(await apiClient.put(`/rfqs/${id}/invitations/${invitationId}/quote`, input)),
  );
}

export function useDeclineQuote() {
  return useProcurementMutation(async ({ id, invitationId }: { id: string; invitationId: string }): Promise<RfqDetail> =>
    unwrap(await apiClient.post(`/rfqs/${id}/invitations/${invitationId}/decline`)));
}

export function useRfqTransition() {
  return useProcurementMutation(async ({ id, transition }: { id: string; transition: 'close' | 'cancel' }): Promise<RfqDetail> =>
    unwrap(await apiClient.post(`/rfqs/${id}/${transition}`)));
}

export function useAwardRfq() {
  return useProcurementMutation(async ({ id, invitationId }: { id: string; invitationId: string }): Promise<RfqDetail> =>
    unwrap(await apiClient.post(`/rfqs/${id}/award`, { invitationId })));
}

/* ---------- Reorders ---------- */

export function fetchReorderSuggestion(materialId: string, warehouseId?: string): Promise<ReorderSuggestion> {
  return apiClient
    .get('/inventory/reorder-suggestion', { params: { materialId, warehouseId } })
    .then((res) => unwrap<ReorderSuggestion>(res));
}
