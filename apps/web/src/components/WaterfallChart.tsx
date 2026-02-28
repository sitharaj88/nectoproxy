import { useMemo, useRef, useEffect } from 'react';
import type { TrafficEntry } from '@proxyscope/shared';
import { useActiveEntries, useTrafficStore } from '@/stores/trafficStore';

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
      <div className="flex items-center justify-center h-full text-gray-500">
        No traffic to display
      </div>
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
    if (entry.error) return 'bg-red-500';
    if (!entry.status) return 'bg-gray-500';
    if (entry.status >= 500) return 'bg-red-500';
    if (entry.status >= 400) return 'bg-yellow-500';
    if (entry.status >= 300) return 'bg-blue-500';
    return 'bg-green-500';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Time axis header */}
      <div className="flex-shrink-0 px-4 py-2 border-b border-gray-700 bg-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-48 text-xs font-medium text-gray-400">URL</div>
          <div className="flex-1 flex justify-between text-xs text-gray-500">
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
                className={`flex items-center gap-2 px-4 py-1 border-b border-gray-800 cursor-pointer hover:bg-gray-800/50 transition-colors ${
                  selectedId === entry.id ? 'bg-gray-800' : ''
                }`}
                onClick={() => setSelected(entry.id)}
              >
                {/* URL column */}
                <div className="w-48 flex-shrink-0 truncate">
                  <span
                    className={`text-xs font-mono ${
                      entry.method === 'GET'
                        ? 'text-green-400'
                        : entry.method === 'POST'
                        ? 'text-blue-400'
                        : entry.method === 'PUT'
                        ? 'text-yellow-400'
                        : entry.method === 'DELETE'
                        ? 'text-red-400'
                        : 'text-gray-400'
                    }`}
                  >
                    {entry.method}
                  </span>
                  <span className="text-xs text-gray-500 ml-1 truncate">
                    {new URL(entry.url).pathname}
                  </span>
                </div>

                {/* Timeline bar */}
                <div className="flex-1 h-5 relative bg-gray-900 rounded">
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
                      className="absolute h-full bg-gray-600 rounded animate-pulse"
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
                          ? 'text-red-400'
                          : entry.status >= 400
                          ? 'text-yellow-400'
                          : entry.status >= 300
                          ? 'text-blue-400'
                          : 'text-green-400'
                      }`}
                    >
                      {entry.status}
                    </span>
                  ) : entry.error ? (
                    <span className="text-xs text-red-400">ERR</span>
                  ) : (
                    <span className="text-xs text-gray-500">...</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex-shrink-0 px-4 py-2 border-t border-gray-700 bg-gray-800">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-green-500" />
            <span>2xx</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-blue-500" />
            <span>3xx</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-yellow-500" />
            <span>4xx</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-red-500" />
            <span>5xx/Error</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-gray-500" />
            <span>Pending</span>
          </div>
          <div className="ml-auto text-gray-600">
            Showing {displayEntries.length} of {entries.length} requests
          </div>
        </div>
      </div>
    </div>
  );
}
