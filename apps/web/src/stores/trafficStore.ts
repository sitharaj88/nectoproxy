import { create } from 'zustand';
import type { TrafficEntry } from '@nectoproxy/shared';
import { useSessionStore } from './sessionStore';

export interface AdvancedFilter {
  search: string;
  searchRegex: boolean;
  bodySearch: string;
  bodySearchRegex: boolean;
  methods: string[];
  statuses: string[];
  protocols: ('http' | 'https' | 'ws' | 'wss')[];
  minDuration: number | null;
  maxDuration: number | null;
  minSize: number | null;
  maxSize: number | null;
  hasError: boolean | null;
}

interface TrafficState {
  entries: TrafficEntry[];
  importedEntries: Record<string, TrafficEntry[]>;
  selectedId: string | null;
  filter: AdvancedFilter;
  maxEntries: number;
  isPaused: boolean;

  // Actions
  addEntry: (entry: TrafficEntry) => void;
  addBatch: (entries: TrafficEntry[]) => void;
  updateEntry: (id: string, update: Partial<TrafficEntry>) => void;
  setSelected: (id: string | null) => void;
  clearEntries: () => void;
  setFilter: (filter: Partial<AdvancedFilter>) => void;
  resetFilter: () => void;
  setPaused: (paused: boolean) => void;
  loadSessionEntries: (sessionId: string, entries: TrafficEntry[]) => void;
  removeSessionEntries: (sessionId: string) => void;
}

const defaultFilter: AdvancedFilter = {
  search: '',
  searchRegex: false,
  bodySearch: '',
  bodySearchRegex: false,
  methods: [],
  statuses: [],
  protocols: [],
  minDuration: null,
  maxDuration: null,
  minSize: null,
  maxSize: null,
  hasError: null,
};

export const useTrafficStore = create<TrafficState>((set, get) => ({
  entries: [],
  importedEntries: {},
  selectedId: null,
  filter: { ...defaultFilter },
  maxEntries: 10000,
  isPaused: false,

  addEntry: (entry) => {
    if (get().isPaused) return;

    set((state) => {
      const newEntries = [entry, ...state.entries];
      if (newEntries.length > state.maxEntries) {
        return { entries: newEntries.slice(0, state.maxEntries) };
      }
      return { entries: newEntries };
    });
  },

  addBatch: (entries) => {
    if (get().isPaused) return;

    set((state) => {
      const newEntries = [...entries.reverse(), ...state.entries];
      if (newEntries.length > state.maxEntries) {
        return { entries: newEntries.slice(0, state.maxEntries) };
      }
      return { entries: newEntries };
    });
  },

  updateEntry: (id, update) => {
    set((state) => ({
      entries: state.entries.map((entry) =>
        entry.id === id ? { ...entry, ...update } : entry
      ),
    }));
  },

  setSelected: (id) => set({ selectedId: id }),

  clearEntries: () => set({ entries: [], selectedId: null }),

  setFilter: (filter) =>
    set((state) => ({
      filter: { ...state.filter, ...filter },
    })),

  resetFilter: () => set({ filter: { ...defaultFilter } }),

  setPaused: (isPaused) => set({ isPaused }),

  loadSessionEntries: (sessionId, entries) => {
    set((state) => ({
      importedEntries: { ...state.importedEntries, [sessionId]: entries },
    }));
  },

  removeSessionEntries: (sessionId) => {
    set((state) => {
      const { [sessionId]: _, ...rest } = state.importedEntries;
      return { importedEntries: rest };
    });
  },
}));

// Helper function to test regex safely
function matchesPattern(text: string, pattern: string, isRegex: boolean): boolean {
  if (!pattern) return true;

  if (isRegex) {
    try {
      const regex = new RegExp(pattern, 'i');
      return regex.test(text);
    } catch {
      // Invalid regex, fall back to string match
      return text.toLowerCase().includes(pattern.toLowerCase());
    }
  }

  return text.toLowerCase().includes(pattern.toLowerCase());
}

// Helper to decode body content for searching
function decodeBody(body: unknown): string {
  if (!body) return '';
  if (typeof body === 'string') {
    try {
      return atob(body);
    } catch {
      return body;
    }
  }
  if (body instanceof Uint8Array) return new TextDecoder().decode(body);
  // Handle serialized Node.js Buffer: { type: "Buffer", data: [...] }
  if (typeof body === 'object' && body !== null && 'type' in body && (body as Record<string, unknown>).type === 'Buffer' && 'data' in body) {
    return new TextDecoder().decode(new Uint8Array((body as Record<string, unknown>).data as number[]));
  }
  return '';
}

// Apply filters to a list of entries
function applyFilters(entries: TrafficEntry[], filter: AdvancedFilter): TrafficEntry[] {
  return entries.filter((entry) => {
    // URL/host search filter
    if (filter.search) {
      const urlAndHost = `${entry.url} ${entry.host}`;
      if (!matchesPattern(urlAndHost, filter.search, filter.searchRegex)) {
        return false;
      }
    }

    // Body content search filter
    if (filter.bodySearch) {
      const requestBodyContent = decodeBody(entry.requestBody);
      const responseBodyContent = decodeBody(entry.responseBody);
      const bodyContent = `${requestBodyContent} ${responseBodyContent}`;

      if (!matchesPattern(bodyContent, filter.bodySearch, filter.bodySearchRegex)) {
        return false;
      }
    }

    // Method filter
    if (filter.methods.length > 0) {
      if (!filter.methods.includes(entry.method)) return false;
    }

    // Status filter
    if (filter.statuses.length > 0) {
      if (!entry.status) return false;
      const statusGroup = `${Math.floor(entry.status / 100)}xx`;
      if (!filter.statuses.includes(statusGroup)) return false;
    }

    // Protocol filter
    if (filter.protocols.length > 0) {
      if (!filter.protocols.includes(entry.protocol)) return false;
    }

    // Duration filters
    if (filter.minDuration !== null && entry.duration !== null) {
      if (entry.duration < filter.minDuration) return false;
    }
    if (filter.maxDuration !== null && entry.duration !== null) {
      if (entry.duration > filter.maxDuration) return false;
    }

    // Size filters (response body size)
    const size = entry.responseBodySize ?? 0;
    if (filter.minSize !== null) {
      if (size < filter.minSize) return false;
    }
    if (filter.maxSize !== null) {
      if (size > filter.maxSize) return false;
    }

    // Error filter
    if (filter.hasError === true) {
      if (!entry.error && (entry.status === null || entry.status < 400)) return false;
    }
    if (filter.hasError === false) {
      if (entry.error || (entry.status !== null && entry.status >= 400)) return false;
    }

    return true;
  });
}

// Selector for filtered entries (live traffic only)
export const useFilteredEntries = () => {
  const { entries, filter } = useTrafficStore();
  return applyFilters(entries, filter);
};

// Selector for active tab entries (session-aware, with filters)
export const useActiveEntries = () => {
  const { entries, importedEntries, filter } = useTrafficStore();
  const activeTabId = useSessionStore((s) => s.activeTabId);

  const sourceEntries = activeTabId === 'live'
    ? entries
    : importedEntries[activeTabId] || [];

  return applyFilters(sourceEntries, filter);
};

// Selector for active tab raw entries (no filters)
export const useActiveRawEntries = () => {
  const { entries, importedEntries } = useTrafficStore();
  const activeTabId = useSessionStore((s) => s.activeTabId);

  return activeTabId === 'live'
    ? entries
    : importedEntries[activeTabId] || [];
};

// Selector for selected entry (session-aware)
export const useSelectedEntry = () => {
  const { entries, importedEntries, selectedId } = useTrafficStore();
  const activeTabId = useSessionStore((s) => s.activeTabId);

  const sourceEntries = activeTabId === 'live'
    ? entries
    : importedEntries[activeTabId] || [];

  return sourceEntries.find((e) => e.id === selectedId) || null;
};

// Check if any filters are active
export const useHasActiveFilters = () => {
  const { filter } = useTrafficStore();

  return (
    filter.search !== '' ||
    filter.bodySearch !== '' ||
    filter.methods.length > 0 ||
    filter.statuses.length > 0 ||
    filter.protocols.length > 0 ||
    filter.minDuration !== null ||
    filter.maxDuration !== null ||
    filter.minSize !== null ||
    filter.maxSize !== null ||
    filter.hasError !== null
  );
};
