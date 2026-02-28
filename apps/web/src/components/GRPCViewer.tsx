import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { getGRPCStatusText } from '@/utils/grpc';

interface GRPCViewerProps {
  service: string;
  method: string;
  requestBody: string | null;
  responseBody: string | null;
  responseHeaders: Record<string, string | string[]> | null;
}

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({ title, defaultOpen = false, children }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-700 rounded-md overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full px-3 py-2 bg-gray-800 hover:bg-gray-750 text-sm font-medium text-gray-300 transition-colors"
      >
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500" />
        )}
        {title}
      </button>
      {isOpen && (
        <div className="border-t border-gray-700">
          {children}
        </div>
      )}
    </div>
  );
}

function tryFormatJson(text: string): string {
  try {
    const parsed = JSON.parse(text);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return text;
  }
}

export function GRPCViewer({
  service,
  method,
  requestBody,
  responseBody,
  responseHeaders,
}: GRPCViewerProps) {
  // Extract gRPC status from response headers or trailers
  let grpcStatus: number | null = null;
  let grpcMessage: string | null = null;
  if (responseHeaders) {
    const statusHeader = responseHeaders['grpc-status'];
    if (statusHeader !== undefined) {
      const statusStr = typeof statusHeader === 'string' ? statusHeader : statusHeader[0];
      grpcStatus = parseInt(statusStr, 10);
    }
    const messageHeader = responseHeaders['grpc-message'];
    if (messageHeader !== undefined) {
      grpcMessage = typeof messageHeader === 'string' ? messageHeader : messageHeader[0];
    }
  }

  const isSuccess = grpcStatus === 0 || grpcStatus === null;

  return (
    <div className="space-y-4">
      {/* Service and Method Header */}
      <div className="flex items-start gap-3">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase border bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
          gRPC
        </span>
        <div className="min-w-0">
          <div className="text-gray-400 text-sm font-mono truncate" title={service}>
            {service}
          </div>
          <div className="text-lg font-semibold text-gray-200">
            {method}
          </div>
        </div>
      </div>

      {/* gRPC Status */}
      {grpcStatus !== null && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
          isSuccess
            ? 'bg-green-900/20 border border-green-700/30 text-green-400'
            : 'bg-red-900/20 border border-red-700/30 text-red-400'
        }`}>
          <span className="font-medium">Status:</span>
          <span className="font-mono">{grpcStatus}</span>
          <span className="text-gray-400">-</span>
          <span>{getGRPCStatusText(grpcStatus)}</span>
          {grpcMessage && (
            <>
              <span className="text-gray-400">|</span>
              <span className="truncate">{decodeURIComponent(grpcMessage)}</span>
            </>
          )}
        </div>
      )}

      {/* Request Body */}
      <CollapsibleSection title="Request Message" defaultOpen={true}>
        {requestBody ? (
          <pre className="p-3 text-sm font-mono text-gray-300 whitespace-pre-wrap overflow-auto max-h-[300px] bg-gray-900">
            {tryFormatJson(requestBody)}
          </pre>
        ) : (
          <div className="p-3 text-sm text-gray-500 bg-gray-900">(empty)</div>
        )}
      </CollapsibleSection>

      {/* Response Body */}
      <CollapsibleSection title="Response Message" defaultOpen={true}>
        {responseBody ? (
          <pre className="p-3 text-sm font-mono text-gray-300 whitespace-pre-wrap overflow-auto max-h-[300px] bg-gray-900">
            {tryFormatJson(responseBody)}
          </pre>
        ) : (
          <div className="p-3 text-sm text-gray-500 bg-gray-900">(empty)</div>
        )}
      </CollapsibleSection>
    </div>
  );
}
