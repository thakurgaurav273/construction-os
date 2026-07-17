import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDemoStore } from '@/store/demo-store';
import { apiClient } from '@/lib/api/client';

const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';

export function usePurchaseOrders() {
  const demoOrders = useDemoStore((state) => state.purchaseOrders);

  const query = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: async () => {
      const res = await apiClient.get('/purchase-orders');
      return res.data;
    },
    enabled: !IS_DEMO,
  });

  return {
    data: IS_DEMO ? demoOrders : query.data,
    isLoading: IS_DEMO ? false : query.isLoading,
    isError: IS_DEMO ? false : query.isError,
  };
}

export function useApprovePurchaseOrder() {
  const queryClient = useQueryClient();
  const approveDemoPO = useDemoStore((state) => state.approvePO);

  return useMutation({
    mutationFn: async (id: string) => {
      if (IS_DEMO) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        approveDemoPO(id);
        return { id, status: 'approved' };
      }
      const res = await apiClient.post(`/purchase-orders/${id}/approve`);
      return res.data;
    },
    onSuccess: () => {
      if (!IS_DEMO) {
        queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
        queryClient.invalidateQueries({ queryKey: ['timeline'] });
      }
    },
  });
}
