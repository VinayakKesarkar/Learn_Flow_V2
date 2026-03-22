import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserResponse } from '@workspace/api-client-react';

interface AuthState {
  user: UserResponse | null;
  accessToken: string | null;
  login: (user: UserResponse, token: string) => void;
  logout: () => void;
  setToken: (token: string) => void;
  updateUser: (user: UserResponse) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      login: (user, accessToken) => set({ user, accessToken }),
      logout: () => set({ user: null, accessToken: null }),
      setToken: (accessToken) => set({ accessToken }),
      updateUser: (user) => set({ user }),
    }),
    {
      name: 'lms-auth-storage',
    }
  )
);
