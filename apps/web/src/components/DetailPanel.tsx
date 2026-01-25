import { useState, useMemo } from 'react';
import { X, Copy, Check, Play } from 'lucide-react';
import { useSelectedEntry, useTrafficStore } from '@/stores/trafficStore';
import { WebSocketMessagesViewer } from './WebSocketMessagesViewer';
import { ReplayEditor } from './ReplayEditor';
import { CodeGeneratorButton } from './codegen';
import { SecurityTab } from './security';

type Tab = 'headers' | 'request' | 'response' | 'timing' | 'security' | 'messages';

function formatHeaders(headers: Record<string, string | string[]> | null): string {
  if (!headers) return '';
  return Object.entries(headers)
    .map(([key, value]) => {
      const val = Array.isArray(value) ? value.join(', ') : value;
      return `${key}: ${val}`;
    })
    .join('\n');
}

function formatBody(body: Buffer | null, headers: Record<string, string | string[]> | null): string {
  if (!body) return '(empty)';

  // Convert Buffer-like object to string
  const bodyStr = typeof body === 'string'
    ? body
    : Buffer.isBuffer(body)
    ? body.toString('utf-8')
    : JSON.stringify(body);

  // Try to pretty print JSON
  const contentType = headers?.['content-type'] || '';
  if (typeof contentType === 'string' && contentType.includes('application/json')) {
    try {
      return JSON.stringify(JSON.parse(bodyStr), null, 2);
    } catch {
      return bodyStr;
    }
  }

  return bodyStr;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded hover:bg-gray-700 text-gray-400 transition-colors"
      title="Copy to clipboard"
    >
      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

export function DetailPanel() {
  const entry = useSelectedEntry();
  const setSelected = useTrafficStore((state) => state.setSelected);
  const [activeTab, setActiveTab] = useState<Tab>('headers');
  const [showReplay, setShowReplay] = useState(false);

  if (!entry) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>Select a request to view details</p>
      </div>
    );
  }

  const isWebSocket = entry.protocol === 'ws' || entry.protocol === 'wss';

  const tabs = useMemo(() => {
    const baseTabs: { id: Tab; label: string }[] = [
      { id: 'headers', label: 'Headers' },
      { id: 'request', label: 'Request' },
      { id: 'response', label: 'Response' },
      { id: 'timing', label: 'Timing' },
      { id: 'security', label: 'Security' },
    ];

    if (isWebSocket) {
      baseTabs.splice(1, 0, { id: 'messages', label: 'Messages' });
    }

    return baseTabs;
  }, [isWebSocket]);

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-medium method-${entry.method.toLowerCase()}`}>
              {entry.method}
            </span>
            <span className="text-gray-400 truncate text-sm font-mono">
              {entry.url}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 ml-2">
          {!isWebSocket && (
            <>
              <CodeGeneratorButton
                entry={entry}
                requestBody={
                  typeof entry.requestBody === 'string'
                    ? entry.requestBody
                    : entry.requestBody
                    ? Buffer.isBuffer(entry.requestBody)
                      ? entry.requestBody.toString('utf-8')
                      : JSON.stringify(entry.requestBody)
                    : null
                }
              />
              <button
                onClick={() => setShowReplay(true)}
                className="p-1 rounded hover:bg-gray-700 text-gray-400 transition-colors"
                title="Replay Request"
              >
                <Play className="w-4 h-4" />
              </button>
            </>
          )}
          <button
            onClick={() => setSelected(null)}
            className="p-1 rounded hover:bg-gray-700 text-gray-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-primary-400 border-b-2 border-primary-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'headers' && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-300">General</h3>
              </div>
              <div className="bg-gray-800 rounded-md p-3 text-sm font-mono space-y-1">
                <div><span className="text-gray-500">URL:</span> {entry.url}</div>
                <div><span className="text-gray-500">Method:</span> {entry.method}</div>
                <div><span className="text-gray-500">Status:</span> {entry.status} {entry.statusText}</div>
                <div><span className="text-gray-500">Protocol:</span> {entry.protocol}</div>
                {entry.remoteAddress && (
                  <div><span className="text-gray-500">Remote:</span> {entry.remoteAddress}</div>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-300">Request Headers</h3>
                <CopyButton text={formatHeaders(entry.requestHeaders)} />
              </div>
              <pre className="bg-gray-800 rounded-md p-3 text-sm font-mono text-gray-300 whitespace-pre-wrap">
                {formatHeaders(entry.requestHeaders)}
              </pre>
            </div>

            {entry.responseHeaders && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-300">Response Headers</h3>
                  <CopyButton text={formatHeaders(entry.responseHeaders)} />
                </div>
                <pre className="bg-gray-800 rounded-md p-3 text-sm font-mono text-gray-300 whitespace-pre-wrap">
                  {formatHeaders(entry.responseHeaders)}
                </pre>
              </div>
            )}
          </div>
        )}

        {activeTab === 'request' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-300">Request Body</h3>
              {entry.requestBody && (
                <CopyButton text={formatBody(entry.requestBody, entry.requestHeaders)} />
              )}
            </div>
            <pre className="bg-gray-800 rounded-md p-3 text-sm font-mono text-gray-300 whitespace-pre-wrap overflow-auto max-h-[500px]">
              {formatBody(entry.requestBody, entry.requestHeaders)}
            </pre>
          </div>
        )}

        {activeTab === 'response' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-300">Response Body</h3>
              {entry.responseBody && (
                <CopyButton text={formatBody(entry.responseBody, entry.responseHeaders)} />
              )}
            </div>
            <pre className="bg-gray-800 rounded-md p-3 text-sm font-mono text-gray-300 whitespace-pre-wrap overflow-auto max-h-[500px]">
              {formatBody(entry.responseBody, entry.responseHeaders)}
            </pre>
          </div>
        )}

        {activeTab === 'timing' && (
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-2">Timing</h3>
            <div className="bg-gray-800 rounded-md p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-gray-400">Total Duration:</span>
                <span className="text-sm font-medium text-gray-200">
                  {entry.duration ? `${entry.duration}ms` : 'Pending...'}
                </span>
              </div>
              {entry.duration && (
                <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-full"
                    style={{ width: '100%' }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <SecurityTab
            entry={entry}
            responseBody={
              typeof entry.responseBody === 'string'
                ? entry.responseBody
                : entry.responseBody
                ? Buffer.isBuffer(entry.responseBody)
                  ? entry.responseBody.toString('utf-8')
                  : JSON.stringify(entry.responseBody)
                : null
            }
          />
        )}

        {activeTab === 'messages' && isWebSocket && (
          <div className="h-full -m-4">
            <WebSocketMessagesViewer trafficId={entry.id} />
          </div>
        )}
      </div>

      {/* Replay Editor Modal */}
      {showReplay && (
        <ReplayEditor entry={entry} onClose={() => setShowReplay(false)} />
      )}
    </div>
  );
}
