import { useMemo, useRef, useEffect } from 'react';
import { BarChart3 } from 'lucide-react';
import type { TrafficEntry } from '@nectoproxy/shared';
import { useActiveEntries, useTrafficStore } from '@/stores/trafficStore';
import { EmptyState } from './ui/EmptyState';

interface WaterfallChartProps {
  maxEntries?: number;
}

export function WaterfallChart({ maxEntries = 100 }: WaterfallChartProps) {
  const entries = useActiveEntries();
  const setSelected = useTrafficStore((state) => state.setSelected);
  const selectedId = useTrafficStore((state) => state.selectedId);
  const chartRef = useRef<HTMLDivElement>(null);

  // Calculate time range and prepare data
  const chartData = useMemo(() => {
    const displayEntries = entries.slice(0, maxEntries);
    if (displayEntries.length === 0) return null;

    // Find the time range
    const minTime = Math.min(...displayEntries.map((e) => e.timestamp));
    const maxTime = Math.max(
      ...displayEntries.map((e) => e.timestamp + (e.duration || 0))
    );
    const totalDuration = maxTime - minTime || 1; // Avoid division by zero

    return {
      entries: displayEntries,
      minTime,
      maxTime,
      totalDuration,
    };
  }, [entries, maxEntries]);

  // Scroll to selected entry
  useEffect(() => {
    if (selectedId && chartRef.current) {
      const element = chartRef.current.querySelector(`[data-entry-id="${selectedId}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedId]);

  if (!chartData) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Nothing to chart yet"
        description="The waterfall view will populate once requests start flowing through the proxy."
      />
    );
  }

  const { entries: displayEntries, minTime, totalDuration } = chartData;

  // Format time for axis labels
  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m${Math.round((ms % 60000) / 1000)}s`;
  };

  // Generate time axis labels
  const axisLabels = [];
  const labelCount = 5;
  for (let i = 0; i <= labelCount; i++) {
    axisLabels.push(formatTime((totalDuration / labelCount) * i));
  }

  // Get color based on status
  const getStatusColor = (entry: TrafficEntry): string => {
    if (entry.error) return 'bg-danger';
    if (!entry.status) return 'bg-ink-faint';
    if (entry.status >= 500) return 'bg-danger';
    if (entry.status >= 400) return 'bg-warn';
    if (entry.status >= 300) return 'bg-info';
    return 'bg-success';
  };

  return (
    <div className="flex flex-col h-full bg-canvas">
      {/* Time axis header */}
      <div className="flex-shrink-0 px-4 py-2 border-b border-edge bg-surface-raised">
        <div className="flex items-center gap-2">
          <div className="w-48 text-xs font-medium text-ink-muted">URL</div>
          <div className="flex-1 flex justify-between text-xs text-ink-faint">
            {axisLabels.map((label, i) => (
              <span key={i}>{label}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Chart body */}
      <div ref={chartRef} className="flex-1 overflow-auto">
        <div className="min-w-full">
          {displayEntries.map((entry) => {
            const startOffset =
              ((entry.timestamp - minTime) / totalDuration) * 100;
            const duration = entry.duration || 0;
            const width = Math.max((duration / totalDuration) * 100, 0.5); // Min 0.5% width for visibility

            return (
              <div
                key={entry.id}
                data-entry-id={entry.id}
                className={`flex items-center gap-2 px-4 py-1 border-b border-edge-subtle cursor-pointer hover:bg-surface/50 transition-colors ${
                  selectedId === entry.id ? 'bg-surface' : ''
                }`}
                onClick={() => setSelected(entry.id)}
              >
                {/* URL column */}
                <div className="w-48 flex-shrink-0 truncate">
                  <span
                    className={`text-xs font-mono ${
                      entry.method === 'GET'
                        ? 'text-success'
                        : entry.method === 'POST'
                        ? 'text-info'
                        : entry.method === 'PUT'
                        ? 'text-warn'
                        : entry.method === 'DELETE'
                        ? 'text-danger'
                        : 'text-ink-muted'
                    }`}
                  >
                    {entry.method}
                  </span>
                  <span className="text-xs text-ink-faint ml-1 truncate">
                    {new URL(entry.url).pathname}
                  </span>
                </div>

                {/* Timeline bar */}
                <div className="flex-1 h-5 relative bg-canvas rounded">
                  <div
                    className={`absolute h-full rounded ${getStatusColor(entry)} opacity-80 hover:opacity-100 transition-opacity`}
                    style={{
                      left: `${startOffset}%`,
                      width: `${width}%`,
                      minWidth: '4px',
                    }}
                    title={`${entry.method} ${entry.url}\nStatus: ${entry.status || 'pending'}\nDuration: ${duration}ms`}
                  >
                    {/* Show duration label if bar is wide enough */}
                    {width > 5 && (
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-medium">
                        {duration}ms
                      </span>
                    )}
                  </div>

                  {/* Waiting indicator (connection time) */}
                  {!entry.isComplete && (
                    <div
                      className="absolute h-full bg-edge-strong rounded animate-pulse"
                      style={{
                        left: `${startOffset}%`,
                        width: '4px',
                      }}
                    />
                  )}
                </div>

                {/* Status badge */}
                <div className="w-12 flex-shrink-0 text-right">
                  {entry.status ? (
                    <span
                      className={`text-xs font-medium ${
                        entry.status >= 500
                          ? 'text-danger'
                          : entry.status >= 400
                          ? 'text-warn'
                          : entry.status >= 300
                          ? 'text-info'
                          : 'text-success'
                      }`}
                    >
                      {entry.status}
                    </span>
                  ) : entry.error ? (
                    <span className="text-xs text-danger">ERR</span>
                  ) : (
                    <span className="text-xs text-ink-faint">...</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex-shrink-0 px-4 py-2 border-t border-edge bg-surface-raised">
        <div className="flex items-center gap-4 text-xs text-ink-muted">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-success" />
            <span>2xx</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-info" />
            <span>3xx</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-warn" />
            <span>4xx</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-danger" />
            <span>5xx/Error</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-ink-faint" />
            <span>Pending</span>
          </div>
          <div className="ml-auto text-ink-faint">
            Showing {displayEntries.length} of {entries.length} requests
          </div>
        </div>
      </div>
    </div>
  );
}
