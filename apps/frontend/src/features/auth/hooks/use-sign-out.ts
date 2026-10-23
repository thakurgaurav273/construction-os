import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '../api/auth.api';

/**
 * Ends the server session, then forgets everything cached for this user so the next person on the
 * device starts clean. Local state is cleared even if the server call fails (e.g. offline).
 */
export function useSignOut(): { signOut: () => Promise<void>; isSigningOut: boolean } {
  const router = useRouter();
  const queryClient = useQueryClient();
  const clearAuth = useAuthStore((state) => state.logout);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const signOut = useCallback(async () => {
    setIsSigningOut(true);
    try {
      await authApi.logout();
    } catch {
      toast.warning('Signed out on this device. The server could not be reached to end the session.');
    } finally {
      clearAuth();
      queryClient.clear();
      setIsSigningOut(false);
      router.replace('/login');
      router.refresh();
    }
  }, [clearAuth, queryClient, router]);

  return { signOut, isSigningOut };
}
