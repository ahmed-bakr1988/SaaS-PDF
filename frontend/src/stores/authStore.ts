import { create } from 'zustand';
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  type AuthUser,
  type CreditSummary,
} from '@/services/api';

interface AuthState {
  user: AuthUser | null;
  credits: CreditSummary | null;
  isNewAccount: boolean;
  isLoading: boolean;
  initialized: boolean;
  refreshUser: () => Promise<AuthUser | null>;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  setCredits: (credits: CreditSummary) => void;
  clearNewAccount: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  credits: null,
  isNewAccount: false,
  isLoading: false,
  initialized: false,

  refreshUser: async () => {
    set({ isLoading: true });
    try {
      const data = await getCurrentUser();
      set({
        user: data.user,
        credits: data.credits ?? null,
        isLoading: false,
        initialized: true,
      });
      return data.user;
    } catch {
      set({ user: null, credits: null, isLoading: false, initialized: true });
      return null;
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const data = await loginUser(email, password);
      set({
        user: data.user,
        credits: data.credits ?? null,
        isNewAccount: false,
        isLoading: false,
        initialized: true,
      });
      return data.user;
    } catch (error) {
      set({ isLoading: false, initialized: true });
      throw error;
    }
  },

  register: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const data = await registerUser(email, password);
      set({
        user: data.user,
        credits: data.credits ?? null,
        isNewAccount: !!data.is_new_account,
        isLoading: false,
        initialized: true,
      });
      return data.user;
    } catch (error) {
      set({ isLoading: false, initialized: true });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await logoutUser();
      set({ user: null, credits: null, isNewAccount: false, isLoading: false, initialized: true });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  setCredits: (credits: CreditSummary) => set({ credits }),
  clearNewAccount: () => set({ isNewAccount: false }),
}));
