import type { AuthSession, UserProfile } from '@kestrel/shared';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  setSession: (session: AuthSession) => void;
  setUser: (user: UserProfile) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setSession: (session) => set({ token: session.token, user: session.user }),
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, user: null }),
    }),
    { name: 'kestrel-auth' },
  ),
);
