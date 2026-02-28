import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Loader2,
  Globe,
  FileText,
  Code,
  ExternalLink,
} from 'lucide-react';
import { searchTrafficGlobal, activateSession as activateSessionApi, type GlobalSearchResult } from '@/services/api';
import { useTrafficStore } from '@/stores/trafficStore';
import { useSessionStore } from '@/stores/sessionStore';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];

function getMethodColor(method: string): string {
  const colors: Record<string, string> = {
    GET: 'bg-green-600/20 text-green-400',
    POST: 'bg-blue-600/20 text-blue-400',
    PUT: 'bg-yellow-600/20 text-yellow-400',
    PATCH: 'bg-orange-600/20 text-orange-400',
    DELETE: 'bg-red-600/20 text-red-400',
    OPTIONS: 'bg-purple-600/20 text-purple-400',
    HEAD: 'bg-gray-600/20 text-gray-400',
  };
  return colors[method] || 'bg-gray-600/20 text-gray-400';
}

function getStatusColor(status: number | null | undefined): string {
  if (!status) return 'text-gray-500';
  if (status >= 200 && status < 300) return 'text-green-400';
  if (status >= 300 && status < 400) return 'text-yellow-400';
  if (status >= 400 && status < 500) return 'text-red-400';
  if (status >= 500) return 'text-red-500';
  return 'text-gray-500';
}

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [searchIn, setSearchIn] = useState<string[]>(['url']);
  const [methodFilters, setMethodFilters] = useState<string[]>([]);
  const [results, setResults] = useState<GlobalSearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setSelected = useTrafficStore((state) => state.setSelected);
  const setActiveTab = useSessionStore((state) => state.setActiveTab);
  const PAGE_SIZE = 50;

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      // Small timeout to ensure the modal is rendered
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    } else {
      // Reset state when closing
      setQuery('');
      setResults(null);
      setError(null);
      setPage(0);
    }
  }, [isOpen]);

  const executeSearch = useCallback(
    async (searchQuery: string, searchPage: number = 0) => {
      if (!searchQuery.trim()) {
        setResults(null);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await searchTrafficGlobal({
          query: searchQuery.trim(),
          searchIn: searchIn.length > 0 ? searchIn : undefined,
          methods: methodFilters.length > 0 ? methodFilters : undefined,
          limit: PAGE_SIZE,
          offset: searchPage * PAGE_SIZE,
        });
        setResults(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
        setResults(null);
      } finally {
        setIsLoading(false);
      }
    },
    [searchIn, methodFilters]
  );

  // Debounced search
  useEffect(() => {
    if (!isOpen) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!query.trim()) {
      setResults(null);
      return;
    }

    debounceRef.current = setTimeout(() => {
      setPage(0);
      executeSearch(query, 0);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, isOpen, executeSearch]);

  // Re-search when filters change (only if there's a query)
  useEffect(() => {
    if (!isOpen || !query.trim()) return;
    setPage(0);
    executeSearch(query, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchIn, methodFilters]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    executeSearch(query, newPage);
  };

  const handleResultClick = async (entry: GlobalSearchResult['entries'][0]) => {
    // Activate the entry's session on the server and switch to the live tab
    try {
      await activateSessionApi(entry.sessionId);
      setActiveTab('live');
    } catch {
      // If session activation fails, still try selecting
    }
    setSelected(entry.id);
    onClose();
  };

  const toggleSearchIn = (field: string) => {
    setSearchIn((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const toggleMethod = (method: string) => {
    setMethodFilters((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const uniqueSessionCount = results
    ? new Set(results.entries.map((e) => e.sessionId)).size
    : 0;

  const totalPages = results ? Math.ceil(results.total / PAGE_SIZE) : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh] bg-black/50"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className="w-[720px] max-h-[80vh] overflow-hidden rounded-xl bg-gray-800 border border-gray-700 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleKeyDown}
          >
            {/* Search Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-700">
              <Search className="w-5 h-5 text-gray-500 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search across all sessions..."
                className="flex-1 bg-transparent text-gray-100 placeholder-gray-500 outline-none text-sm"
                autoFocus
              />
              {isLoading && (
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" />
              )}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  showFilters || searchIn.length > 0 || methodFilters.length > 0
                    ? 'bg-blue-600/20 text-blue-400'
                    : 'bg-gray-700 text-gray-400 hover:text-gray-200'
                }`}
              >
                Filters
                {(searchIn.length > 0 || methodFilters.length > 0) && (
                  <span className="ml-1">
                    ({searchIn.length + methodFilters.length})
                  </span>
                )}
              </button>
              <kbd className="px-2 py-1 text-xs font-mono bg-gray-900 text-gray-400 rounded border border-gray-600 flex-shrink-0">
                Esc
              </kbd>
            </div>

            {/* Filter Options */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden border-b border-gray-700"
                >
                  <div className="px-4 py-3 space-y-3">
                    {/* Search Scope */}
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 block">
                        Search in
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleSearchIn('url')}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-colors ${
                            searchIn.includes('url')
                              ? 'bg-blue-600/20 text-blue-400 border border-blue-600/40'
                              : 'bg-gray-700 text-gray-400 border border-gray-600 hover:text-gray-200'
                          }`}
                        >
                          <Globe className="w-3 h-3" />
                          URL
                        </button>
                        <button
                          onClick={() => toggleSearchIn('headers')}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-colors ${
                            searchIn.includes('headers')
                              ? 'bg-blue-600/20 text-blue-400 border border-blue-600/40'
                              : 'bg-gray-700 text-gray-400 border border-gray-600 hover:text-gray-200'
                          }`}
                        >
                          <FileText className="w-3 h-3" />
                          Headers
                        </button>
                        <button
                          onClick={() => toggleSearchIn('body')}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-colors ${
                            searchIn.includes('body')
                              ? 'bg-blue-600/20 text-blue-400 border border-blue-600/40'
                              : 'bg-gray-700 text-gray-400 border border-gray-600 hover:text-gray-200'
                          }`}
                        >
                          <Code className="w-3 h-3" />
                          Body
                        </button>
                      </div>
                    </div>

                    {/* Method Filter */}
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 block">
                        HTTP Method
                      </label>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {HTTP_METHODS.map((method) => (
                          <button
                            key={method}
                            onClick={() => toggleMethod(method)}
                            className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
                              methodFilters.includes(method)
                                ? getMethodColor(method) + ' border border-current/30'
                                : 'bg-gray-700 text-gray-400 border border-gray-600 hover:text-gray-200'
                            }`}
                          >
                            {method}
                          </button>
                        ))}
                        {methodFilters.length > 0 && (
                          <button
                            onClick={() => setMethodFilters([])}
                            className="px-2 py-1 text-xs text-gray-500 hover:text-gray-300"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Results */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {/* Result count summary */}
              {results && query.trim() && (
                <div className="px-4 py-2 border-b border-gray-700 bg-gray-900/50">
                  <span className="text-xs text-gray-400">
                    {results.total} result{results.total !== 1 ? 's' : ''} found
                    {uniqueSessionCount > 0 && (
                      <> across {uniqueSessionCount} session{uniqueSessionCount !== 1 ? 's' : ''}</>
                    )}
                  </span>
                </div>
              )}

              {/* Error state */}
              {error && (
                <div className="px-4 py-6 text-center">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {/* Empty state */}
              {!isLoading && query.trim() && results && results.entries.length === 0 && (
                <div className="px-4 py-12 text-center">
                  <Search className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">No results found for "{query}"</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Try adjusting your search query or filters
                  </p>
                </div>
              )}

              {/* Initial state */}
              {!query.trim() && !results && (
                <div className="px-4 py-12 text-center">
                  <Search className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">Search request and response content across all sessions</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Use filters to narrow results by URL, headers, or body content
                  </p>
                </div>
              )}

              {/* Results list */}
              {results && results.entries.length > 0 && (
                <div>
                  {results.entries.map((entry) => {
                    const sessionName = results.sessionNames[entry.sessionId] || 'Unknown Session';
                    let pathDisplay = '';
                    try {
                      const url = new URL(entry.url);
                      pathDisplay = url.pathname + url.search;
                    } catch {
                      pathDisplay = entry.path || entry.url;
                    }

                    return (
                      <button
                        key={entry.id}
                        onClick={() => handleResultClick(entry)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-700/50 transition-colors border-b border-gray-800 group"
                      >
                        {/* Method badge */}
                        <span
                          className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${getMethodColor(entry.method)}`}
                        >
                          {entry.method}
                        </span>

                        {/* URL and details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-200 truncate" title={entry.url}>
                              {entry.host}
                              <span className="text-gray-400">{pathDisplay}</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-[10px] text-gray-500 bg-gray-700/50 px-1.5 py-0.5 rounded">
                              {sessionName}
                            </span>
                            <span className="text-[10px] text-gray-500">
                              {formatTimestamp(entry.timestamp)}
                            </span>
                            {entry.duration !== null && entry.duration !== undefined && (
                              <span className="text-[10px] text-gray-500">
                                {formatDuration(entry.duration)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Status */}
                        <span
                          className={`flex-shrink-0 text-xs font-mono ${getStatusColor(entry.status)}`}
                        >
                          {entry.status || 'pending'}
                        </span>

                        {/* Navigate icon */}
                        <ExternalLink className="w-3.5 h-3.5 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pagination */}
            {results && totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-2 border-t border-gray-700 bg-gray-900/50">
                <span className="text-xs text-gray-500">
                  Page {page + 1} of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 0}
                    className="px-2 py-1 text-xs rounded bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= totalPages - 1}
                    className="px-2 py-1 text-xs rounded bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="px-4 py-2 border-t border-gray-700 flex items-center gap-3 text-[10px] text-gray-500">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-gray-700 rounded">↑↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-gray-700 rounded">Enter</kbd>
                Open
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-gray-700 rounded">Esc</kbd>
                Close
              </span>
              <span className="ml-auto flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-gray-700 rounded">Ctrl+Shift+F</kbd>
                Global Search
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
