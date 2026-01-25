import { useRef, type RefObject } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useFilteredEntries, useTrafficStore } from '@/stores/trafficStore';
import { TrafficContextMenu } from './TrafficContextMenu';
import type { TrafficEntry } from '@proxyscope/shared';
import { Loader2 } from 'lucide-react';

interface TrafficListProps {
  searchInputRef?: RefObject<HTMLInputElement>;
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

function getMethodClass(method: string): string {
  const classes: Record<string, string> = {
    GET: 'method-get',
    POST: 'method-post',
    PUT: 'method-put',
    PATCH: 'method-patch',
    DELETE: 'method-delete',
    OPTIONS: 'method-options',
    HEAD: 'method-head',
  };
  return classes[method] || 'text-gray-400';
}

function getStatusClass(status: number | null): string {
  if (!status) return 'text-gray-500';
  if (status >= 200 && status < 300) return 'status-2xx';
  if (status >= 300 && status < 400) return 'status-3xx';
  if (status >= 400 && status < 500) return 'status-4xx';
  if (status >= 500) return 'status-5xx';
  return 'text-gray-500';
}

interface TrafficRowProps {
  entry: TrafficEntry;
  isSelected: boolean;
  onClick: () => void;
}

function TrafficRow({ entry, isSelected, onClick }: TrafficRowProps) {
  const url = new URL(entry.url);
  const pathWithQuery = url.pathname + url.search;

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 border-b border-gray-800 cursor-pointer hover:bg-gray-800 transition-colors ${
        isSelected ? 'bg-gray-700' : ''
      }`}
    >
      {/* Status */}
      <div className="w-12 text-center">
        {entry.isComplete ? (
          <span className={`text-sm font-medium ${getStatusClass(entry.status)}`}>
            {entry.status || '-'}
          </span>
        ) : (
          <Loader2 className="w-4 h-4 animate-spin text-gray-400 mx-auto" />
        )}
      </div>

      {/* Method */}
      <div className={`w-16 text-sm font-medium ${getMethodClass(entry.method)}`}>
        {entry.method}
      </div>

      {/* Protocol */}
      <div className="w-12 text-xs text-gray-500 uppercase">{entry.protocol}</div>

      {/* Host */}
      <div className="w-48 text-sm text-gray-300 truncate" title={entry.host}>
        {entry.host}
      </div>

      {/* Path */}
      <div className="flex-1 text-sm text-gray-400 truncate font-mono" title={pathWithQuery}>
        {pathWithQuery}
      </div>

      {/* Duration */}
      <div className="w-20 text-right text-sm text-gray-500">
        {formatDuration(entry.duration)}
      </div>

      {/* Size */}
      <div className="w-20 text-right text-sm text-gray-500">
        {formatSize(entry.responseBodySize)}
      </div>
    </div>
  );
}

export function TrafficList({ searchInputRef: _searchInputRef }: TrafficListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const entries = useFilteredEntries();
  const selectedId = useTrafficStore((state) => state.selectedId);
  const setSelected = useTrafficStore((state) => state.setSelected);
  const setFilter = useTrafficStore((state) => state.setFilter);

  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 20,
  });

  if (entries.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-lg">No requests captured yet</p>
          <p className="text-sm mt-2">
            Configure your browser or application to use the proxy
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 border-b border-gray-700 text-xs text-gray-400 font-medium">
        <div className="w-12 text-center">Status</div>
        <div className="w-16">Method</div>
        <div className="w-12">Proto</div>
        <div className="w-48">Host</div>
        <div className="flex-1">Path</div>
        <div className="w-20 text-right">Time</div>
        <div className="w-20 text-right">Size</div>
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
