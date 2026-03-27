/**
 * Zustand auth store
 */

import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { api } from "@/services/api";

interface User {
  id: string;
  name: string;
  email: string | null;
  telegram_id: number | null;
  family_id: string | null;
  is_family_admin: boolean;
  avatar_url: string | null;
  birth_date: string | null;
  gender: string | null;
  occupation: string | null;
  lifestyle: string | null;
  location_city: string | null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    await SecureStore.setItemAsync("access_token", res.data.access_token);
    await SecureStore.setItemAsync("refresh_token", res.data.refresh_token);
    const meRes = await api.get("/auth/me");
    set({ user: meRes.data, isAuthenticated: true });
  },

  register: async (name, email, password) => {
    const res = await api.post("/auth/register", { name, email, password });
    await SecureStore.setItemAsync("access_token", res.data.access_token);
    await SecureStore.setItemAsync("refresh_token", res.data.refresh_token);
    const meRes = await api.get("/auth/me");
    set({ user: meRes.data, isAuthenticated: true });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync("access_token");
    await SecureStore.deleteItemAsync("refresh_token");
    set({ user: null, isAuthenticated: false });
  },

  loadUser: async () => {
    set({ isLoading: true });
    try {
      const token = await SecureStore.getItemAsync("access_token");
      if (!token) {
        set({ isLoading: false });
        return;
      }
      const res = await api.get("/auth/me");
      set({ user: res.data, isAuthenticated: true });
    } catch {
      await SecureStore.deleteItemAsync("access_token");
      await SecureStore.deleteItemAsync("refresh_token");
    } finally {
      set({ isLoading: false });
    }
  },
}));
