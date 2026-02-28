import { create } from 'zustand';
import type { Breakpoint, BreakpointHit } from '@nectoproxy/shared';

interface BreakpointState {
  breakpoints: Breakpoint[];
  pendingHits: BreakpointHit[];
  selectedHit: BreakpointHit | null;
  editingBreakpoint: Breakpoint | null;
  isEditorOpen: boolean;
  isLoading: boolean;

  // Actions
  setBreakpoints: (breakpoints: Breakpoint[]) => void;
  addBreakpoint: (breakpoint: Breakpoint) => void;
  updateBreakpoint: (breakpoint: Breakpoint) => void;
  removeBreakpoint: (id: string) => void;
  setEditingBreakpoint: (breakpoint: Breakpoint | null) => void;
  setEditorOpen: (open: boolean) => void;
  setLoading: (loading: boolean) => void;

  // Pending hits actions
  addPendingHit: (hit: BreakpointHit) => void;
  removePendingHit: (id: string) => void;
  setSelectedHit: (hit: BreakpointHit | null) => void;
}

export const useBreakpointStore = create<BreakpointState>((set) => ({
  breakpoints: [],
  pendingHits: [],
  selectedHit: null,
  editingBreakpoint: null,
  isEditorOpen: false,
  isLoading: false,

  setBreakpoints: (breakpoints) => set({ breakpoints }),

  addBreakpoint: (breakpoint) =>
    set((state) => ({
      breakpoints: [...state.breakpoints, breakpoint],
    })),

  updateBreakpoint: (breakpoint) =>
    set((state) => ({
      breakpoints: state.breakpoints.map((b) =>
        b.id === breakpoint.id ? breakpoint : b
      ),
    })),

  removeBreakpoint: (id) =>
    set((state) => ({
      breakpoints: state.breakpoints.filter((b) => b.id !== id),
    })),

  setEditingBreakpoint: (breakpoint) => set({ editingBreakpoint: breakpoint }),

  setEditorOpen: (open) => set({ isEditorOpen: open }),

  setLoading: (loading) => set({ isLoading: loading }),

  addPendingHit: (hit) =>
    set((state) => ({
      pendingHits: [...state.pendingHits, hit],
    })),

  removePendingHit: (id) =>
    set((state) => ({
      pendingHits: state.pendingHits.filter((h) => h.id !== id),
      selectedHit: state.selectedHit?.id === id ? null : state.selectedHit,
    })),

  setSelectedHit: (hit) => set({ selectedHit: hit }),
}));
