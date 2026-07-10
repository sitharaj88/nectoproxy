import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { getGRPCStatusText } from '@/utils/grpc';
import { Badge, Button } from '@/components/ui';

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
    <div className="border border-edge rounded-md overflow-hidden">
      <Button
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-start gap-2 h-auto px-3 py-2 rounded-none text-sm text-ink-secondary"
      >
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-ink-faint" />
        ) : (
          <ChevronRight className="w-4 h-4 text-ink-faint" />
        )}
        {title}
      </Button>
      {isOpen && (
        <div className="border-t border-edge">
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
        <Badge tone="success" className="uppercase">
          gRPC
        </Badge>
        <div className="min-w-0">
          <div className="text-ink-muted text-sm font-mono truncate" title={service}>
            {service}
          </div>
          <div className="text-lg font-semibold text-ink">
            {method}
          </div>
        </div>
      </div>

      {/* gRPC Status */}
      {grpcStatus !== null && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
          isSuccess
            ? 'bg-success/12 border border-success/25 text-success'
            : 'bg-danger/12 border border-danger/25 text-danger'
        }`}>
          <span className="font-medium">Status:</span>
          <span className="font-mono">{grpcStatus}</span>
          <span className="text-ink-muted">-</span>
          <span>{getGRPCStatusText(grpcStatus)}</span>
          {grpcMessage && (
            <>
              <span className="text-ink-muted">|</span>
              <span className="truncate">{decodeURIComponent(grpcMessage)}</span>
            </>
          )}
        </div>
      )}

      {/* Request Body */}
      <CollapsibleSection title="Request Message" defaultOpen={true}>
        {requestBody ? (
          <pre className="p-3 text-sm font-mono text-ink-secondary whitespace-pre-wrap overflow-auto max-h-[300px] bg-canvas">
            {tryFormatJson(requestBody)}
          </pre>
        ) : (
          <div className="p-3 text-sm text-ink-muted bg-canvas">(empty)</div>
        )}
      </CollapsibleSection>

      {/* Response Body */}
      <CollapsibleSection title="Response Message" defaultOpen={true}>
        {responseBody ? (
          <pre className="p-3 text-sm font-mono text-ink-secondary whitespace-pre-wrap overflow-auto max-h-[300px] bg-canvas">
            {tryFormatJson(responseBody)}
          </pre>
        ) : (
          <div className="p-3 text-sm text-ink-muted bg-canvas">(empty)</div>
        )}
      </CollapsibleSection>
    </div>
  );
}
