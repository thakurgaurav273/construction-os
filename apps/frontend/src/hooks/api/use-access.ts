import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { CurrentAccess, Permission } from '@sitepilot/types';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth.store';

interface MeResponse {
  id: string;
  organizationId: string;
  role: string;
  permissions: Permission[];
  isPlatformAdmin?: boolean;
}

/**
 * The signed-in member's role and permissions, read from the server so role changes apply without a
 * re-login. Keyed by user so a different login never sees the previous user's access.
 */
export function useCurrentAccess() {
  const userId = useAuthStore((state) => state.user?.id);
  return useQuery<CurrentAccess>({
    queryKey: ['auth', 'access', userId],
    queryFn: async () => {
      const res = await apiClient.get('/auth/me');
      const me: MeResponse = res.data.data ?? res.data;
      return {
        userId: me.id,
        organizationId: me.organizationId,
        role: me.role,
        permissions: me.permissions,
        isPlatformAdmin: me.isPlatformAdmin ?? false,
      };
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}

/**
 * `can('po.approve')`. Returns false until access has loaded, so actions appear once confirmed rather than
 * flashing for users who can't use them. The server enforces the same rules regardless.
 */
export function useCan(): (permission: Permission) => boolean {
  const { data } = useCurrentAccess();
  const permissions = data?.permissions;
  return useCallback((permission: Permission) => permissions?.includes(permission) ?? false, [permissions]);
}
