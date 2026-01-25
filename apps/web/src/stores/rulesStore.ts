import { create } from 'zustand';
import type { Rule } from '@proxyscope/shared';

interface RulesState {
  rules: Rule[];
  editingRule: Rule | null;
  isEditorOpen: boolean;
  isLoading: boolean;

  // Actions
  setRules: (rules: Rule[]) => void;
  addRule: (rule: Rule) => void;
  updateRule: (rule: Rule) => void;
  removeRule: (id: string) => void;
  setEditingRule: (rule: Rule | null) => void;
  setEditorOpen: (open: boolean) => void;
  setLoading: (loading: boolean) => void;
}

export const useRulesStore = create<RulesState>((set) => ({
  rules: [],
  editingRule: null,
  isEditorOpen: false,
  isLoading: false,

  setRules: (rules) => set({ rules }),

  addRule: (rule) =>
    set((state) => ({
      rules: [...state.rules, rule].sort((a, b) => a.priority - b.priority),
    })),

  updateRule: (rule) =>
    set((state) => ({
      rules: state.rules
        .map((r) => (r.id === rule.id ? rule : r))
        .sort((a, b) => a.priority - b.priority),
    })),

  removeRule: (id) =>
    set((state) => ({
      rules: state.rules.filter((r) => r.id !== id),
    })),

  setEditingRule: (rule) => set({ editingRule: rule }),

  setEditorOpen: (open) => set({ isEditorOpen: open }),

  setLoading: (loading) => set({ isLoading: loading }),
}));
