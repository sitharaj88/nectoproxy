import { create } from 'zustand';

export interface SessionTab {
  id: string;
  name: string;
  type: 'live' | 'imported';
}

interface SessionState {
  tabs: SessionTab[];
  activeTabId: string;

  openTab: (tab: SessionTab) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  tabs: [{ id: 'live', name: 'Live', type: 'live' }],
  activeTabId: 'live',

  openTab: (tab) => {
    const { tabs } = get();
    if (tabs.some((t) => t.id === tab.id)) {
      set({ activeTabId: tab.id });
      return;
    }
    set({ tabs: [...tabs, tab], activeTabId: tab.id });
  },

  closeTab: (id) => {
    if (id === 'live') return;
    set((state) => {
      const tabs = state.tabs.filter((t) => t.id !== id);
      const activeTabId = state.activeTabId === id ? 'live' : state.activeTabId;
      return { tabs, activeTabId };
    });
  },

  setActiveTab: (id) => set({ activeTabId: id }),
}));
