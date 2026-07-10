import { useRef, useMemo, useCallback, type RefObject, type KeyboardEvent } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useActiveEntries, useTrafficStore } from '@/stores/trafficStore';
import { useCompareStore } from '@/stores/compareStore';
import { useRulesStore } from '@/stores/rulesStore';
import { TrafficContextMenu } from './TrafficContextMenu';
import type { TrafficEntry, Rule } from '@nectoproxy/shared';
import { Loader2, Square, CheckSquare, ArrowLeftRight, X, Gauge, Network } from 'lucide-react';
import { Badge, statusTone, Button, IconButton, EmptyState, cn, type BadgeProps } from './ui';
import { isGraphQLRequest, parseGraphQLRequest } from '@/utils/graphql';
import { isGRPCRequest } from '@/utils/grpc';

interface TrafficListProps {
  searchInputRef?: RefObject<HTMLInputElement>;
  onOpenCompare?: () => void;
}

function formatDuration(ms: number | null): string {
  if (ms === null) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatSize(bytes: number | null): string {
  if (bytes === null || bytes === 0) return '-';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

/** Map an HTTP method to a Badge tone (+ optional className), preserving the original color intent. */
function methodBadge(method: string): { tone: BadgeProps['tone']; className?: string } {
  switch (method) {
    case 'GET':
      return { tone: 'success' };
    case 'POST':
      return { tone: 'info' };
    case 'PUT':
      return { tone: 'warn' };
    case 'PATCH':
      return { tone: 'warn', className: 'bg-orange-500/12 text-orange-400 border-orange-500/25' };
    case 'DELETE':
      return { tone: 'danger' };
    case 'OPTIONS':
      return { tone: 'neutral' };
    case 'HEAD':
      return { tone: 'neutral', className: 'bg-purple-500/12 text-purple-400 border-purple-500/25' };
    default:
      return { tone: 'neutral' };
  }
}

function bodyToString(body: unknown): string | null {
  if (!body) return null;
  if (typeof body === 'string') {
    try { return atob(body); } catch { return body; }
  }
  if (body instanceof ArrayBuffer) return new TextDecoder().decode(body);
  if (body instanceof Uint8Array) return new TextDecoder().decode(body);
  if (typeof body === 'object' && body !== null && 'type' in body && (body as Record<string, unknown>).type === 'Buffer' && 'data' in body) {
    return new TextDecoder().decode(new Uint8Array((body as Record<string, unknown>).data as number[]));
  }
  return JSON.stringify(body);
}

function getProtocolBadge(entry: TrafficEntry): { label: string; className: string } | null {
  const bodyStr = bodyToString(entry.requestBody);

  if (isGRPCRequest(entry.requestHeaders)) {
    return {
      label: 'gRPC',
      className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    };
  }

  if (isGraphQLRequest(entry.url, entry.requestHeaders, bodyStr)) {
    return {
      label: 'GQL',
      className: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    };
  }

  return null;
}

function getGraphQLOperationName(entry: TrafficEntry): string | null {
  const bodyStr = bodyToString(entry.requestBody);
  if (!bodyStr) return null;
  if (!isGraphQLRequest(entry.url, entry.requestHeaders, bodyStr)) return null;
  const parsed = parseGraphQLRequest(bodyStr);
  return parsed?.operationName || null;
}

/**
 * Client-side URL pattern matching for throttle rule indicators.
 * Mirrors the server-side RuleMatcher pattern matching behavior.
 */
function matchesUrlPattern(pattern: string, url: string): boolean {
  // Check if pattern is a regex string (starts and ends with /)
  if (pattern.startsWith('/') && pattern.lastIndexOf('/') > 0) {
    const lastSlash = pattern.lastIndexOf('/');
    const regexBody = pattern.slice(1, lastSlash);
    const flags = pattern.slice(lastSlash + 1);
    try {
      const regex = new RegExp(regexBody, flags);
      return regex.test(url);
    } catch {
      // Invalid regex, fall through to glob matching
    }
  }

  // Support glob-like patterns with * wildcard
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');

  const regex = new RegExp(`^${escaped}$`, 'i');
  return regex.test(url);
}

function isThrottleOrDelayRule(rule: Rule): boolean {
  return rule.enabled && (rule.action === 'throttle' || rule.action === 'delay');
}

function isEntryThrottled(entry: TrafficEntry, throttleRules: Rule[]): boolean {
  for (const rule of throttleRules) {
    if (rule.match.url) {
      if (matchesUrlPattern(String(rule.match.url), entry.url)) return true;
    } else if (rule.match.host) {
      if (matchesUrlPattern(rule.match.host, entry.host)) return true;
    } else if (rule.match.path) {
      if (matchesUrlPattern(String(rule.match.path), entry.path)) return true;
    } else {
      // Rule matches all requests
      return true;
    }
  }
  return false;
}

interface TrafficRowProps {
  entry: TrafficEntry;
  isSelected: boolean;
  onClick: () => void;
  isCompareMode?: boolean;
  isCompareSelected?: boolean;
  onCompareToggle?: () => void;
  isThrottled?: boolean;
}

function TrafficRow({ entry, isSelected, onClick, isCompareMode, isCompareSelected, onCompareToggle, isThrottled }: TrafficRowProps) {
  const url = new URL(entry.url);
  const pathWithQuery = url.pathname + url.search;

  const protocolBadge = useMemo(() => getProtocolBadge(entry), [entry]);
  const graphqlOpName = useMemo(() => getGraphQLOperationName(entry), [entry]);

  // For GraphQL requests, show operation name instead of /graphql path
  const displayPath = graphqlOpName
    ? `${pathWithQuery} - ${graphqlOpName}`
    : pathWithQuery;

  const handleClick = () => {
    if (isCompareMode && onCompareToggle) {
      onCompareToggle();
    } else {
      onClick();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  const mb = methodBadge(entry.method);

  return (
    <div
      role="row"
      tabIndex={0}
      aria-selected={isSelected}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 border-b border-edge-subtle border-l-2 border-l-transparent',
        'cursor-pointer transition-colors outline-none',
        'hover:bg-surface-raised focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/60',
        (isSelected || isCompareSelected) && 'bg-accent/10 border-l-accent'
      )}
    >
      {/* Compare Checkbox */}
      {isCompareMode && (
        <div className="w-6 flex-shrink-0">
          {isCompareSelected ? (
            <CheckSquare className="w-4 h-4 text-accent" />
          ) : (
            <Square className="w-4 h-4 text-ink-faint" />
          )}
        </div>
      )}
      {/* Status */}
      <div className="w-12 flex justify-center">
        {entry.isComplete ? (
          entry.status ? (
            <Badge tone={statusTone(entry.status)} mono>{entry.status}</Badge>
          ) : (
            <span className="text-sm text-ink-faint">-</span>
          )
        ) : (
          <Loader2 className="w-4 h-4 animate-spin text-ink-muted" />
        )}
      </div>

      {/* Method + Protocol Badge */}
      <div className="w-24 flex items-center gap-1">
        <Badge tone={mb.tone} mono className={mb.className}>{entry.method}</Badge>
        {protocolBadge && (
          <Badge tone="neutral" className={protocolBadge.className}>{protocolBadge.label}</Badge>
        )}
      </div>

      {/* Protocol */}
      <div className="w-12 text-xs text-ink-faint uppercase">{entry.protocol}</div>

      {/* Host */}
      <div className="w-48 text-sm text-ink-secondary truncate" title={entry.host}>
        {entry.host}
      </div>

      {/* Path */}
      <div className="flex-1 text-sm text-ink-muted truncate font-mono" title={displayPath}>
        {displayPath}
      </div>

      {/* Throttle Indicator */}
      {isThrottled && (
        <div className="w-5 flex-shrink-0" title="Throttled">
          <Gauge className="w-3.5 h-3.5 text-orange-400" />
        </div>
      )}

      {/* Duration */}
      <div className="w-20 text-right text-sm text-ink-faint tabular-nums">
        {formatDuration(entry.duration)}
      </div>

      {/* Size */}
      <div className="w-20 text-right text-sm text-ink-faint tabular-nums">
        {formatSize(entry.responseBodySize)}
      </div>
    </div>
  );
}

export function TrafficList({ searchInputRef: _searchInputRef, onOpenCompare }: TrafficListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const entries = useActiveEntries();
  const selectedId = useTrafficStore((state) => state.selectedId);
  const setSelected = useTrafficStore((state) => state.setSelected);
  const setFilter = useTrafficStore((state) => state.setFilter);
  const rules = useRulesStore((state) => state.rules);

  const { isCompareMode, selectedIds: compareSelectedIds, toggleSelection, canCompare, exitCompareMode } = useCompareStore();

  // Memoize throttle rules for performance
  const throttleRules = useMemo(
    () => rules.filter(isThrottleOrDelayRule),
    [rules]
  );

  // Memoize the check function
  const checkThrottled = useCallback(
    (entry: TrafficEntry) => throttleRules.length > 0 && isEntryThrottled(entry, throttleRules),
    [throttleRules]
  );

  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32,
    overscan: 20,
  });

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={Network}
        title="Waiting for traffic"
        description={
          <div className="space-y-2">
            <p>
              Set your system or browser HTTP proxy to <code className="px-1 py-0.5 rounded bg-surface-raised text-ink-secondary">localhost:8888</code>,
              then make a request.
            </p>
            <p>
              For HTTPS, install the CA certificate via the download button in the header.
            </p>
          </div>
        }
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Compare Mode Banner */}
      {isCompareMode && (
        <div className="flex items-center justify-between px-3 py-2 bg-accent/10 border-b border-accent/30">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-accent" />
            <span className="text-sm text-ink-secondary">
              {compareSelectedIds.length === 0
                ? 'Select 2 requests to compare'
                : compareSelectedIds.length === 1
                ? 'Select 1 more request to compare'
                : 'Ready to compare'}
            </span>
            <span className="text-xs text-accent bg-accent/15 px-2 py-0.5 rounded tabular-nums">
              {compareSelectedIds.length}/2 selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            {canCompare() && onOpenCompare && (
              <Button variant="primary" onClick={onOpenCompare}>
                <ArrowLeftRight className="w-3.5 h-3.5" />
                Compare Now
              </Button>
            )}
            <IconButton
              label="Exit compare mode"
              icon={<X className="w-4 h-4" />}
              onClick={exitCompareMode}
            />
          </div>
        </div>
      )}

      {/* Header */}
      <div
        role="row"
        className="flex items-center gap-2 px-3 py-1.5 bg-surface-raised border-b border-edge text-xs text-ink-muted font-medium"
      >
        {isCompareMode && <div className="w-6" aria-hidden="true" />}
        <div className="w-12 text-center" title="HTTP response status code">Status</div>
        <div className="w-24" title="HTTP request method (GET, POST, …) and protocol badge (GraphQL/gRPC)">Method</div>
        <div className="w-12" title="URL protocol (http, https, ws, wss)">Proto</div>
        <div className="w-48" title="Request host">Host</div>
        <div className="flex-1" title="Path and query — for GraphQL, also the operation name">Path</div>
        <div className="w-20 text-right" title="Request duration">Time</div>
        <div className="w-20 text-right" title="Response body size">Size</div>
      </div>

      {/* Virtualized list */}
      <div ref={parentRef} className="flex-1 overflow-auto">
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const entry = entries[virtualRow.index];
            return (
              <div
                key={virtualRow.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <TrafficContextMenu
                  entry={entry}
                  onFilterByHost={(host) => setFilter({ search: host })}
                >
                  <TrafficRow
                    entry={entry}
                    isSelected={entry.id === selectedId}
                    onClick={() => setSelected(entry.id)}
                    isCompareMode={isCompareMode}
                    isCompareSelected={compareSelectedIds.includes(entry.id)}
                    onCompareToggle={() => toggleSelection(entry.id)}
                    isThrottled={checkThrottled(entry)}
                  />
                </TrafficContextMenu>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
