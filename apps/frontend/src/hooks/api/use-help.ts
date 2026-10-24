import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosResponse } from 'axios';
import type { HelpProgress, TourKey, TourStatus } from '@sitepilot/types';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth.store';

const HELP_KEY = ['help', 'progress'] as const;

function useHelpProgressKey(): readonly unknown[] {
  const userId = useAuthStore((state) => state.user?.id);
  return [...HELP_KEY, userId];
}

export function useHelpProgress() {
  const queryKey = useHelpProgressKey();
  const userId = useAuthStore((state) => state.user?.id);
  return useQuery<HelpProgress>({
    queryKey,
    queryFn: async () => {
      const res = await apiClient.get('/help/progress');
      return res.data.data ?? res.data;
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}

/** Every help write returns the full progress, so the cache is replaced rather than refetched. */
function useHelpMutation<TVariables>(request: (variables: TVariables) => Promise<HelpProgress>, optimistic?: (current: HelpProgress, variables: TVariables) => HelpProgress) {
  const queryClient = useQueryClient();
  const queryKey = useHelpProgressKey();
  return useMutation({
    mutationFn: request,
    onMutate: (variables: TVariables) => {
      const current = queryClient.getQueryData<HelpProgress>(queryKey);
      if (current && optimistic) queryClient.setQueryData(queryKey, optimistic(current, variables));
      return { current };
    },
    onError: (_error, _variables, context) => {
      if (context?.current) queryClient.setQueryData(queryKey, context.current);
    },
    onSuccess: (progress) => queryClient.setQueryData(queryKey, progress),
  });
}

async function readProgress(request: Promise<AxiosResponse<{ data?: HelpProgress }>>): Promise<HelpProgress> {
  const res = await request;
  if (!res.data.data) throw new Error('Unexpected help progress response');
  return res.data.data;
}

export function useUpdateTourProgress() {
  return useHelpMutation<{ tour: TourKey; status: TourStatus }>(
    ({ tour, status }) => readProgress(apiClient.put(`/help/tours/${tour}`, { status })),
    // Recorded at once so a finished tour never replays while the request is in flight.
    (current, { tour, status }) => ({
      ...current,
      tours: [...current.tours.filter((entry) => entry.tour !== tour), { tour, status, updatedAt: new Date().toISOString() }],
    }),
  );
}

export function useRestartTour() {
  return useHelpMutation<TourKey | null>(
    (tour) => readProgress(tour ? apiClient.delete(`/help/tours/${tour}`) : apiClient.delete('/help/tours')),
    (current, tour) => ({ ...current, tours: tour ? current.tours.filter((entry) => entry.tour !== tour) : [] }),
  );
}

export function useDismissChecklist() {
  return useHelpMutation<boolean>(
    (dismissed) => readProgress(apiClient.put('/help/checklist', { dismissed })),
    (current, dismissed) => ({ ...current, checklist: { ...current.checklist, dismissed } }),
  );
}
