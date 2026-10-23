import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Organization, User } from '@sitepilot/types';

/**
 * Who is signed in, for display and maker-checker comparisons. The session itself lives in HttpOnly
 * cookies set by the API; nothing here is a credential.
 */
interface AuthState {
  user: User | null;
  organization: Organization | null;
  setAuth: (user: User, organization?: Organization | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      organization: null,
      setAuth: (user, organization = null) => set({ user, organization }),
      logout: () => set({ user: null, organization: null }),
    }),
    { name: 'auth-storage' },
  ),
);

/**
 * False on the server and during hydration, true once the persisted session has been read. Until then
 * `user` is always null, so the shell shows placeholders instead of a wrong value ("?", "SitePilot").
 */
export function useAuthHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => useAuthStore.persist.onFinishHydration(onChange),
    () => useAuthStore.persist.hasHydrated(),
    () => false,
  );
}
