import { useState, useCallback } from 'react';
import { Play, X, ArrowRight, Check, AlertCircle } from 'lucide-react';
import {
  replayTrafficEntry,
  type ReplayResult,
  type ReplayComparison,
} from '../services/api';
import type { TrafficEntry } from '@proxyscope/shared';

interface ReplayEditorProps {
  entry: TrafficEntry;
  onClose: () => void;
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

export function ReplayEditor({ entry, onClose }: ReplayEditorProps) {
  const [method, setMethod] = useState(entry.method);
  const [url, setUrl] = useState(entry.url);
  const [headers, setHeaders] = useState<string>(formatHeaders(entry.requestHeaders));
  const [body, setBody] = useState<string>(decodeBody(entry.requestBody));
  const [isReplaying, setIsReplaying] = useState(false);
  const [result, setResult] = useState<ReplayResult | null>(null);
  const [comparison, setComparison] = useState<ReplayComparison | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'request' | 'response' | 'comparison'>('request');

  function formatHeaders(headers: Record<string, string | string[]> | null): string {
    if (!headers) return '';
    return Object.entries(headers)
      .filter(([key]) => !['host', 'content-length'].includes(key.toLowerCase()))
      .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
      .join('\n');
  }

  function decodeBody(body: unknown): string {
    if (!body) return '';
    if (typeof body === 'string') {
      try {
        return atob(body);
      } catch {
        return body;
      }
    }
    if (body instanceof Uint8Array) return new TextDecoder().decode(body);
    // Handle serialized Node.js Buffer: { type: "Buffer", data: [...] }
    if (typeof body === 'object' && body !== null && 'type' in body && (body as Record<string, unknown>).type === 'Buffer' && 'data' in body) {
      return new TextDecoder().decode(new Uint8Array((body as Record<string, unknown>).data as number[]));
    }
    return '';
  }

  function parseHeaders(headerString: string): Record<string, string> {
    const result: Record<string, string> = {};
    for (const line of headerString.split('\n')) {
      const idx = line.indexOf(':');
      if (idx > 0) {
        const key = line.substring(0, idx).trim();
        const value = line.substring(idx + 1).trim();
        if (key && value) {
          result[key] = value;
        }
      }
    }
    return result;
  }

  const handleReplay = useCallback(async () => {
    setIsReplaying(true);
    setError(null);
    setResult(null);
    setComparison(null);

    try {
      const response = await replayTrafficEntry(entry.id, {
        method,
        url,
        headers: parseHeaders(headers),
        body: body || undefined,
      });

      setResult(response.result);
      setComparison(response.comparison);
      setActiveTab('response');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsReplaying(false);
    }
  }, [entry.id, method, url, headers, body]);

  function decodeResponseBody(body: string | null): string {
    if (!body) return '';
    try {
      return atob(body);
    } catch {
      return body;
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Play className="w-5 h-5 text-primary-400" />
            Replay Request
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-700 text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          {(['request', 'response', 'comparison'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              disabled={tab !== 'request' && !result}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'text-primary-400 border-b-2 border-primary-400'
                  : 'text-gray-400 hover:text-gray-300 disabled:opacity-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {/* Error display */}
          {error && (
            <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {activeTab === 'request' && (
            <div className="space-y-4">
              {/* Method and URL */}
              <div className="flex gap-2">
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm font-medium"
                >
                  {HTTP_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="URL"
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm font-mono"
                />
              </div>

              {/* Headers */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Headers
                </label>
                <textarea
                  value={headers}
                  onChange={(e) => setHeaders(e.target.value)}
                  rows={6}
                  placeholder="Header-Name: Header Value"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm font-mono"
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Body
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={8}
                  placeholder="Request body (optional)"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm font-mono"
                />
              </div>
            </div>
          )}

          {activeTab === 'response' && result && (
            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center gap-4">
                <div
                  className={`text-lg font-bold ${
                    result.status >= 200 && result.status < 300
                      ? 'text-green-400'
                      : result.status >= 400
                      ? 'text-red-400'
                      : 'text-yellow-400'
                  }`}
                >
                  {result.status} {result.statusText}
                </div>
                <div className="text-sm text-gray-400">
                  Duration: {result.duration}ms
                </div>
              </div>

              {result.error && (
                <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {result.error}
                </div>
              )}

              {/* Response Headers */}
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">
                  Response Headers
                </h4>
                <pre className="bg-gray-900 rounded-md p-3 text-sm font-mono text-gray-300 whitespace-pre-wrap overflow-auto max-h-48">
                  {Object.entries(result.headers || {})
                    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
                    .join('\n')}
                </pre>
              </div>

              {/* Response Body */}
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">
                  Response Body
                </h4>
                <pre className="bg-gray-900 rounded-md p-3 text-sm font-mono text-gray-300 whitespace-pre-wrap overflow-auto max-h-64">
                  {decodeResponseBody(result.body)}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'comparison' && comparison && (
            <div className="space-y-4">
              {/* Summary */}
              <div
                className={`p-4 rounded-lg flex items-center gap-3 ${
                  comparison.identical
                    ? 'bg-green-500/10 border border-green-500/20'
                    : 'bg-yellow-500/10 border border-yellow-500/20'
                }`}
              >
                {comparison.identical ? (
                  <>
                    <Check className="w-6 h-6 text-green-400" />
                    <div>
                      <div className="font-medium text-green-400">
                        Responses are identical
                      </div>
                      <div className="text-sm text-gray-400">
                        Original: {comparison.originalDuration}ms | Replay:{' '}
                        {comparison.replayDuration}ms
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-6 h-6 text-yellow-400" />
                    <div>
                      <div className="font-medium text-yellow-400">
                        {comparison.changes.length} difference(s) found
                      </div>
                      <div className="text-sm text-gray-400">
                        Original: {comparison.originalDuration}ms | Replay:{' '}
                        {comparison.replayDuration}ms
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Changes */}
              {comparison.changes.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-300">Changes</h4>
                  {comparison.changes.map((change, i) => (
                    <div
                      key={i}
                      className="bg-gray-900 rounded-md p-3 text-sm"
                    >
                      <div className="text-gray-400 mb-1 capitalize">
                        {change.type === 'body_size'
                          ? 'Body Size'
                          : change.type}
                        {change.type === 'header' && `: ${change.field}`}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-red-400 font-mono">
                          {change.original || '(empty)'}
                        </span>
                        <ArrowRight className="w-4 h-4 text-gray-500" />
                        <span className="text-green-400 font-mono">
                          {change.replayed || '(empty)'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700">
          <div className="text-sm text-gray-500">
            Original: {entry.method} {new URL(entry.url).pathname}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-gray-300"
            >
              Close
            </button>
            <button
              onClick={handleReplay}
              disabled={isReplaying || !url}
              className="px-4 py-2 text-sm bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-md flex items-center gap-2"
            >
              {isReplaying ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Replaying...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Replay
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
