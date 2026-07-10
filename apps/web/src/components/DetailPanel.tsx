import { useState, useMemo } from 'react';
import { X, Play, MousePointerClick } from 'lucide-react';
import { useSelectedEntry, useTrafficStore } from '@/stores/trafficStore';
import { WebSocketMessagesViewer } from './WebSocketMessagesViewer';
import { ReplayEditor } from './ReplayEditor';
import { CodeGeneratorButton } from './codegen';
import { SecurityTab } from './security';
import { GraphQLViewer } from './GraphQLViewer';
import { GRPCViewer } from './GRPCViewer';
import { isGraphQLRequest, parseGraphQLRequest } from '@/utils/graphql';
import { isGRPCRequest, parseGRPCRequest } from '@/utils/grpc';
import { AnnotationsPanel } from './AnnotationsPanel';
import { CodeViewer } from './CodeViewer';
import { CopyButton } from './ui/CopyButton';
import { EmptyState } from './ui/EmptyState';
import { Tabs, IconButton, type TabItem } from './ui';

type Tab = 'headers' | 'request' | 'response' | 'timing' | 'security' | 'messages' | 'annotations';

function formatHeaders(headers: Record<string, string | string[]> | null): string {
  if (!headers) return '';
  return Object.entries(headers)
    .map(([key, value]) => {
      const val = Array.isArray(value) ? value.join(', ') : value;
      return `${key}: ${val}`;
    })
    .join('\n');
}

function bodyToString(body: unknown): string | null {
  if (!body) return null;
  if (typeof body === 'string') {
    // Bodies from REST API arrive as base64 strings
    try {
      return atob(body);
    } catch {
      return body;
    }
  }
  if (body instanceof ArrayBuffer) return new TextDecoder().decode(body);
  if (body instanceof Uint8Array) return new TextDecoder().decode(body);
  // Handle serialized Node.js Buffer objects: { type: "Buffer", data: [...] }
  if (typeof body === 'object' && body !== null && 'type' in body && (body as Record<string, unknown>).type === 'Buffer' && 'data' in body) {
    return new TextDecoder().decode(new Uint8Array((body as Record<string, unknown>).data as number[]));
  }
  return JSON.stringify(body);
}

function getContentType(headers: Record<string, string | string[]> | null): string | undefined {
  if (!headers) return undefined;
  const ct = headers['content-type'];
  if (!ct) return undefined;
  return Array.isArray(ct) ? ct[0] : ct;
}

export function DetailPanel() {
  const entry = useSelectedEntry();
  const setSelected = useTrafficStore((state) => state.setSelected);
  const [activeTab, setActiveTab] = useState<Tab>('headers');
  const [showReplay, setShowReplay] = useState(false);

  if (!entry) {
    return (
      <EmptyState
        icon={MousePointerClick}
        title="No request selected"
        description="Pick a row from the traffic list to inspect its headers, body, timing, and security details."
      />
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
      { id: 'annotations', label: 'Notes' },
    ];

    if (isWebSocket) {
      baseTabs.splice(1, 0, { id: 'messages', label: 'Messages' });
    }

    return baseTabs;
  }, [isWebSocket]);

  const tabItems: TabItem[] = tabs.map((tab) => ({ value: tab.id, label: tab.label }));

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-surface-raised border-b border-edge">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-medium method-${entry.method.toLowerCase()}`}>
              {entry.method}
            </span>
            <span className="text-ink-muted truncate text-sm font-mono">
              {entry.url}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <CopyButton text={entry.url} label="URL" />
          {!isWebSocket && (
            <>
              <CodeGeneratorButton
                entry={entry}
                requestBody={bodyToString(entry.requestBody)}
              />
              <IconButton
                label="Replay request"
                icon={<Play className="w-4 h-4" aria-hidden="true" />}
                onClick={() => setShowReplay(true)}
              />
            </>
          )}
          <IconButton
            label="Close detail panel"
            icon={<X className="w-4 h-4" aria-hidden="true" />}
            onClick={() => setSelected(null)}
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        label="Request details"
        className="px-2"
        items={tabItems}
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as Tab)}
      />

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'headers' && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-ink-secondary">General</h3>
              </div>
              <div className="bg-surface-raised border border-edge rounded-md p-3 text-sm font-mono space-y-1 overflow-hidden">
                <div className="break-all"><span className="text-ink-faint">URL:</span> {entry.url}</div>
                <div><span className="text-ink-faint">Method:</span> {entry.method}</div>
                <div><span className="text-ink-faint">Status:</span> {entry.status} {entry.statusText}</div>
                <div><span className="text-ink-faint">Protocol:</span> {entry.protocol}</div>
                {entry.remoteAddress && (
                  <div><span className="text-ink-faint">Remote:</span> {entry.remoteAddress}</div>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-ink-secondary">Request Headers</h3>
                <CopyButton text={formatHeaders(entry.requestHeaders)} label="Request headers" />
              </div>
              <pre className="bg-surface-raised border border-edge rounded-md p-3 text-sm font-mono text-ink-secondary whitespace-pre-wrap break-all overflow-hidden">
                {formatHeaders(entry.requestHeaders)}
              </pre>
            </div>

            {entry.responseHeaders && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-ink-secondary">Response Headers</h3>
                  <CopyButton text={formatHeaders(entry.responseHeaders)} label="Response headers" />
                </div>
                <pre className="bg-surface-raised border border-edge rounded-md p-3 text-sm font-mono text-ink-secondary whitespace-pre-wrap break-all overflow-hidden">
                  {formatHeaders(entry.responseHeaders)}
                </pre>
              </div>
            )}
          </div>
        )}

        {activeTab === 'request' && (() => {
          const requestBodyStr = bodyToString(entry.requestBody);
          const isGraphQL = isGraphQLRequest(entry.url, entry.requestHeaders, requestBodyStr);
          const graphqlRequest = isGraphQL && requestBodyStr ? parseGraphQLRequest(requestBodyStr) : null;
          const grpcDetected = isGRPCRequest(entry.requestHeaders);
          const grpcRequest = grpcDetected ? parseGRPCRequest(entry.path, entry.requestHeaders) : null;

          if (graphqlRequest) {
            const responseBodyStr = bodyToString(entry.responseBody);
            return (
              <div>
                <GraphQLViewer request={graphqlRequest} responseBody={responseBodyStr} />
              </div>
            );
          }

          if (grpcDetected && grpcRequest) {
            const responseBodyStr = bodyToString(entry.responseBody);
            return (
              <div>
                <GRPCViewer
                  service={grpcRequest.service}
                  method={grpcRequest.method}
                  requestBody={requestBodyStr}
                  responseBody={responseBodyStr}
                  responseHeaders={entry.responseHeaders}
                />
              </div>
            );
          }

          return (
            <div>
              <h3 className="text-sm font-medium text-ink-secondary mb-2">Request Body</h3>
              <CodeViewer
                content={bodyToString(entry.requestBody) || '(empty)'}
                contentType={getContentType(entry.requestHeaders)}
                maxHeight="500px"
              />
            </div>
          );
        })()}

        {activeTab === 'response' && (() => {
          const requestBodyStr = bodyToString(entry.requestBody);
          const isGraphQL = isGraphQLRequest(entry.url, entry.requestHeaders, requestBodyStr);
          const graphqlRequest = isGraphQL && requestBodyStr ? parseGraphQLRequest(requestBodyStr) : null;
          const grpcDetected = isGRPCRequest(entry.requestHeaders);
          const grpcRequest = grpcDetected ? parseGRPCRequest(entry.path, entry.requestHeaders) : null;
          const responseBodyStr = bodyToString(entry.responseBody);

          if (graphqlRequest) {
            return (
              <div>
                <GraphQLViewer request={graphqlRequest} responseBody={responseBodyStr} />
              </div>
            );
          }

          if (grpcDetected && grpcRequest) {
            return (
              <div>
                <GRPCViewer
                  service={grpcRequest.service}
                  method={grpcRequest.method}
                  requestBody={requestBodyStr}
                  responseBody={responseBodyStr}
                  responseHeaders={entry.responseHeaders}
                />
              </div>
            );
          }

          return (
            <div>
              <h3 className="text-sm font-medium text-ink-secondary mb-2">Response Body</h3>
              <CodeViewer
                content={bodyToString(entry.responseBody) || '(empty)'}
                contentType={getContentType(entry.responseHeaders)}
                maxHeight="500px"
              />
            </div>
          );
        })()}

        {activeTab === 'timing' && (
          <div>
            <h3 className="text-sm font-medium text-ink-secondary mb-2">Timing</h3>
            <div className="bg-surface-raised border border-edge rounded-md p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-ink-muted">Total Duration:</span>
                <span className="text-sm font-medium text-ink tabular-nums">
                  {entry.duration ? `${entry.duration}ms` : 'Pending...'}
                </span>
              </div>
              {entry.duration && (
                <div className="h-4 bg-surface rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full"
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
            responseBody={bodyToString(entry.responseBody)}
          />
        )}

        {activeTab === 'annotations' && (
          <AnnotationsPanel trafficId={entry.id} />
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
