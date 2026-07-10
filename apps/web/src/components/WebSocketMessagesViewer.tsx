import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import {
  getWebSocketFrames,
  sendWebSocketFrame,
  type WebSocketFrameResponse,
} from '../services/api';
import { subscribeToWebSocket } from '../services/socket';
import type { WebSocketFrameEvent } from '@nectoproxy/shared';
import { Badge, Button, IconButton, SegmentedControl, Switch, Tooltip } from '@/components/ui';

interface WebSocketMessagesViewerProps {
  trafficId: string;
}

const OPCODE_NAMES: Record<number, string> = {
  0: 'Continuation',
  1: 'Text',
  2: 'Binary',
  8: 'Close',
  9: 'Ping',
  10: 'Pong',
};

export function WebSocketMessagesViewer({
  trafficId,
}: WebSocketMessagesViewerProps) {
  const [frames, setFrames] = useState<WebSocketFrameResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFrame, setSelectedFrame] = useState<WebSocketFrameResponse | null>(null);

  // Composer state (frame injection)
  const [composerText, setComposerText] = useState('');
  const [composerDirection, setComposerDirection] = useState<'to-client' | 'to-server'>('to-server');
  const [composerBinary, setComposerBinary] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  async function handleSend() {
    if (!composerText.trim() || sending) return;
    setSending(true);
    setSendError(null);
    try {
      await sendWebSocketFrame(trafficId, {
        direction: composerDirection,
        data: composerText,
        isBinary: composerBinary,
      });
      setComposerText('');
    } catch (err) {
      setSendError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    async function loadFrames() {
      try {
        setLoading(true);
        setError(null);
        const data = await getWebSocketFrames(trafficId, 500);
        // Reverse to show oldest first
        setFrames(data.reverse());
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }

    loadFrames();

    // Subscribe to real-time frame updates
    const unsubscribe = subscribeToWebSocket(
      () => {}, // onOpen
      (event: WebSocketFrameEvent) => {
        if (event.trafficId === trafficId) {
          setFrames((prev) => [
            ...prev,
            {
              id: event.id,
              trafficId: event.trafficId,
              timestamp: event.timestamp,
              direction: event.direction,
              opcode: event.opcode,
              data: event.data,
              isBinary: event.isBinary,
              length: event.length,
              injected: event.injected,
            },
          ]);
        }
      },
      () => {}, // onClose
      () => {} // onError
    );

    return () => {
      unsubscribe();
    };
  }, [trafficId]);

  function decodeData(frame: WebSocketFrameResponse): string {
    if (!frame.data) return '';

    try {
      if (frame.isBinary) {
        // For binary data, show hex dump
        const bytes = atob(frame.data);
        const hex = Array.from(bytes)
          .map((char) => char.charCodeAt(0).toString(16).padStart(2, '0'))
          .join(' ');
        return hex.substring(0, 200) + (hex.length > 200 ? '...' : '');
      } else {
        // For text data, decode from base64
        return atob(frame.data);
      }
    } catch {
      return '[Unable to decode]';
    }
  }

  function formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    const time = date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const ms = date.getMilliseconds().toString().padStart(3, '0');
    return `${time}.${ms}`;
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-danger text-sm">
        Error loading WebSocket frames: {error}
      </div>
    );
  }

  const composer = (
    <div className="border-t border-edge p-3 bg-surface">
      <div className="flex items-center gap-2 mb-2">
        <SegmentedControl
          aria-label="Injection direction"
          value={composerDirection}
          onChange={setComposerDirection}
          segments={[
            { value: 'to-server', label: '↑ To Server' },
            { value: 'to-client', label: '↓ To Client' },
          ]}
        />
        <label className="flex items-center gap-1.5 text-xs text-ink-secondary">
          <Switch
            checked={composerBinary}
            onCheckedChange={setComposerBinary}
            aria-label="Binary (base64)"
          />
          Binary (base64)
        </label>
        {sendError && (
          <span className="text-xs text-danger truncate">{sendError}</span>
        )}
      </div>
      <div className="flex items-end gap-2">
        <textarea
          value={composerText}
          onChange={(e) => setComposerText(e.target.value)}
          placeholder={
            composerBinary
              ? 'Base64-encoded bytes to send…'
              : 'Message to send…'
          }
          rows={2}
          className="flex-1 resize-y rounded-md border border-edge bg-canvas p-2 text-xs font-mono text-ink placeholder:text-ink-faint transition-colors focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50"
        />
        <Button
          variant="primary"
          size="md"
          onClick={handleSend}
          disabled={sending || !composerText.trim()}
        >
          {sending ? 'Sending…' : 'Send'}
        </Button>
      </div>
    </div>
  );

  if (frames.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center p-4 text-ink-muted text-sm text-center">
          No WebSocket messages captured yet.
        </div>
        {composer}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages List */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-surface-raised border-b border-edge">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-ink-secondary w-8">
                Dir
              </th>
              <th className="px-3 py-2 text-left font-medium text-ink-secondary w-24">
                Time
              </th>
              <th className="px-3 py-2 text-left font-medium text-ink-secondary w-20">
                Type
              </th>
              <th className="px-3 py-2 text-left font-medium text-ink-secondary w-16">
                Size
              </th>
              <th className="px-3 py-2 text-left font-medium text-ink-secondary">
                Data
              </th>
            </tr>
          </thead>
          <tbody>
            {frames.map((frame) => (
              <tr
                key={frame.id}
                onClick={() => setSelectedFrame(frame)}
                className={`border-b border-edge-subtle cursor-pointer hover:bg-surface-raised ${
                  selectedFrame?.id === frame.id
                    ? 'bg-accent/12'
                    : ''
                }`}
              >
                <td className="px-3 py-2 whitespace-nowrap">
                  {frame.direction === 'client-to-server' ? (
                    <Tooltip content="Client to Server">
                      <span className="text-success">↑</span>
                    </Tooltip>
                  ) : (
                    <Tooltip content="Server to Client">
                      <span className="text-info">↓</span>
                    </Tooltip>
                  )}
                  {frame.injected && (
                    <Tooltip content="Manually injected frame">
                      <Badge tone="warn" className="ml-1">
                        sent
                      </Badge>
                    </Tooltip>
                  )}
                </td>
                <td className="px-3 py-2 text-ink-muted font-mono text-xs">
                  {formatTimestamp(frame.timestamp)}
                </td>
                <td className="px-3 py-2">
                  <Badge tone={frame.isBinary ? 'accent' : 'success'}>
                    {OPCODE_NAMES[frame.opcode] || `Op ${frame.opcode}`}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-ink-muted text-xs">
                  {formatBytes(frame.length)}
                </td>
                <td className="px-3 py-2 font-mono text-xs truncate max-w-xs text-ink-secondary">
                  {decodeData(frame).substring(0, 100)}
                  {decodeData(frame).length > 100 ? '...' : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Selected Frame Detail */}
      {selectedFrame && (
        <div className="border-t border-edge p-4 bg-surface">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-sm text-ink-secondary">
              Frame Details
            </h4>
            <IconButton
              label="Close"
              icon={<X className="w-4 h-4" />}
              onClick={() => setSelectedFrame(null)}
            />
          </div>
          <div className="grid grid-cols-4 gap-4 text-xs mb-3">
            <div>
              <span className="text-ink-muted">Direction:</span>
              <span className="ml-1 text-ink-secondary">
                {selectedFrame.direction === 'client-to-server'
                  ? 'Client → Server'
                  : 'Server → Client'}
              </span>
            </div>
            <div>
              <span className="text-ink-muted">Opcode:</span>
              <span className="ml-1 text-ink-secondary">
                {OPCODE_NAMES[selectedFrame.opcode] || selectedFrame.opcode}
              </span>
            </div>
            <div>
              <span className="text-ink-muted">Size:</span>
              <span className="ml-1 text-ink-secondary">
                {formatBytes(selectedFrame.length)}
              </span>
            </div>
            <div>
              <span className="text-ink-muted">Time:</span>
              <span className="ml-1 text-ink-secondary">
                {formatTimestamp(selectedFrame.timestamp)}
              </span>
            </div>
          </div>
          <pre className="bg-canvas p-3 rounded text-xs font-mono overflow-auto max-h-48 whitespace-pre-wrap break-all text-ink-secondary">
            {decodeData(selectedFrame)}
          </pre>
        </div>
      )}

      {/* Summary */}
      <div className="border-t border-edge px-4 py-2 bg-surface text-xs text-ink-muted flex items-center justify-between">
        <span>{frames.length} messages</span>
        <span>
          ↑{' '}
          {frames.filter((f) => f.direction === 'client-to-server').length}{' '}
          sent, ↓{' '}
          {frames.filter((f) => f.direction === 'server-to-client').length}{' '}
          received
        </span>
      </div>

      {/* Frame Composer */}
      {composer}
    </div>
  );
}
