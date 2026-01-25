import { useMemo } from 'react';
import { X, ArrowLeftRight } from 'lucide-react';
import { useCompareStore } from '@/stores/compareStore';
import { useTrafficStore } from '@/stores/trafficStore';
import { DiffSection } from './DiffSection';
import { DiffView } from './DiffView';
import type { TrafficEntry } from '@proxyscope/shared';

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatHeaders(headers: Record<string, string | string[]> | null): string {
  if (!headers) return '';
  return Object.entries(headers)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => {
      const val = Array.isArray(value) ? value.join(', ') : value;
      return `${key}: ${val}`;
    })
    .join('\n');
}

function formatBody(body: Buffer | null, headers: Record<string, string | string[]> | null): string {
  if (!body) return '(empty)';

  const bodyStr =
    typeof body === 'string'
      ? body
      : Buffer.isBuffer(body)
      ? body.toString('utf-8')
      : JSON.stringify(body);

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

function getPath(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname + urlObj.search;
  } catch {
    return url;
  }
}

function EntryHeader({ entry, label }: { entry: TrafficEntry; label: string }) {
  return (
    <div className="bg-gray-800 rounded-lg p-3">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <span className={`font-mono text-sm method-${entry.method.toLowerCase()}`}>
          {entry.method}
        </span>
        <span className="text-sm text-gray-300 truncate">{getPath(entry.url)}</span>
        <span
          className={`text-sm font-mono ${
            entry.status && entry.status >= 400 ? 'text-red-400' : 'text-green-400'
          }`}
        >
          {entry.status || 'Pending'}
        </span>
      </div>
    </div>
  );
}

export function CompareModal({ isOpen, onClose }: CompareModalProps) {
  const { selectedIds, exitCompareMode } = useCompareStore();
  const entries = useTrafficStore((state) => state.entries);

  const [leftEntry, rightEntry] = useMemo(() => {
    const left = entries.find((e) => e.id === selectedIds[0]);
    const right = entries.find((e) => e.id === selectedIds[1]);
    return [left, right];
  }, [entries, selectedIds]);

  const handleClose = () => {
    exitCompareMode();
    onClose();
  };

  if (!isOpen || !leftEntry || !rightEntry) return null;

  // Calculate differences summary
  const generalDiffs = [];
  if (leftEntry.method !== rightEntry.method) generalDiffs.push('method');
  if (leftEntry.url !== rightEntry.url) generalDiffs.push('URL');
  if (leftEntry.status !== rightEntry.status) generalDiffs.push('status');
  if (leftEntry.protocol !== rightEntry.protocol) generalDiffs.push('protocol');

  const timingDiff = Math.abs((leftEntry.duration || 0) - (rightEntry.duration || 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        className="bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col animate-scaleIn"
        role="dialog"
        aria-modal="true"
        aria-labelledby="compare-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-blue-400" />
            <h2 id="compare-title" className="text-lg font-semibold text-white">
              Compare Requests
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Entry Headers */}
        <div className="grid grid-cols-2 gap-4 px-4 py-3 border-b border-gray-700">
          <EntryHeader entry={leftEntry} label="Request A" />
          <EntryHeader entry={rightEntry} label="Request B" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* General Info */}
          <DiffSection
            title="General"
            badge={generalDiffs.length > 0 ? `${generalDiffs.length} changes` : 'No changes'}
          >
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <span className="text-gray-500 w-20">Method:</span>
                  <span
                    className={
                      leftEntry.method !== rightEntry.method
                        ? 'text-yellow-400'
                        : 'text-gray-300'
                    }
                  >
                    {leftEntry.method}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-500 w-20">Status:</span>
                  <span
                    className={
                      leftEntry.status !== rightEntry.status
                        ? 'text-yellow-400'
                        : 'text-gray-300'
                    }
                  >
                    {leftEntry.status || 'Pending'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-500 w-20">Duration:</span>
                  <span className="text-gray-300">{leftEntry.duration || 0}ms</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <span className="text-gray-500 w-20">Method:</span>
                  <span
                    className={
                      leftEntry.method !== rightEntry.method
                        ? 'text-yellow-400'
                        : 'text-gray-300'
                    }
                  >
                    {rightEntry.method}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-500 w-20">Status:</span>
                  <span
                    className={
                      leftEntry.status !== rightEntry.status
                        ? 'text-yellow-400'
                        : 'text-gray-300'
                    }
                  >
                    {rightEntry.status || 'Pending'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-500 w-20">Duration:</span>
                  <span
                    className={
                      timingDiff > 100 ? 'text-yellow-400' : 'text-gray-300'
                    }
                  >
                    {rightEntry.duration || 0}ms
                    {timingDiff > 0 && (
                      <span className="text-gray-500 ml-1">
                        ({timingDiff > 0 ? '+' : ''}
                        {(rightEntry.duration || 0) - (leftEntry.duration || 0)}ms)
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </DiffSection>

          {/* URL */}
          {leftEntry.url !== rightEntry.url && (
            <DiffSection title="URL" badge="Different">
              <DiffView
                leftContent={leftEntry.url}
                rightContent={rightEntry.url}
                leftLabel="Request A"
                rightLabel="Request B"
                mode="inline"
              />
            </DiffSection>
          )}

          {/* Request Headers */}
          <DiffSection title="Request Headers">
            <DiffView
              leftContent={formatHeaders(leftEntry.requestHeaders)}
              rightContent={formatHeaders(rightEntry.requestHeaders)}
              leftLabel="Request A"
              rightLabel="Request B"
            />
          </DiffSection>

          {/* Request Body */}
          <DiffSection title="Request Body">
            <DiffView
              leftContent={formatBody(leftEntry.requestBody, leftEntry.requestHeaders)}
              rightContent={formatBody(rightEntry.requestBody, rightEntry.requestHeaders)}
              leftLabel="Request A"
              rightLabel="Request B"
            />
          </DiffSection>

          {/* Response Headers */}
          <DiffSection title="Response Headers">
            <DiffView
              leftContent={formatHeaders(leftEntry.responseHeaders)}
              rightContent={formatHeaders(rightEntry.responseHeaders)}
              leftLabel="Request A"
              rightLabel="Request B"
            />
          </DiffSection>

          {/* Response Body */}
          <DiffSection title="Response Body">
            <DiffView
              leftContent={formatBody(leftEntry.responseBody, leftEntry.responseHeaders)}
              rightContent={formatBody(rightEntry.responseBody, rightEntry.responseHeaders)}
              leftLabel="Request A"
              rightLabel="Request B"
            />
          </DiffSection>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-4 py-3 border-t border-gray-700 bg-gray-900/30">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
