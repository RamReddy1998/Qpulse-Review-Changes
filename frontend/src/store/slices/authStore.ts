import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Role } from '../../types';
import { authService } from '../../services/auth.service';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string, role: Role) => Promise<void>;
  register: (username: string, password: string, role: Role) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (username: string, password: string, role: Role) => {
        set({ isLoading: true, error: null });
        try {
          const user = await authService.login(username, password, role);
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (err: unknown) {
          const error = err as { response?: { data?: { message?: string } } };
          set({
            error: error.response?.data?.message || 'Login failed',
            isLoading: false,
          });
          throw err;
        }
      },

      register: async (username: string, password: string, role: Role) => {
        set({ isLoading: true, error: null });
        try {
          await authService.register(username, password, role);
          set({ isLoading: false });
        } catch (err: unknown) {
          const error = err as { response?: { data?: { message?: string } } };
          set({
            error: error.response?.data?.message || 'Registration failed',
            isLoading: false,
          });
          throw err;
        }
      },

      logout: async () => {
        try {
          await authService.logout();
        } finally {
          set({ user: null, isAuthenticated: false, error: null });
        }
      },

      checkAuth: async () => {
        try {
          const user = await authService.getProfile();
          set({ user, isAuthenticated: true });
        } catch {
          set({ user: null, isAuthenticated: false });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'qpulse-auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
