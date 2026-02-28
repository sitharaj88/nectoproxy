import { useState, useEffect } from 'react';
import type { BreakpointHit, BreakpointResumeModifications } from '@proxyscope/shared';
import { resumeBreakpoint } from '../../services/socket';
import { useBreakpointStore } from '../../stores/breakpointStore';

interface InterceptedPanelProps {
  hits: BreakpointHit[];
  selectedHit: BreakpointHit | null;
}

export function InterceptedPanel({ hits, selectedHit: initialSelectedHit }: InterceptedPanelProps) {
  const { setSelectedHit } = useBreakpointStore();
  const [activeTab, setActiveTab] = useState<'request' | 'response'>('request');
  const selectedHit = initialSelectedHit || (hits.length > 0 ? hits[0] : null);

  // Request modifications state
  const [method, setMethod] = useState('');
  const [url, setUrl] = useState('');
  const [requestHeaders, setRequestHeaders] = useState('');
  const [requestBody, setRequestBody] = useState('');

  // Response modifications state
  const [status, setStatus] = useState('');
  const [statusText, setStatusText] = useState('');
  const [responseHeaders, setResponseHeaders] = useState('');
  const [responseBody, setResponseBody] = useState('');

  // Update state when selected hit changes
  useEffect(() => {
    if (selectedHit) {
      setMethod(selectedHit.method);
      setUrl(selectedHit.url);
      setRequestHeaders(formatHeaders(selectedHit.requestHeaders));
      setRequestBody(bufferToString(selectedHit.requestBody));

      if (selectedHit.type === 'response') {
        setStatus(String(selectedHit.status || 200));
        setStatusText(selectedHit.statusText || 'OK');
        setResponseHeaders(formatHeaders(selectedHit.responseHeaders || {}));
        setResponseBody(bufferToString(selectedHit.responseBody || null));
      }
    }
  }, [selectedHit]);

  const handleResume = (action: 'continue' | 'abort' | 'mock') => {
    if (!selectedHit) return;

    let modifications: BreakpointResumeModifications | undefined;

    if (action === 'continue') {
      if (selectedHit.type === 'request') {
        modifications = {
          request: {
            method: method !== selectedHit.method ? method : undefined,
            url: url !== selectedHit.url ? url : undefined,
            headers: parseHeaders(requestHeaders),
            body: requestBody || undefined,
          },
        };
      } else {
        modifications = {
          response: {
            status: status ? parseInt(status, 10) : undefined,
            statusText: statusText || undefined,
            headers: parseHeaders(responseHeaders),
            body: responseBody || undefined,
          },
        };
      }
    }

    resumeBreakpoint(selectedHit.id, action, modifications);
  };

  if (hits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <svg
          className="w-16 h-16 mb-4 text-gray-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-lg font-medium">No intercepted requests</p>
        <p className="text-sm mt-1">Requests matching your breakpoints will appear here</p>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Hit list sidebar */}
      <div className="w-64 border-r border-gray-700 overflow-auto">
        <div className="p-2 text-xs text-gray-500 uppercase font-semibold">
          Paused Requests ({hits.length})
        </div>
        {hits.map((hit) => (
          <button
            key={hit.id}
            onClick={() => setSelectedHit(hit)}
            className={`w-full p-3 text-left border-b border-gray-700 hover:bg-gray-700/50 ${
              selectedHit?.id === hit.id ? 'bg-gray-700' : ''
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`px-1.5 py-0.5 text-xs font-medium rounded ${
                  hit.type === 'request'
                    ? 'bg-green-900/50 text-green-400'
                    : 'bg-purple-900/50 text-purple-400'
                }`}
              >
                {hit.type}
              </span>
              <span className="text-xs font-mono text-gray-300">{hit.method}</span>
            </div>
            <div className="mt-1 text-xs text-gray-400 truncate">
              {new URL(hit.url).pathname}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {new URL(hit.url).host}
            </div>
          </button>
        ))}
      </div>

      {/* Editor panel */}
      {selectedHit && (
        <div className="flex-1 flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setActiveTab('request')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'request'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Request
            </button>
            {selectedHit.type === 'response' && (
              <button
                onClick={() => setActiveTab('response')}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === 'response'
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Response
              </button>
            )}
          </div>

          {/* Editor content */}
          <div className="flex-1 overflow-auto p-4">
            {activeTab === 'request' ? (
              <div className="space-y-4">
                {/* Method and URL */}
                <div className="flex gap-2">
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm"
                    disabled={selectedHit.type === 'response'}
                  >
                    {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm font-mono"
                    readOnly={selectedHit.type === 'response'}
                  />
                </div>

                {/* Request Headers */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Headers</label>
                  <textarea
                    value={requestHeaders}
                    onChange={(e) => setRequestHeaders(e.target.value)}
                    className="w-full h-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm font-mono resize-none"
                    placeholder="Header-Name: value"
                    readOnly={selectedHit.type === 'response'}
                  />
                </div>

                {/* Request Body */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Body</label>
                  <textarea
                    value={requestBody}
                    onChange={(e) => setRequestBody(e.target.value)}
                    className="w-full h-48 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm font-mono resize-none"
                    placeholder="Request body..."
                    readOnly={selectedHit.type === 'response'}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Status */}
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm"
                    placeholder="200"
                  />
                  <input
                    type="text"
                    value={statusText}
                    onChange={(e) => setStatusText(e.target.value)}
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm"
                    placeholder="OK"
                  />
                </div>

                {/* Response Headers */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Headers</label>
                  <textarea
                    value={responseHeaders}
                    onChange={(e) => setResponseHeaders(e.target.value)}
                    className="w-full h-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm font-mono resize-none"
                    placeholder="Header-Name: value"
                  />
                </div>

                {/* Response Body */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Body</label>
                  <textarea
                    value={responseBody}
                    onChange={(e) => setResponseBody(e.target.value)}
                    className="w-full h-48 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm font-mono resize-none"
                    placeholder="Response body..."
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 p-4 border-t border-gray-700 bg-gray-800/50">
            <button
              onClick={() => handleResume('abort')}
              className="px-4 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded-md"
            >
              Abort
            </button>
            <button
              onClick={() => handleResume('continue')}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatHeaders(headers: Record<string, string | string[]>): string {
  return Object.entries(headers)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return value.map((v) => `${key}: ${v}`).join('\n');
      }
      return `${key}: ${value}`;
    })
    .join('\n');
}

function parseHeaders(text: string): Record<string, string> | undefined {
  if (!text.trim()) return undefined;

  const headers: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      if (key) {
        headers[key] = value;
      }
    }
  }

  return Object.keys(headers).length > 0 ? headers : undefined;
}

function bufferToString(buffer: unknown): string {
  if (!buffer) return '';
  // Handle both Buffer and base64 encoded strings from JSON
  if (typeof buffer === 'string') {
    try {
      return atob(buffer);
    } catch {
      return buffer;
    }
  }
  if (buffer instanceof Uint8Array) return new TextDecoder().decode(buffer);
  // Handle serialized Node.js Buffer: { type: "Buffer", data: [...] }
  if (typeof buffer === 'object' && buffer !== null && 'data' in buffer) {
    return new TextDecoder().decode(new Uint8Array((buffer as { data: number[] }).data));
  }
  return '';
}
