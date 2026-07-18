import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import {
  type Delivery,
  type PurchaseOrder,
  type Rfq,
  type Vendor,
} from '@/data/procurement-demo'; // Keep the types

export function usePurchaseOrders() {
  return useQuery<PurchaseOrder[]>({
    queryKey: ['procurement', 'purchase-orders'],
    queryFn: async () => {
      const res = await apiClient.get('/purchase-orders');
      return res.data.data ?? res.data;
    },
    staleTime: 30_000,
  });
}

export function useVendors() {
  return useQuery<Vendor[]>({
    queryKey: ['procurement', 'vendors'],
    queryFn: async () => {
      const res = await apiClient.get('/vendors');
      return res.data.data ?? res.data;
    },
    staleTime: 30_000,
  });
}

export function useRfqs() {
  return useQuery<Rfq[]>({
    queryKey: ['procurement', 'rfqs'],
    queryFn: async () => {
      const res = await apiClient.get('/rfqs');
      return res.data.data ?? res.data;
    },
    staleTime: 30_000,
  });
}

export function useDeliveries() {
  return useQuery<Delivery[]>({
    queryKey: ['procurement', 'deliveries'],
    queryFn: async () => {
      const res = await apiClient.get('/deliveries');
      return res.data.data ?? res.data;
    },
    staleTime: 30_000,
  });
}

export type PurchaseOrderAction = 'approve' | 'reject' | 'request_changes' | 'duplicate';

interface PurchaseOrderActionInput {
  id: string;
  action: PurchaseOrderAction;
}

const ACTION_ENDPOINT: Record<PurchaseOrderAction, string> = {
  approve: 'approve',
  reject: 'reject',
  request_changes: 'request-changes',
  duplicate: 'duplicate',
};

export function usePurchaseOrderAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, action }: PurchaseOrderActionInput) => {
      const res = await apiClient.post(`/purchase-orders/${id}/${ACTION_ENDPOINT[action]}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procurement', 'purchase-orders'] });
    },
  });
}
