/**
 * Theme store — persisted dark/light/system mode toggle.
 * Wraps children with a context that provides `isDark` and color tokens.
 */

import React, { createContext, useContext, useEffect, ReactNode } from "react";
import { useColorScheme } from "react-native";
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ---- Theme types ----
export type ThemeMode = "light" | "dark" | "system";

interface ThemeState {
  theme: ThemeMode;
  _hydrated: boolean;
  setTheme: (mode: ThemeMode) => void;
  hydrate: () => Promise<void>;
}

// ---- Zustand store ----
export const useThemeStore = create<ThemeState>((set) => ({
  theme: "system",
  _hydrated: false,

  setTheme: async (mode) => {
    set({ theme: mode });
    await AsyncStorage.setItem("@theme_mode", mode);
  },

  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem("@theme_mode");
      if (stored && ["light", "dark", "system"].includes(stored)) {
        set({ theme: stored as ThemeMode, _hydrated: true });
      } else {
        set({ _hydrated: true });
      }
    } catch {
      set({ _hydrated: true });
    }
  },
}));

// ---- Color tokens ----
export const lightColors = {
  bg: "#ffffff",
  bgSecondary: "#f3f4f6",
  bgCard: "#ffffff",
  text: "#111827",
  textSecondary: "#6b7280",
  textMuted: "#9ca3af",
  border: "#e5e7eb",
  borderLight: "#f3f4f6",
  primary: "#3b82f6",
  primaryLight: "#dbeafe",
  danger: "#ef4444",
  success: "#22c55e",
  warning: "#f59e0b",
  tabBar: "#ffffff",
  tabBarBorder: "#e5e7eb",
};

export const darkColors = {
  bg: "#0f172a",
  bgSecondary: "#1e293b",
  bgCard: "#1e293b",
  text: "#f1f5f9",
  textSecondary: "#94a3b8",
  textMuted: "#64748b",
  border: "#334155",
  borderLight: "#1e293b",
  primary: "#60a5fa",
  primaryLight: "#1e3a5f",
  danger: "#f87171",
  success: "#4ade80",
  warning: "#fbbf24",
  tabBar: "#0f172a",
  tabBarBorder: "#1e293b",
};

export type ColorTokens = typeof lightColors;

// ---- Context ----
interface ThemeContextValue {
  isDark: boolean;
  colors: ColorTokens;
}

const ThemeContext = createContext<ThemeContextValue>({
  isDark: false,
  colors: lightColors,
});

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

// ---- Provider ----
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { theme, hydrate, _hydrated } = useThemeStore();
  const systemScheme = useColorScheme();

  useEffect(() => {
    hydrate();
  }, []);

  const isDark = theme === "dark" || (theme === "system" && systemScheme === "dark");
  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDark, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}
