import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import { NOTIFICATIONS_KEY, type Notification } from '@/hooks/api/use-notifications';
import { useAuthStore } from '@/store/auth.store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5174';

/**
 * Live notifications while signed in. The session cookie authenticates the socket, so nothing secret is
 * handled here. If the connection fails, the notification list's polling keeps things up to date.
 */
export function useNotificationSocket(): void {
  const queryClient = useQueryClient();
  const router = useRouter();
  const userId = useAuthStore((state) => state.user?.id);
  const organizationId = useAuthStore((state) => state.organization?.id);

  useEffect(() => {
    if (!userId) return undefined;
    const socket = io(`${API_URL}/notifications`, { withCredentials: true, transports: ['websocket'] });

    socket.on('notification:new', (notification: Notification) => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
      toast(notification.title, {
        description: notification.message,
        action: notification.link
          ? { label: 'Open', onClick: () => router.push(notification.link ?? '/dashboard') }
          : undefined,
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [userId, organizationId, queryClient, router]);
}
