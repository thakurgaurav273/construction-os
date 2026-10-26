import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Organization, User } from '@sitepilot/types';
import { DEVICE_CACHE_KEYS, removeDeviceCache } from '@/lib/device-cache';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth.store';

/** A signed-in device. `current` is the browser making the request. */
export interface AccountSession {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  startedAt: string;
  lastActiveAt: string;
  expiresAt: string;
  current: boolean;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

const SESSIONS_KEY = ['account', 'sessions'] as const;

function useAccountUserMutation<TInput>(request: (input: TInput) => Promise<User>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: request,
    // The sidebar, menus and maker-checker labels read the name and photo from the session store;
    // member lists and project teams show them too.
    onSuccess: (user) => {
      void queryClient.invalidateQueries({ queryKey: ['settings', 'members'] });
      void queryClient.invalidateQueries({ queryKey: ['project'] });
      const { organization, setAuth } = useAuthStore.getState();
      setAuth(user, organization);
    },
  });
}

export function useUpdateProfile() {
  return useAccountUserMutation(async (input: { name: string }): Promise<User> => {
    const res = await apiClient.patch('/auth/profile', input);
    return res.data.data ?? res.data;
  });
}

export function useUploadAvatar() {
  return useAccountUserMutation(async (file: File): Promise<User> => {
    const form = new FormData();
    form.append('file', file);
    const res = await apiClient.post('/auth/profile/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return res.data.data ?? res.data;
  });
}

export function useRemoveAvatar() {
  return useAccountUserMutation<void>(async (): Promise<User> => {
    const res = await apiClient.delete('/auth/profile/avatar');
    return res.data.data ?? res.data;
  });
}

/** Signs out every other device; the result says how many. */
export function useChangePassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ChangePasswordInput): Promise<{ endedSessions: number }> => {
      const res = await apiClient.post('/auth/password', input);
      return res.data.data ?? res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SESSIONS_KEY }),
  });
}

export function useSessions() {
  return useQuery<AccountSession[]>({
    queryKey: SESSIONS_KEY,
    queryFn: async () => {
      const res = await apiClient.get('/auth/sessions');
      return res.data.data ?? res.data;
    },
  });
}

export function useEndSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string): Promise<void> => {
      await apiClient.delete(`/auth/sessions/${sessionId}`);
    },
    onSuccess: (_result, sessionId) => {
      queryClient.setQueryData<AccountSession[]>(SESSIONS_KEY, (sessions) => sessions?.filter((session) => session.id !== sessionId));
    },
  });
}

export function useEndOtherSessions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<{ endedSessions: number }> => {
      const res = await apiClient.delete('/auth/sessions');
      return res.data.data ?? res.data;
    },
    onSuccess: () => {
      queryClient.setQueryData<AccountSession[]>(SESSIONS_KEY, (sessions) => sessions?.filter((session) => session.current));
    },
  });
}

/** An organization the signed-in person belongs to. */
export interface Membership {
  organizationId: string;
  name: string;
  brandColor: string | null;
  role: string;
  isCurrent: boolean;
}

export function useMyOrganizations() {
  const userId = useAuthStore((state) => state.user?.id);
  const organizationId = useAuthStore((state) => state.organization?.id);
  return useQuery<Membership[]>({
    queryKey: ['account', 'organizations', userId, organizationId],
    queryFn: async () => {
      const res = await apiClient.get('/auth/organizations');
      return res.data.data ?? res.data;
    },
    enabled: !!userId,
    staleTime: 5 * 60_000,
  });
}

/**
 * Moves the session to another organization, then reloads into its dashboard: every cached query, the live
 * notification connection and the brand colour belong to the organization being left.
 */
export function useSwitchOrganization() {
  return useMutation({
    mutationFn: async (organizationId: string): Promise<{ user: User; organization: Organization }> => {
      const res = await apiClient.post('/auth/switch-organization', { organizationId });
      return res.data.data ?? res.data;
    },
    onSuccess: ({ user, organization }) => {
      removeDeviceCache(DEVICE_CACHE_KEYS.brandCss);
      useAuthStore.getState().setAuth(user, organization);
      window.location.assign('/dashboard');
    },
  });
}
