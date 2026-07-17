import { useQuery } from '@tanstack/react-query';
import { useDemoStore } from '@/store/demo-store';
import { apiClient } from '@/lib/api/client';

const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';

export function useTimeline() {
  const demoTimeline = useDemoStore((state) => state.timelineEvents);

  const query = useQuery({
    queryKey: ['timeline'],
    queryFn: async () => {
      const res = await apiClient.get('/timeline');
      return res.data;
    },
    enabled: !IS_DEMO,
  });

  return {
    data: IS_DEMO ? demoTimeline : query.data,
    isLoading: IS_DEMO ? false : query.isLoading,
    isError: IS_DEMO ? false : query.isError,
  };
}
