import { useTrafficStore } from '@/stores/trafficStore';
import type { TrafficEntry } from '@proxyscope/shared';

interface TopSlowestRequestsProps {
  requests: TrafficEntry[];
}

function getDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url;
  }
}

function getPath(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname;
  } catch {
    return url;
  }
}

export function TopSlowestRequests({ requests }: TopSlowestRequestsProps) {
  const setSelected = useTrafficStore((state) => state.setSelected);

  if (requests.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Slowest Requests</h3>
        <p className="text-sm text-gray-500 text-center py-4">No requests yet</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-300 mb-3">Slowest Requests</h3>
      <div className="space-y-2">
        {requests.map((request, index) => (
          <button
            key={request.id}
            onClick={() => setSelected(request.id)}
            className="w-full flex items-center gap-3 p-2 rounded bg-gray-700/50 hover:bg-gray-700 transition-colors text-left"
          >
            <span className="text-xs text-gray-500 w-5">#{index + 1}</span>
            <span className={`text-xs font-mono method-${request.method.toLowerCase()} w-12`}>
              {request.method}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-gray-300 truncate">{getPath(request.url)}</div>
              <div className="text-xs text-gray-500 truncate">{getDomain(request.url)}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-yellow-400">
                {request.duration ? `${request.duration}ms` : '-'}
              </div>
              <div className={`text-xs ${
                request.status && request.status >= 400 ? 'text-red-400' : 'text-gray-500'
              }`}>
                {request.status || 'Pending'}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
