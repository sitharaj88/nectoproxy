import { useState, useEffect } from 'react';
import {
  getWebSocketFrames,
  sendWebSocketFrame,
  type WebSocketFrameResponse,
} from '../services/api';
import { subscribeToWebSocket } from '../services/socket';
import type { WebSocketFrameEvent } from '@nectoproxy/shared';

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
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500 text-sm">
        Error loading WebSocket frames: {error}
      </div>
    );
  }

  const composer = (
    <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-900">
      <div className="flex items-center gap-2 mb-2">
        <div className="inline-flex rounded overflow-hidden border border-gray-300 dark:border-gray-600 text-xs">
          <button
            type="button"
            onClick={() => setComposerDirection('to-server')}
            className={`px-2 py-1 ${
              composerDirection === 'to-server'
                ? 'bg-blue-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300'
            }`}
          >
            ↑ To Server
          </button>
          <button
            type="button"
            onClick={() => setComposerDirection('to-client')}
            className={`px-2 py-1 ${
              composerDirection === 'to-client'
                ? 'bg-blue-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300'
            }`}
          >
            ↓ To Client
          </button>
        </div>
        <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
          <input
            type="checkbox"
            checked={composerBinary}
            onChange={(e) => setComposerBinary(e.target.checked)}
          />
          Binary (base64)
        </label>
        {sendError && (
          <span className="text-xs text-red-500 truncate">{sendError}</span>
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
          className="flex-1 resize-y rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-2 text-xs font-mono text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || !composerText.trim()}
          className="px-3 py-2 rounded bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  );

  if (frames.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center p-4 text-gray-500 text-sm text-center">
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
          <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300 w-8">
                Dir
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300 w-24">
                Time
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300 w-20">
                Type
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300 w-16">
                Size
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                Data
              </th>
            </tr>
          </thead>
          <tbody>
            {frames.map((frame) => (
              <tr
                key={frame.id}
                onClick={() => setSelectedFrame(frame)}
                className={`border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                  selectedFrame?.id === frame.id
                    ? 'bg-blue-50 dark:bg-blue-900/20'
                    : ''
                }`}
              >
                <td className="px-3 py-2 whitespace-nowrap">
                  {frame.direction === 'client-to-server' ? (
                    <span
                      className="text-green-600 dark:text-green-400"
                      title="Client to Server"
                    >
                      ↑
                    </span>
                  ) : (
                    <span
                      className="text-blue-600 dark:text-blue-400"
                      title="Server to Client"
                    >
                      ↓
                    </span>
                  )}
                  {frame.injected && (
                    <span
                      className="ml-1 inline-flex items-center px-1 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                      title="Manually injected frame"
                    >
                      sent
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-gray-500 dark:text-gray-400 font-mono text-xs">
                  {formatTimestamp(frame.timestamp)}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      frame.isBinary
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                        : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    }`}
                  >
                    {OPCODE_NAMES[frame.opcode] || `Op ${frame.opcode}`}
                  </span>
                </td>
                <td className="px-3 py-2 text-gray-500 dark:text-gray-400 text-xs">
                  {formatBytes(frame.length)}
                </td>
                <td className="px-3 py-2 font-mono text-xs truncate max-w-xs text-gray-700 dark:text-gray-300">
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
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">
              Frame Details
            </h4>
            <button
              onClick={() => setSelectedFrame(null)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              ×
            </button>
          </div>
          <div className="grid grid-cols-4 gap-4 text-xs mb-3">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Direction:</span>
              <span className="ml-1 text-gray-700 dark:text-gray-300">
                {selectedFrame.direction === 'client-to-server'
                  ? 'Client → Server'
                  : 'Server → Client'}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Opcode:</span>
              <span className="ml-1 text-gray-700 dark:text-gray-300">
                {OPCODE_NAMES[selectedFrame.opcode] || selectedFrame.opcode}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Size:</span>
              <span className="ml-1 text-gray-700 dark:text-gray-300">
                {formatBytes(selectedFrame.length)}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Time:</span>
              <span className="ml-1 text-gray-700 dark:text-gray-300">
                {formatTimestamp(selectedFrame.timestamp)}
              </span>
            </div>
          </div>
          <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs font-mono overflow-auto max-h-48 whitespace-pre-wrap break-all text-gray-800 dark:text-gray-200">
            {decodeData(selectedFrame)}
          </pre>
        </div>
      )}

      {/* Summary */}
      <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2 bg-gray-50 dark:bg-gray-900 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
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
