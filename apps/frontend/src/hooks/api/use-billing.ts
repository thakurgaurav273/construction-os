import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type {
  AdjustmentRule, CertifiedLineInput, Client, ClientInput, ContractDetail, ContractDirection, ContractInput,
  ContractItemInput, ContractStatus, ContractSummary, MeasurementInput, RaBillDetail, RaBillInput, RaBillStatus,
  RaBillSummary, ReceiptInput, Receivables, RetentionReleaseInput,
} from '@/features/billing/types';

function unwrap<T>(res: { data: { data?: T } & T }): T {
  return res.data.data ?? res.data;
}

/** A bill change moves its contract's totals and every list, so writes refresh the whole billing namespace. */
function useBillingMutation<TInput, TResult>(request: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing'] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      // Certified subcontract bills and retention releases raise vendor bills in Finance.
      queryClient.invalidateQueries({ queryKey: ['finance'] });
    },
  });
}

/* ---------- Queries ---------- */

export function useClients(enabled = true) {
  return useQuery<Client[]>({
    queryKey: ['billing', 'clients'],
    queryFn: async () => unwrap(await apiClient.get('/clients')),
    enabled,
    staleTime: 60_000,
  });
}

export interface ContractFilters {
  projectId?: string;
  direction?: ContractDirection;
  status?: ContractStatus;
}

export function useContracts(filters: ContractFilters = {}) {
  return useQuery<ContractSummary[]>({
    queryKey: ['billing', 'contracts', filters],
    queryFn: async () => unwrap(await apiClient.get('/contracts', { params: filters })),
    staleTime: 30_000,
  });
}

export function useContract(id: string) {
  return useQuery<ContractDetail>({
    queryKey: ['billing', 'contract', id],
    queryFn: async () => unwrap(await apiClient.get(`/contracts/${id}`)),
    staleTime: 15_000,
  });
}

export interface RaBillFilters {
  contractId?: string;
  projectId?: string;
  direction?: ContractDirection;
  status?: RaBillStatus;
}

export function useRaBills(filters: RaBillFilters = {}) {
  return useQuery<RaBillSummary[]>({
    queryKey: ['billing', 'ra-bills', filters],
    queryFn: async () => unwrap(await apiClient.get('/ra-bills', { params: filters })),
    staleTime: 30_000,
  });
}

export function useRaBill(id: string) {
  return useQuery<RaBillDetail>({
    queryKey: ['billing', 'ra-bill', id],
    queryFn: async () => unwrap(await apiClient.get(`/ra-bills/${id}`)),
    staleTime: 15_000,
  });
}

/* ---------- Clients & contracts ---------- */

export function useSaveClient() {
  return useBillingMutation(async ({ id, input }: { id?: string; input: ClientInput }): Promise<Client> =>
    unwrap(id ? await apiClient.patch(`/clients/${id}`, input) : await apiClient.post('/clients', input)));
}

export function useCreateContract() {
  return useBillingMutation(async (input: ContractInput): Promise<ContractDetail> => unwrap(await apiClient.post('/contracts', input)));
}

export function useUpdateContract() {
  return useBillingMutation(async ({ id, input }: { id: string; input: Omit<ContractInput, 'direction' | 'projectId'> }): Promise<ContractDetail> =>
    unwrap(await apiClient.patch(`/contracts/${id}`, input)));
}

export function useSaveContractItems() {
  return useBillingMutation(async ({ id, items }: { id: string; items: ContractItemInput[] }): Promise<ContractDetail> =>
    unwrap(await apiClient.put(`/contracts/${id}/items`, { items })));
}

export function useSetContractOpen() {
  return useBillingMutation(async ({ id, open }: { id: string; open: boolean }): Promise<ContractDetail> =>
    unwrap(await apiClient.post(`/contracts/${id}/${open ? 'reopen' : 'close'}`)));
}

/* ---------- RA bills ---------- */

export function useCreateRaBill() {
  return useBillingMutation(async ({ contractId, input }: { contractId: string; input: RaBillInput }): Promise<RaBillDetail> =>
    unwrap(await apiClient.post(`/contracts/${contractId}/ra-bills`, input)));
}

export function useUpdateRaBill() {
  return useBillingMutation(async ({ id, input }: { id: string; input: Partial<RaBillInput> & { adjustments?: AdjustmentRule[] } }): Promise<RaBillDetail> =>
    unwrap(await apiClient.patch(`/ra-bills/${id}`, input)));
}

export function useSaveMeasurements() {
  return useBillingMutation(async ({ id, itemId, rows }: { id: string; itemId: string; rows: MeasurementInput[] }): Promise<RaBillDetail> =>
    unwrap(await apiClient.put(`/ra-bills/${id}/items/${itemId}/measurements`, { rows })));
}

export type RaBillAction =
  | { action: 'submit' }
  | { action: 'certify'; lines: CertifiedLineInput[]; note?: string; invoiceNumber?: string }
  | { action: 'request-changes'; note: string }
  | { action: 'cancel'; note?: string };

export function useRaBillTransition() {
  return useBillingMutation(async ({ id, ...body }: RaBillAction & { id: string }): Promise<RaBillDetail> => {
    const { action, ...payload } = body;
    return unwrap(await apiClient.post(`/ra-bills/${id}/${action}`, payload));
  });
}

/* ---------- Settlement ---------- */

export function useReceivables(projectId?: string) {
  return useQuery<Receivables>({
    queryKey: ['billing', 'receivables', projectId ?? null],
    queryFn: async () => unwrap(await apiClient.get('/receivables', { params: { projectId } })),
    staleTime: 30_000,
  });
}

export function useRecordReceipt() {
  return useBillingMutation(async ({ billId, input }: { billId: string; input: ReceiptInput }): Promise<RaBillDetail> =>
    unwrap(await apiClient.post(`/ra-bills/${billId}/receipts`, input)));
}

export function useVoidReceipt() {
  return useBillingMutation(async ({ billId, receiptId, note }: { billId: string; receiptId: string; note: string }): Promise<RaBillDetail> =>
    unwrap(await apiClient.post(`/ra-bills/${billId}/receipts/${receiptId}/void`, { note })));
}

export function useReleaseRetention() {
  return useBillingMutation(async ({ contractId, input }: { contractId: string; input: RetentionReleaseInput }): Promise<ContractDetail> =>
    unwrap(await apiClient.post(`/contracts/${contractId}/retention-releases`, input)));
}
