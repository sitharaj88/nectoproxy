import { create } from 'zustand';
import type { AppSettings } from '@/services/api';

interface SettingsState {
  settings: AppSettings | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setSettings: (settings: AppSettings) => void;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  isLoading: false,
  error: null,

  setSettings: (settings) => set({ settings }),

  updateSetting: (key, value) =>
    set((state) => ({
      settings: state.settings
        ? { ...state.settings, [key]: value }
        : null,
    })),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),
}));
