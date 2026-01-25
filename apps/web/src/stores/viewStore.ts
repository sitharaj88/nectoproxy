import { create } from 'zustand';

export type ViewMode = 'list' | 'waterfall' | 'split' | 'dashboard';

interface ViewState {
  mode: ViewMode;
  setMode: (mode: ViewMode) => void;
}

export const useViewStore = create<ViewState>((set) => ({
  mode: 'list',
  setMode: (mode) => set({ mode }),
}));
