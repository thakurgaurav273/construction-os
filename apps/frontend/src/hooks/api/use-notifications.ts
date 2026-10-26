import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

export interface Notification {
  id: string;
  type: NotificationType;
  category: string;
  event: string | null;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationPage {
  items: Notification[];
  total: number;
  unread: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface NotificationPreference {
  category: string;
  label: string;
  description: string;
  inApp: boolean;
  email: boolean;
}

export const NOTIFICATIONS_KEY = ['notifications'] as const;

/** Polling is the fallback when the live connection is down; the socket refreshes this immediately. */
const FALLBACK_POLL_MS = 60_000;

export function useNotifications() {
  return useQuery<NotificationPage>({
    queryKey: [...NOTIFICATIONS_KEY, 'list'],
    queryFn: async () => {
      const res = await apiClient.get('/notifications', { params: { limit: 20 } });
      return res.data.data ?? res.data;
    },
    refetchInterval: FALLBACK_POLL_MS,
    staleTime: 30_000,
  });
}

export interface NotificationHistoryQuery {
  page: number;
  unreadOnly: boolean;
  category?: string;
}

const HISTORY_PAGE_SIZE = 25;

/** Every notification, a page at a time, for the history page. The bell only shows the latest. */
export function useNotificationHistory(query: NotificationHistoryQuery) {
  return useQuery<NotificationPage>({
    queryKey: [...NOTIFICATIONS_KEY, 'history', query],
    queryFn: async () => {
      const res = await apiClient.get('/notifications', {
        params: { page: query.page, limit: HISTORY_PAGE_SIZE, unreadOnly: query.unreadOnly || undefined, category: query.category },
      });
      return res.data.data ?? res.data;
    },
    placeholderData: (previous) => previous,
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete(`/notifications/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<void> => {
      await apiClient.patch('/notifications/read-all');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });
}

export function useNotificationPreferences() {
  return useQuery<NotificationPreference[]>({
    queryKey: [...NOTIFICATIONS_KEY, 'preferences'],
    queryFn: async () => {
      const res = await apiClient.get('/notifications/preferences');
      return res.data.data ?? res.data;
    },
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (preferences: Pick<NotificationPreference, 'category' | 'inApp' | 'email'>[]): Promise<NotificationPreference[]> => {
      const res = await apiClient.put('/notifications/preferences', { preferences });
      return res.data.data ?? res.data;
    },
    onSuccess: (saved) => queryClient.setQueryData([...NOTIFICATIONS_KEY, 'preferences'], saved),
  });
}
