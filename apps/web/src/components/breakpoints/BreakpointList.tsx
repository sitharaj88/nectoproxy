import type { Breakpoint } from '@proxyscope/shared';

interface BreakpointListProps {
  breakpoints: Breakpoint[];
  onToggle: (id: string) => void;
  onEdit: (breakpoint: Breakpoint) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

export function BreakpointList({
  breakpoints,
  onToggle,
  onEdit,
  onDelete,
  onAdd,
}: BreakpointListProps) {
  return (
    <div className="p-4">
      {/* Add button */}
      <div className="mb-4">
        <button
          onClick={onAdd}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Breakpoint
        </button>
      </div>

      {/* Breakpoints list */}
      {breakpoints.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p className="text-lg font-medium">No breakpoints configured</p>
          <p className="text-sm mt-1">Add a breakpoint to pause requests and inspect them</p>
        </div>
      ) : (
        <div className="space-y-2">
          {breakpoints.map((bp) => (
            <div
              key={bp.id}
              className={`p-4 rounded-lg border ${
                bp.enabled
                  ? 'bg-gray-700/50 border-gray-600'
                  : 'bg-gray-800/50 border-gray-700 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Enable toggle */}
                  <button
                    onClick={() => onToggle(bp.id)}
                    className={`w-10 h-6 rounded-full transition-colors ${
                      bp.enabled ? 'bg-blue-600' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 bg-white rounded-full transform transition-transform ${
                        bp.enabled ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{bp.name}</span>
                      <span
                        className={`px-2 py-0.5 text-xs rounded ${
                          bp.type === 'request'
                            ? 'bg-green-900/50 text-green-400'
                            : bp.type === 'response'
                            ? 'bg-purple-900/50 text-purple-400'
                            : 'bg-blue-900/50 text-blue-400'
                        }`}
                      >
                        {bp.type}
                      </span>
                      {bp.conditions && bp.conditions.length > 0 && (
                        <span
                          className="px-2 py-0.5 text-xs rounded bg-yellow-900/50 text-yellow-400"
                          title={`${bp.conditions.length} condition${bp.conditions.length > 1 ? 's' : ''} (${bp.conditionLogic || 'and'})`}
                        >
                          {bp.conditions.length} condition{bp.conditions.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      {formatMatcher(bp.match)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEdit(bp)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded"
                    title="Edit"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => onDelete(bp.id)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatMatcher(match: Breakpoint['match']): string {
  const parts: string[] = [];

  if (match.url) {
    const urlStr = typeof match.url === 'string' ? match.url : match.url.source;
    parts.push(`URL: ${urlStr}`);
  }
  if (match.method) {
    const methodStr = Array.isArray(match.method) ? match.method.join(', ') : match.method;
    parts.push(`Method: ${methodStr}`);
  }
  if (match.host) {
    parts.push(`Host: ${match.host}`);
  }
  if (match.path) {
    const pathStr = typeof match.path === 'string' ? match.path : match.path.source;
    parts.push(`Path: ${pathStr}`);
  }

  return parts.length > 0 ? parts.join(' | ') : 'Match all requests';
}
