import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export interface TimelineEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  date: string;
  user: string;
  projectId?: string;
  module: string;
}

export function useTimeline(filters?: { projectId?: string; module?: string }) {
  return useQuery<TimelineEvent[]>({
    queryKey: ['timeline', filters],
    queryFn: async () => {
      const res = await apiClient.get('/timeline', { params: filters });
      return res.data.data ?? res.data;
    },
    staleTime: 30_000,
  });
}
