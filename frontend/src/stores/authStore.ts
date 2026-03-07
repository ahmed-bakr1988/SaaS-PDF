import { create } from 'zustand';
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  type AuthUser,
} from '@/services/api';

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  initialized: boolean;
  refreshUser: () => Promise<AuthUser | null>;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  initialized: false,

  refreshUser: async () => {
    set({ isLoading: true });
    try {
      const user = await getCurrentUser();
      set({ user, isLoading: false, initialized: true });
      return user;
    } catch {
      set({ user: null, isLoading: false, initialized: true });
      return null;
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const user = await loginUser(email, password);
      set({ user, isLoading: false, initialized: true });
      return user;
    } catch (error) {
      set({ isLoading: false, initialized: true });
      throw error;
    }
  },

  register: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const user = await registerUser(email, password);
      set({ user, isLoading: false, initialized: true });
      return user;
    } catch (error) {
      set({ isLoading: false, initialized: true });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await logoutUser();
      set({ user: null, isLoading: false, initialized: true });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
}));
