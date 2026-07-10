import { useState, useEffect } from 'react';
import { PauseCircle } from 'lucide-react';
import type { BreakpointHit, BreakpointResumeModifications } from '@nectoproxy/shared';
import { resumeBreakpoint } from '../../services/socket';
import { useBreakpointStore } from '../../stores/breakpointStore';
import { Badge, Button, Input, Select, Tabs, EmptyState, cn } from '@/components/ui';

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
      <EmptyState
        icon={PauseCircle}
        title="No intercepted requests"
        description="Requests matching your breakpoints will appear here"
      />
    );
  }

  return (
    <div className="flex h-full">
      {/* Hit list sidebar */}
      <div className="w-64 border-r border-edge overflow-auto">
        <div className="p-2 text-xs text-ink-muted uppercase font-semibold">
          Paused Requests ({hits.length})
        </div>
        {hits.map((hit) => (
          <button
            key={hit.id}
            onClick={() => setSelectedHit(hit)}
            className={cn(
              'w-full p-3 text-left border-b border-edge hover:bg-surface-raised/50',
              selectedHit?.id === hit.id && 'bg-surface-raised'
            )}
          >
            <div className="flex items-center gap-2">
              <Badge tone={hit.type === 'request' ? 'success' : 'accent'}>{hit.type}</Badge>
              <span className="text-xs font-mono text-ink-secondary">{hit.method}</span>
            </div>
            <div className="mt-1 text-xs text-ink-muted truncate">
              {new URL(hit.url).pathname}
            </div>
            <div className="mt-1 text-xs text-ink-faint">
              {new URL(hit.url).host}
            </div>
          </button>
        ))}
      </div>

      {/* Editor panel */}
      {selectedHit && (
        <div className="flex-1 flex flex-col">
          {/* Tabs */}
          <Tabs
            size="md"
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as 'request' | 'response')}
            items={
              selectedHit.type === 'response'
                ? [
                    { value: 'request', label: 'Request' },
                    { value: 'response', label: 'Response' },
                  ]
                : [{ value: 'request', label: 'Request' }]
            }
          />

          {/* Editor content */}
          <div className="flex-1 overflow-auto p-4">
            {activeTab === 'request' ? (
              <div className="space-y-4">
                {/* Method and URL */}
                <div className="flex gap-2">
                  <Select
                    sizeVariant="md"
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    disabled={selectedHit.type === 'response'}
                  >
                    {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </Select>
                  <Input
                    sizeVariant="md"
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="flex-1 font-mono"
                    readOnly={selectedHit.type === 'response'}
                  />
                </div>

                {/* Request Headers */}
                <div>
                  <label className="block text-sm text-ink-secondary mb-1">Headers</label>
                  <textarea
                    value={requestHeaders}
                    onChange={(e) => setRequestHeaders(e.target.value)}
                    className={textareaClass('h-32')}
                    placeholder="Header-Name: value"
                    readOnly={selectedHit.type === 'response'}
                  />
                </div>

                {/* Request Body */}
                <div>
                  <label className="block text-sm text-ink-secondary mb-1">Body</label>
                  <textarea
                    value={requestBody}
                    onChange={(e) => setRequestBody(e.target.value)}
                    className={textareaClass('h-48')}
                    placeholder="Request body..."
                    readOnly={selectedHit.type === 'response'}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Status */}
                <div className="flex gap-2">
                  <div className="w-24">
                    <Input
                      sizeVariant="md"
                      type="number"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      placeholder="200"
                    />
                  </div>
                  <Input
                    sizeVariant="md"
                    type="text"
                    value={statusText}
                    onChange={(e) => setStatusText(e.target.value)}
                    className="flex-1"
                    placeholder="OK"
                  />
                </div>

                {/* Response Headers */}
                <div>
                  <label className="block text-sm text-ink-secondary mb-1">Headers</label>
                  <textarea
                    value={responseHeaders}
                    onChange={(e) => setResponseHeaders(e.target.value)}
                    className={textareaClass('h-32')}
                    placeholder="Header-Name: value"
                  />
                </div>

                {/* Response Body */}
                <div>
                  <label className="block text-sm text-ink-secondary mb-1">Body</label>
                  <textarea
                    value={responseBody}
                    onChange={(e) => setResponseBody(e.target.value)}
                    className={textareaClass('h-48')}
                    placeholder="Response body..."
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 p-4 border-t border-edge bg-surface/50">
            <Button
              variant="ghost"
              size="md"
              onClick={() => handleResume('abort')}
              className="!text-danger hover:!bg-danger/12"
            >
              Abort
            </Button>
            <Button variant="primary" size="md" onClick={() => handleResume('continue')}>
              Continue
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function textareaClass(height: string): string {
  return cn(
    'w-full px-3 py-2 rounded-md text-sm font-mono resize-none',
    'bg-canvas text-ink placeholder:text-ink-faint border border-edge',
    'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50',
    height
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
