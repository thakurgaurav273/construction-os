import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Organization, User } from '@sitepilot/types';

interface AuthState {
  user: User | null;
  organization: Organization | null;
  accessToken: string | null;
  setAuth: (user: User, accessToken: string, organization?: Organization | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      organization: null,
      accessToken: null,
      setAuth: (user, accessToken, organization = null) =>
        set({ user, accessToken, organization }),
      logout: () => set({ user: null, accessToken: null, organization: null }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
