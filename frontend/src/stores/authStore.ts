import { create } from 'zustand';
import { User } from '../types';
import { authApi } from '../utils/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  registrationEnabled: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  checkRegistrationStatus: () => Promise<void>;
  toggleRegistration: (enabled: boolean) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  registrationEnabled: true,

  login: async (username, password) => {
    const { data } = await authApi.login(username, password);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    set({ user: data.user, isAuthenticated: true });
  },

  register: async (username, password) => {
    const { data } = await authApi.register(username, password);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    set({ user: data.user, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      set({ isLoading: false });
      return;
    }

    try {
      const { data } = await authApi.getMe();
      set({ user: data, isAuthenticated: true, isLoading: false });
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  checkRegistrationStatus: async () => {
    try {
      const { data } = await authApi.getRegistrationStatus();
      set({ registrationEnabled: data.enabled });
    } catch (error) {
      set({ registrationEnabled: false });
    }
  },

  toggleRegistration: async (enabled) => {
    await authApi.toggleRegistration(enabled);
    set({ registrationEnabled: enabled });
  },
}));
