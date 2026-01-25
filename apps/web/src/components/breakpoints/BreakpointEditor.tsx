import { useState } from 'react';
import type { Breakpoint, BreakpointCreateInput, BreakpointType } from '@proxyscope/shared';

interface BreakpointEditorProps {
  breakpoint: Breakpoint | null;
  onSave: (input: BreakpointCreateInput) => void;
  onClose: () => void;
}

export function BreakpointEditor({ breakpoint, onSave, onClose }: BreakpointEditorProps) {
  const [name, setName] = useState(breakpoint?.name || '');
  const [type, setType] = useState<BreakpointType>(breakpoint?.type || 'request');
  const [url, setUrl] = useState(getUrlString(breakpoint?.match.url) || '');
  const [method, setMethod] = useState(getMethodString(breakpoint?.match.method) || '');
  const [host, setHost] = useState(breakpoint?.match.host || '');
  const [path, setPath] = useState(getPathString(breakpoint?.match.path) || '');
  const [enabled, setEnabled] = useState(breakpoint?.enabled ?? true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const input: BreakpointCreateInput = {
      name: name || 'Unnamed Breakpoint',
      type,
      enabled,
      match: {
        ...(url && { url }),
        ...(method && { method }),
        ...(host && { host }),
        ...(path && { path }),
      },
    };

    onSave(input);
  };

  function getUrlString(value: string | RegExp | undefined): string {
    if (!value) return '';
    return typeof value === 'string' ? value : value.source;
  }

  function getMethodString(value: string | string[] | undefined): string {
    if (!value) return '';
    return Array.isArray(value) ? value[0] : value;
  }

  function getPathString(value: string | RegExp | undefined): string {
    if (!value) return '';
    return typeof value === 'string' ? value : value.source;
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-[500px] max-h-[80vh] overflow-auto">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white">
              {breakpoint ? 'Edit Breakpoint' : 'New Breakpoint'}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter breakpoint name"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Type
              </label>
              <div className="flex gap-4">
                {(['request', 'response', 'both'] as BreakpointType[]).map((t) => (
                  <label key={t} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      value={t}
                      checked={type === t}
                      onChange={(e) => setType(e.target.value as BreakpointType)}
                      className="text-blue-600 focus:ring-blue-500 bg-gray-700 border-gray-600"
                    />
                    <span className="text-sm text-gray-300 capitalize">{t}</span>
                  </label>
                ))}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {type === 'request' && 'Pause before sending the request to the server'}
                {type === 'response' && 'Pause after receiving the response from the server'}
                {type === 'both' && 'Pause on both request and response'}
              </p>
            </div>

            {/* Matcher settings */}
            <div className="border-t border-gray-700 pt-4">
              <h4 className="text-sm font-medium text-gray-300 mb-3">Match Criteria</h4>
              <p className="text-xs text-gray-500 mb-3">
                Leave fields empty to match all. Supports wildcards (*) and regex patterns.
              </p>

              <div className="space-y-3">
                {/* URL Pattern */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    URL Pattern
                  </label>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="*api/users*"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>

                {/* Method */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    HTTP Method
                  </label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">Any method</option>
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="PATCH">PATCH</option>
                    <option value="DELETE">DELETE</option>
                    <option value="OPTIONS">OPTIONS</option>
                    <option value="HEAD">HEAD</option>
                  </select>
                </div>

                {/* Host Pattern */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Host Pattern
                  </label>
                  <input
                    type="text"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="*.example.com"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>

                {/* Path Pattern */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Path Pattern
                  </label>
                  <input
                    type="text"
                    value={path}
                    onChange={(e) => setPath(e.target.value)}
                    placeholder="/api/*"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Enabled toggle */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEnabled(!enabled)}
                className={`w-10 h-6 rounded-full transition-colors ${
                  enabled ? 'bg-blue-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`block w-4 h-4 bg-white rounded-full transform transition-transform ${
                    enabled ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="text-sm text-gray-300">
                {enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
            >
              {breakpoint ? 'Save Changes' : 'Create Breakpoint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
