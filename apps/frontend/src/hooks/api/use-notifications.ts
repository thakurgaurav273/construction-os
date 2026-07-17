import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDemoStore } from '@/store/demo-store';
import { apiClient } from '@/lib/api/client';

const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';

export function useNotifications() {
  const demoNotifications = useDemoStore((state) => state.notifications);

  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await apiClient.get('/notifications');
      return res.data;
    },
    enabled: !IS_DEMO,
  });

  return {
    data: IS_DEMO ? demoNotifications : query.data,
    isLoading: IS_DEMO ? false : query.isLoading,
    isError: IS_DEMO ? false : query.isError,
  };
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  const markDemoRead = useDemoStore((state) => state.markNotificationsRead);

  return useMutation({
    mutationFn: async () => {
      if (IS_DEMO) {
        markDemoRead();
        return { success: true };
      }
      const res = await apiClient.post('/notifications/mark-read');
      return res.data;
    },
    onSuccess: () => {
      if (!IS_DEMO) {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      }
    },
  });
}
