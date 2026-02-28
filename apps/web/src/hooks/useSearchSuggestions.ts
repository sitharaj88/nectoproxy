import { useMemo } from 'react';
import { useTrafficStore } from '@/stores/trafficStore';

export interface SearchSuggestion {
  type: 'recent' | 'host' | 'path' | 'filter';
  value: string;
  label: string;
  icon?: string;
}

// Recent searches stored in localStorage
const RECENT_SEARCHES_KEY = 'nectoproxy_recent_searches';
const MAX_RECENT_SEARCHES = 10;

export function getRecentSearches(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(search: string) {
  if (!search.trim()) return;

  const recent = getRecentSearches();
  const filtered = recent.filter((s) => s !== search);
  const updated = [search, ...filtered].slice(0, MAX_RECENT_SEARCHES);

  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
}

export function clearRecentSearches() {
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
    // Ignore storage errors
  }
}

// Filter patterns that users can apply
const FILTER_PATTERNS: SearchSuggestion[] = [
  { type: 'filter', value: 'status:2xx', label: 'Successful responses (2xx)', icon: 'check' },
  { type: 'filter', value: 'status:4xx', label: 'Client errors (4xx)', icon: 'alert' },
  { type: 'filter', value: 'status:5xx', label: 'Server errors (5xx)', icon: 'error' },
  { type: 'filter', value: 'method:GET', label: 'GET requests', icon: 'method' },
  { type: 'filter', value: 'method:POST', label: 'POST requests', icon: 'method' },
  { type: 'filter', value: 'is:error', label: 'Requests with errors', icon: 'error' },
  { type: 'filter', value: 'is:slow', label: 'Slow requests (>1s)', icon: 'clock' },
  { type: 'filter', value: 'is:large', label: 'Large responses (>1MB)', icon: 'size' },
  { type: 'filter', value: 'is:json', label: 'JSON responses', icon: 'code' },
  { type: 'filter', value: 'is:image', label: 'Image responses', icon: 'image' },
];

export function useSearchSuggestions(query: string): SearchSuggestion[] {
  const { entries } = useTrafficStore();

  return useMemo(() => {
    const suggestions: SearchSuggestion[] = [];
    const queryLower = query.toLowerCase().trim();

    // If no query, show recent searches and filter patterns
    if (!queryLower) {
      // Add recent searches
      const recent = getRecentSearches();
      recent.slice(0, 5).forEach((search) => {
        suggestions.push({
          type: 'recent',
          value: search,
          label: search,
          icon: 'history',
        });
      });

      // Add filter patterns
      FILTER_PATTERNS.slice(0, 5).forEach((pattern) => {
        suggestions.push(pattern);
      });

      return suggestions;
    }

    // Match filter patterns
    const matchingFilters = FILTER_PATTERNS.filter(
      (f) =>
        f.value.toLowerCase().includes(queryLower) ||
        f.label.toLowerCase().includes(queryLower)
    );
    matchingFilters.slice(0, 3).forEach((f) => suggestions.push(f));

    // Extract unique hostnames from traffic
    const hosts = new Set<string>();
    entries.forEach((entry) => {
      if (entry.host.toLowerCase().includes(queryLower)) {
        hosts.add(entry.host);
      }
    });

    // Add host suggestions
    Array.from(hosts)
      .slice(0, 5)
      .forEach((host) => {
        suggestions.push({
          type: 'host',
          value: host,
          label: host,
          icon: 'globe',
        });
      });

    // Extract unique paths from traffic
    const paths = new Set<string>();
    entries.forEach((entry) => {
      try {
        const url = new URL(entry.url);
        if (url.pathname.toLowerCase().includes(queryLower)) {
          paths.add(url.pathname);
        }
      } catch {
        // Ignore invalid URLs
      }
    });

    // Add path suggestions
    Array.from(paths)
      .slice(0, 3)
      .forEach((path) => {
        suggestions.push({
          type: 'path',
          value: path,
          label: path,
          icon: 'file',
        });
      });

    // Add recent searches that match
    const recent = getRecentSearches();
    recent
      .filter((s) => s.toLowerCase().includes(queryLower))
      .slice(0, 2)
      .forEach((search) => {
        // Avoid duplicates
        if (!suggestions.some((s) => s.value === search)) {
          suggestions.push({
            type: 'recent',
            value: search,
            label: search,
            icon: 'history',
          });
        }
      });

    return suggestions.slice(0, 10);
  }, [query, entries]);
}
