import { create } from 'zustand';

interface CompareState {
  isCompareMode: boolean;
  selectedIds: string[];
  enterCompareMode: () => void;
  exitCompareMode: () => void;
  toggleSelection: (id: string) => void;
  clearSelection: () => void;
  canCompare: () => boolean;
}

export const useCompareStore = create<CompareState>((set, get) => ({
  isCompareMode: false,
  selectedIds: [],

  enterCompareMode: () => set({ isCompareMode: true, selectedIds: [] }),

  exitCompareMode: () => set({ isCompareMode: false, selectedIds: [] }),

  toggleSelection: (id: string) => {
    const { selectedIds } = get();
    if (selectedIds.includes(id)) {
      set({ selectedIds: selectedIds.filter((i) => i !== id) });
    } else if (selectedIds.length < 2) {
      set({ selectedIds: [...selectedIds, id] });
    }
  },

  clearSelection: () => set({ selectedIds: [] }),

  canCompare: () => get().selectedIds.length === 2,
}));
