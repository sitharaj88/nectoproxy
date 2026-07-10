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
import { Badge, Button, EmptyState, Kbd, cn, type BadgeProps } from '@/components/ui';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];

function getMethodTone(method: string): BadgeProps['tone'] {
  const tones: Record<string, BadgeProps['tone']> = {
    GET: 'success',
    POST: 'info',
    PUT: 'warn',
    PATCH: 'warn',
    DELETE: 'danger',
    OPTIONS: 'accent',
    HEAD: 'neutral',
  };
  return tones[method] || 'neutral';
}

function getMethodColor(method: string): string {
  const colors: Record<string, string> = {
    GET: 'bg-success/12 text-success',
    POST: 'bg-info/12 text-info',
    PUT: 'bg-warn/12 text-warn',
    PATCH: 'bg-warn/12 text-warn',
    DELETE: 'bg-danger/12 text-danger',
    OPTIONS: 'bg-accent/12 text-accent',
    HEAD: 'bg-surface-raised text-ink-muted',
  };
  return colors[method] || 'bg-surface-raised text-ink-muted';
}

function getStatusColor(status: number | null | undefined): string {
  if (!status) return 'text-ink-faint';
  if (status >= 200 && status < 300) return 'text-success';
  if (status >= 300 && status < 400) return 'text-warn';
  if (status >= 400) return 'text-danger';
  return 'text-ink-faint';
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

  const filtersActive = showFilters || searchIn.length > 0 || methodFilters.length > 0;

  const scopeChipClass = (active: boolean) =>
    cn(
      'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors border',
      active
        ? 'bg-accent/12 text-accent border-accent/25'
        : 'bg-surface-raised text-ink-muted border-edge hover:text-ink'
    );

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
            className="w-[720px] max-h-[80vh] overflow-hidden rounded-md bg-surface-overlay border border-edge shadow-popover flex flex-col"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleKeyDown}
          >
            {/* Search Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-edge">
              <Search className="w-5 h-5 text-ink-faint flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search across all sessions..."
                className="flex-1 bg-transparent text-ink placeholder:text-ink-faint outline-none text-sm"
                autoFocus
              />
              {isLoading && (
                <Loader2 className="w-4 h-4 text-accent animate-spin flex-shrink-0" />
              )}
              <Button
                variant="secondary"
                size="xs"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(filtersActive && 'bg-accent/12 text-accent border-accent/25 hover:bg-accent/20')}
              >
                Filters
                {(searchIn.length > 0 || methodFilters.length > 0) && (
                  <span className="ml-1">
                    ({searchIn.length + methodFilters.length})
                  </span>
                )}
              </Button>
              <Kbd>Esc</Kbd>
            </div>

            {/* Filter Options */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden border-b border-edge"
                >
                  <div className="px-4 py-3 space-y-3">
                    {/* Search Scope */}
                    <div>
                      <label className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-1.5 block">
                        Search in
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleSearchIn('url')}
                          className={scopeChipClass(searchIn.includes('url'))}
                        >
                          <Globe className="w-3 h-3" />
                          URL
                        </button>
                        <button
                          onClick={() => toggleSearchIn('headers')}
                          className={scopeChipClass(searchIn.includes('headers'))}
                        >
                          <FileText className="w-3 h-3" />
                          Headers
                        </button>
                        <button
                          onClick={() => toggleSearchIn('body')}
                          className={scopeChipClass(searchIn.includes('body'))}
                        >
                          <Code className="w-3 h-3" />
                          Body
                        </button>
                      </div>
                    </div>

                    {/* Method Filter */}
                    <div>
                      <label className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-1.5 block">
                        HTTP Method
                      </label>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {HTTP_METHODS.map((method) => (
                          <button
                            key={method}
                            onClick={() => toggleMethod(method)}
                            className={cn(
                              'px-2 py-1 rounded-md text-xs font-mono transition-colors border',
                              methodFilters.includes(method)
                                ? getMethodColor(method) + ' border-current/30'
                                : 'bg-surface-raised text-ink-muted border-edge hover:text-ink'
                            )}
                          >
                            {method}
                          </button>
                        ))}
                        {methodFilters.length > 0 && (
                          <Button variant="ghost" size="xs" onClick={() => setMethodFilters([])}>
                            Clear
                          </Button>
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
                <div className="px-4 py-2 border-b border-edge bg-surface">
                  <span className="text-xs text-ink-muted">
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
                  <p className="text-sm text-danger">{error}</p>
                </div>
              )}

              {/* Empty state */}
              {!isLoading && query.trim() && results && results.entries.length === 0 && (
                <EmptyState
                  icon={Search}
                  title={`No results found for "${query}"`}
                  description="Try adjusting your search query or filters"
                />
              )}

              {/* Initial state */}
              {!query.trim() && !results && (
                <EmptyState
                  icon={Search}
                  title="Search request and response content across all sessions"
                  description="Use filters to narrow results by URL, headers, or body content"
                />
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
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-raised transition-colors border-b border-edge-subtle group"
                      >
                        {/* Method badge */}
                        <Badge tone={getMethodTone(entry.method)} mono className="flex-shrink-0">
                          {entry.method}
                        </Badge>

                        {/* URL and details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-ink truncate" title={entry.url}>
                              {entry.host}
                              <span className="text-ink-muted">{pathDisplay}</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <Badge tone="neutral" className="text-[10px]">
                              {sessionName}
                            </Badge>
                            <span className="text-[10px] text-ink-faint">
                              {formatTimestamp(entry.timestamp)}
                            </span>
                            {entry.duration !== null && entry.duration !== undefined && (
                              <span className="text-[10px] text-ink-faint">
                                {formatDuration(entry.duration)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Status */}
                        <span
                          className={cn('flex-shrink-0 text-xs font-mono', getStatusColor(entry.status))}
                        >
                          {entry.status || 'pending'}
                        </span>

                        {/* Navigate icon */}
                        <ExternalLink className="w-3.5 h-3.5 text-ink-faint opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pagination */}
            {results && totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-2 border-t border-edge bg-surface">
                <span className="text-xs text-ink-muted">
                  Page {page + 1} of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= totalPages - 1}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="px-4 py-2 border-t border-edge flex items-center gap-3 text-[10px] text-ink-muted">
              <span className="flex items-center gap-1">
                <Kbd>↑↓</Kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <Kbd>Enter</Kbd>
                Open
              </span>
              <span className="flex items-center gap-1">
                <Kbd>Esc</Kbd>
                Close
              </span>
              <span className="ml-auto flex items-center gap-1">
                <Kbd>Ctrl+Shift+F</Kbd>
                Global Search
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
