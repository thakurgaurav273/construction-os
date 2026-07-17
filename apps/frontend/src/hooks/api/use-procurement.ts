import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useProcurementStore } from '@/store/procurement-store';
import {
  deliveries as demoDeliveries,
  rfqs as demoRfqs,
  vendors as demoVendors,
  type Delivery,
  type PurchaseOrder,
  type Rfq,
  type Vendor,
} from '@/data/procurement-demo';

const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';

/** Reads use the demo store/dataset in demo mode and fall back to it if the API is unreachable. */
export function usePurchaseOrders(): { data: PurchaseOrder[]; isLoading: boolean; isError: boolean } {
  const demoOrders = useProcurementStore((state) => state.purchaseOrders);

  const query = useQuery<PurchaseOrder[]>({
    queryKey: ['procurement', 'purchase-orders'],
    queryFn: async () => {
      const res = await apiClient.get('/purchase-orders');
      return res.data.data ?? res.data;
    },
    enabled: !IS_DEMO,
    staleTime: 30_000,
  });

  return {
    data: IS_DEMO ? demoOrders : query.data ?? demoOrders,
    isLoading: IS_DEMO ? false : query.isLoading,
    isError: IS_DEMO ? false : query.isError,
  };
}

export function useVendors(): { data: Vendor[]; isLoading: boolean; isError: boolean } {
  const query = useQuery<Vendor[]>({
    queryKey: ['procurement', 'vendors'],
    queryFn: async () => {
      const res = await apiClient.get('/vendors');
      return res.data.data ?? res.data;
    },
    enabled: !IS_DEMO,
    staleTime: 30_000,
  });

  return {
    data: IS_DEMO ? demoVendors : query.data ?? demoVendors,
    isLoading: IS_DEMO ? false : query.isLoading,
    isError: IS_DEMO ? false : query.isError,
  };
}

export function useRfqs(): { data: Rfq[]; isLoading: boolean; isError: boolean } {
  const query = useQuery<Rfq[]>({
    queryKey: ['procurement', 'rfqs'],
    queryFn: async () => {
      const res = await apiClient.get('/rfqs');
      return res.data.data ?? res.data;
    },
    enabled: !IS_DEMO,
    staleTime: 30_000,
  });

  return {
    data: IS_DEMO ? demoRfqs : query.data ?? demoRfqs,
    isLoading: IS_DEMO ? false : query.isLoading,
    isError: IS_DEMO ? false : query.isError,
  };
}

export function useDeliveries(): { data: Delivery[]; isLoading: boolean; isError: boolean } {
  const query = useQuery<Delivery[]>({
    queryKey: ['procurement', 'deliveries'],
    queryFn: async () => {
      const res = await apiClient.get('/deliveries');
      return res.data.data ?? res.data;
    },
    enabled: !IS_DEMO,
    staleTime: 30_000,
  });

  return {
    data: IS_DEMO ? demoDeliveries : query.data ?? demoDeliveries,
    isLoading: IS_DEMO ? false : query.isLoading,
    isError: IS_DEMO ? false : query.isError,
  };
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

/** Approve / reject / request-changes / duplicate - mutates the demo store in demo mode. */
export function usePurchaseOrderAction() {
  const queryClient = useQueryClient();
  const approvePO = useProcurementStore((state) => state.approvePO);
  const rejectPO = useProcurementStore((state) => state.rejectPO);
  const requestChangesPO = useProcurementStore((state) => state.requestChangesPO);
  const duplicatePO = useProcurementStore((state) => state.duplicatePO);

  return useMutation({
    mutationFn: async ({ id, action }: PurchaseOrderActionInput) => {
      if (IS_DEMO) {
        await new Promise((resolve) => setTimeout(resolve, 450));
        if (action === 'approve') approvePO(id);
        else if (action === 'reject') rejectPO(id);
        else if (action === 'request_changes') requestChangesPO(id);
        else duplicatePO(id);
        return { id, action };
      }
      const res = await apiClient.post(`/purchase-orders/${id}/${ACTION_ENDPOINT[action]}`);
      return res.data;
    },
    onSuccess: () => {
      if (!IS_DEMO) {
        queryClient.invalidateQueries({ queryKey: ['procurement', 'purchase-orders'] });
      }
    },
  });
}
