import { useState, useMemo } from 'react';
import { X, ArrowLeftRight, Clock, FileText, Globe, Minus, Plus, Equal } from 'lucide-react';
import { DiffView } from './DiffView';
import type { TrafficEntry } from '@proxyscope/shared';

type DiffTab = 'overview' | 'headers' | 'request' | 'response' | 'timing';

interface DiffViewerProps {
  leftEntry: TrafficEntry;
  rightEntry: TrafficEntry;
  onClose: () => void;
}

// --- Helpers ---

function bodyToString(body: unknown): string {
  if (!body) return '';
  if (typeof body === 'string') {
    try {
      return atob(body);
    } catch {
      return body;
    }
  }
  if (body instanceof ArrayBuffer) return new TextDecoder().decode(body);
  if (body instanceof Uint8Array) return new TextDecoder().decode(body);
  if (
    typeof body === 'object' &&
    body !== null &&
    'type' in body &&
    (body as Record<string, unknown>).type === 'Buffer' &&
    'data' in body
  ) {
    return new TextDecoder().decode(
      new Uint8Array((body as Record<string, unknown>).data as number[])
    );
  }
  return JSON.stringify(body);
}

function formatBody(body: unknown, headers: Record<string, string | string[]> | null): string {
  const bodyStr = bodyToString(body);
  if (!bodyStr) return '(empty)';

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

function formatHeaderValue(value: string | string[]): string {
  return Array.isArray(value) ? value.join(', ') : value;
}

function getPath(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname + urlObj.search;
  } catch {
    return url;
  }
}

function formatDuration(ms: number | null): string {
  if (ms === null) return 'Pending';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatSize(bytes: number | null): string {
  if (bytes === null || bytes === 0) return '-';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

// --- Header Diff Logic ---

interface HeaderDiff {
  key: string;
  type: 'same' | 'added' | 'removed' | 'changed';
  leftValue?: string;
  rightValue?: string;
}

function computeHeaderDiffs(
  leftHeaders: Record<string, string | string[]> | null,
  rightHeaders: Record<string, string | string[]> | null
): HeaderDiff[] {
  const left = leftHeaders || {};
  const right = rightHeaders || {};
  const allKeys = new Set([...Object.keys(left), ...Object.keys(right)]);
  const diffs: HeaderDiff[] = [];

  for (const key of Array.from(allKeys).sort()) {
    const lv = key in left ? formatHeaderValue(left[key]) : undefined;
    const rv = key in right ? formatHeaderValue(right[key]) : undefined;

    if (lv !== undefined && rv !== undefined) {
      if (lv === rv) {
        diffs.push({ key, type: 'same', leftValue: lv, rightValue: rv });
      } else {
        diffs.push({ key, type: 'changed', leftValue: lv, rightValue: rv });
      }
    } else if (lv !== undefined) {
      diffs.push({ key, type: 'removed', leftValue: lv });
    } else {
      diffs.push({ key, type: 'added', rightValue: rv });
    }
  }

  return diffs;
}

// --- Line Diff Types ---

interface DiffLine {
  type: 'same' | 'added' | 'removed';
  left?: string;
  right?: string;
  leftLineNum?: number;
  rightLineNum?: number;
}

function computeLineDiff(left: string, right: string): DiffLine[] {
  const leftLines = left.split('\n');
  const rightLines = right.split('\n');

  // Simple LCS-based diff
  const m = leftLines.length;
  const n = rightLines.length;

  // Build LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (leftLines[i - 1] === rightLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to build diff
  const result: DiffLine[] = [];
  let i = m;
  let j = n;
  const stack: DiffLine[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && leftLines[i - 1] === rightLines[j - 1]) {
      stack.push({
        type: 'same',
        left: leftLines[i - 1],
        right: rightLines[j - 1],
        leftLineNum: i,
        rightLineNum: j,
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      stack.push({
        type: 'added',
        right: rightLines[j - 1],
        rightLineNum: j,
      });
      j--;
    } else {
      stack.push({
        type: 'removed',
        left: leftLines[i - 1],
        leftLineNum: i,
      });
      i--;
    }
  }

  while (stack.length > 0) {
    result.push(stack.pop()!);
  }

  return result;
}

// --- Subcomponents ---

function EntryBadge({ entry, label }: { entry: TrafficEntry; label: string }) {
  return (
    <div className="bg-gray-800 rounded-lg p-3 flex-1 min-w-0">
      <div className="text-xs text-gray-500 mb-1 font-medium">{label}</div>
      <div className="flex items-center gap-2 min-w-0">
        <span className={`font-mono text-sm font-medium method-${entry.method.toLowerCase()}`}>
          {entry.method}
        </span>
        <span className="text-sm text-gray-300 truncate flex-1" title={entry.url}>
          {getPath(entry.url)}
        </span>
        <span
          className={`text-sm font-mono font-medium ${
            entry.status && entry.status >= 400
              ? 'text-red-400'
              : entry.status && entry.status >= 200
              ? 'text-green-400'
              : 'text-gray-400'
          }`}
        >
          {entry.status || 'Pending'}
        </span>
      </div>
      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
        <span>{entry.host}</span>
        <span>{formatDuration(entry.duration)}</span>
        <span>{formatSize(entry.responseBodySize)}</span>
      </div>
    </div>
  );
}

function OverviewTab({
  leftEntry,
  rightEntry,
}: {
  leftEntry: TrafficEntry;
  rightEntry: TrafficEntry;
}) {
  const summaryItems = useMemo(() => {
    const items: {
      label: string;
      leftVal: string;
      rightVal: string;
      isDifferent: boolean;
    }[] = [
      {
        label: 'Method',
        leftVal: leftEntry.method,
        rightVal: rightEntry.method,
        isDifferent: leftEntry.method !== rightEntry.method,
      },
      {
        label: 'URL',
        leftVal: getPath(leftEntry.url),
        rightVal: getPath(rightEntry.url),
        isDifferent: leftEntry.url !== rightEntry.url,
      },
      {
        label: 'Host',
        leftVal: leftEntry.host,
        rightVal: rightEntry.host,
        isDifferent: leftEntry.host !== rightEntry.host,
      },
      {
        label: 'Status',
        leftVal: leftEntry.status ? `${leftEntry.status} ${leftEntry.statusText || ''}` : 'Pending',
        rightVal: rightEntry.status
          ? `${rightEntry.status} ${rightEntry.statusText || ''}`
          : 'Pending',
        isDifferent: leftEntry.status !== rightEntry.status,
      },
      {
        label: 'Protocol',
        leftVal: leftEntry.protocol,
        rightVal: rightEntry.protocol,
        isDifferent: leftEntry.protocol !== rightEntry.protocol,
      },
      {
        label: 'Duration',
        leftVal: formatDuration(leftEntry.duration),
        rightVal: formatDuration(rightEntry.duration),
        isDifferent: leftEntry.duration !== rightEntry.duration,
      },
      {
        label: 'Response Size',
        leftVal: formatSize(leftEntry.responseBodySize),
        rightVal: formatSize(rightEntry.responseBodySize),
        isDifferent: leftEntry.responseBodySize !== rightEntry.responseBodySize,
      },
    ];
    return items;
  }, [leftEntry, rightEntry]);

  const diffCount = summaryItems.filter((i) => i.isDifferent).length;

  // Header diff counts
  const reqHeaderDiffs = computeHeaderDiffs(leftEntry.requestHeaders, rightEntry.requestHeaders);
  const resHeaderDiffs = computeHeaderDiffs(leftEntry.responseHeaders, rightEntry.responseHeaders);
  const reqHeaderChanges = reqHeaderDiffs.filter((d) => d.type !== 'same').length;
  const resHeaderChanges = resHeaderDiffs.filter((d) => d.type !== 'same').length;

  const reqBodyLeft = formatBody(leftEntry.requestBody, leftEntry.requestHeaders);
  const reqBodyRight = formatBody(rightEntry.requestBody, rightEntry.requestHeaders);
  const resBodyLeft = formatBody(leftEntry.responseBody, leftEntry.responseHeaders);
  const resBodyRight = formatBody(rightEntry.responseBody, rightEntry.responseHeaders);
  const reqBodyDifferent = reqBodyLeft !== reqBodyRight;
  const resBodyDifferent = resBodyLeft !== resBodyRight;

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-yellow-400">{diffCount}</div>
          <div className="text-xs text-gray-400 mt-1">Property Differences</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-400">
            {reqHeaderChanges + resHeaderChanges}
          </div>
          <div className="text-xs text-gray-400 mt-1">Header Changes</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-purple-400">
            {(reqBodyDifferent ? 1 : 0) + (resBodyDifferent ? 1 : 0)}
          </div>
          <div className="text-xs text-gray-400 mt-1">Body Differences</div>
        </div>
      </div>

      {/* Properties table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="grid grid-cols-[140px_1fr_1fr] text-xs font-medium text-gray-400 px-4 py-2 bg-gray-750 border-b border-gray-700">
          <div>Property</div>
          <div>Request A</div>
          <div>Request B</div>
        </div>
        {summaryItems.map((item) => (
          <div
            key={item.label}
            className={`grid grid-cols-[140px_1fr_1fr] text-sm px-4 py-2 border-b border-gray-700/50 ${
              item.isDifferent ? 'bg-yellow-900/10' : ''
            }`}
          >
            <div className="text-gray-400 font-medium text-xs">{item.label}</div>
            <div
              className={`font-mono text-xs truncate pr-2 ${
                item.isDifferent ? 'text-yellow-300' : 'text-gray-300'
              }`}
              title={item.leftVal}
            >
              {item.leftVal}
            </div>
            <div
              className={`font-mono text-xs truncate ${
                item.isDifferent ? 'text-yellow-300' : 'text-gray-300'
              }`}
              title={item.rightVal}
            >
              {item.rightVal}
            </div>
          </div>
        ))}
      </div>

      {/* Change summary badges */}
      <div className="flex flex-wrap gap-2 text-xs">
        {reqHeaderChanges > 0 && (
          <span className="px-2 py-1 rounded bg-blue-900/30 text-blue-300">
            {reqHeaderChanges} request header change{reqHeaderChanges > 1 ? 's' : ''}
          </span>
        )}
        {resHeaderChanges > 0 && (
          <span className="px-2 py-1 rounded bg-blue-900/30 text-blue-300">
            {resHeaderChanges} response header change{resHeaderChanges > 1 ? 's' : ''}
          </span>
        )}
        {reqBodyDifferent && (
          <span className="px-2 py-1 rounded bg-purple-900/30 text-purple-300">
            Request body differs
          </span>
        )}
        {resBodyDifferent && (
          <span className="px-2 py-1 rounded bg-purple-900/30 text-purple-300">
            Response body differs
          </span>
        )}
        {!reqHeaderChanges && !resHeaderChanges && !reqBodyDifferent && !resBodyDifferent && diffCount === 0 && (
          <span className="px-2 py-1 rounded bg-green-900/30 text-green-300">
            Requests are identical
          </span>
        )}
      </div>
    </div>
  );
}

function HeaderDiffRow({ diff }: { diff: HeaderDiff }) {
  const bgClass =
    diff.type === 'added'
      ? 'bg-green-900/20'
      : diff.type === 'removed'
      ? 'bg-red-900/20'
      : diff.type === 'changed'
      ? 'bg-yellow-900/20'
      : '';

  const iconClass =
    diff.type === 'added'
      ? 'text-green-400'
      : diff.type === 'removed'
      ? 'text-red-400'
      : diff.type === 'changed'
      ? 'text-yellow-400'
      : 'text-gray-600';

  const Icon =
    diff.type === 'added'
      ? Plus
      : diff.type === 'removed'
      ? Minus
      : diff.type === 'changed'
      ? ArrowLeftRight
      : Equal;

  return (
    <div className={`grid grid-cols-[20px_180px_1fr_1fr] gap-2 px-3 py-1.5 text-xs font-mono border-b border-gray-700/50 ${bgClass}`}>
      <div className="flex items-center">
        <Icon className={`w-3 h-3 ${iconClass}`} />
      </div>
      <div className="text-gray-300 font-medium truncate" title={diff.key}>
        {diff.key}
      </div>
      <div
        className={`truncate ${
          diff.type === 'removed'
            ? 'text-red-300'
            : diff.type === 'changed'
            ? 'text-yellow-300'
            : 'text-gray-400'
        }`}
        title={diff.leftValue}
      >
        {diff.leftValue ?? ''}
      </div>
      <div
        className={`truncate ${
          diff.type === 'added'
            ? 'text-green-300'
            : diff.type === 'changed'
            ? 'text-yellow-300'
            : 'text-gray-400'
        }`}
        title={diff.rightValue}
      >
        {diff.rightValue ?? ''}
      </div>
    </div>
  );
}

function HeadersTab({
  leftEntry,
  rightEntry,
}: {
  leftEntry: TrafficEntry;
  rightEntry: TrafficEntry;
}) {
  const [showUnchanged, setShowUnchanged] = useState(true);

  const reqDiffs = useMemo(
    () => computeHeaderDiffs(leftEntry.requestHeaders, rightEntry.requestHeaders),
    [leftEntry.requestHeaders, rightEntry.requestHeaders]
  );

  const resDiffs = useMemo(
    () => computeHeaderDiffs(leftEntry.responseHeaders, rightEntry.responseHeaders),
    [leftEntry.responseHeaders, rightEntry.responseHeaders]
  );

  const filteredReqDiffs = showUnchanged ? reqDiffs : reqDiffs.filter((d) => d.type !== 'same');
  const filteredResDiffs = showUnchanged ? resDiffs : resDiffs.filter((d) => d.type !== 'same');

  const reqChanges = reqDiffs.filter((d) => d.type !== 'same').length;
  const resChanges = resDiffs.filter((d) => d.type !== 'same').length;

  return (
    <div className="space-y-4">
      {/* Filter toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-green-400">
            <Plus className="w-3 h-3" /> Added
          </span>
          <span className="flex items-center gap-1 text-red-400">
            <Minus className="w-3 h-3" /> Removed
          </span>
          <span className="flex items-center gap-1 text-yellow-400">
            <ArrowLeftRight className="w-3 h-3" /> Changed
          </span>
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={showUnchanged}
            onChange={(e) => setShowUnchanged(e.target.checked)}
            className="rounded border-gray-600"
          />
          Show unchanged
        </label>
      </div>

      {/* Request Headers */}
      <div className="border border-gray-700 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800">
          <span className="text-sm font-medium text-gray-200">Request Headers</span>
          <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-400">
            {reqChanges > 0 ? `${reqChanges} change${reqChanges > 1 ? 's' : ''}` : 'No changes'}
          </span>
        </div>
        <div className="bg-gray-900/50">
          <div className="grid grid-cols-[20px_180px_1fr_1fr] gap-2 px-3 py-1.5 text-xs font-medium text-gray-500 border-b border-gray-700">
            <div />
            <div>Header</div>
            <div>Request A</div>
            <div>Request B</div>
          </div>
          {filteredReqDiffs.length > 0 ? (
            filteredReqDiffs.map((diff) => <HeaderDiffRow key={diff.key} diff={diff} />)
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              {showUnchanged ? 'No headers' : 'No differences'}
            </div>
          )}
        </div>
      </div>

      {/* Response Headers */}
      <div className="border border-gray-700 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800">
          <span className="text-sm font-medium text-gray-200">Response Headers</span>
          <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-400">
            {resChanges > 0 ? `${resChanges} change${resChanges > 1 ? 's' : ''}` : 'No changes'}
          </span>
        </div>
        <div className="bg-gray-900/50">
          <div className="grid grid-cols-[20px_180px_1fr_1fr] gap-2 px-3 py-1.5 text-xs font-medium text-gray-500 border-b border-gray-700">
            <div />
            <div>Header</div>
            <div>Request A</div>
            <div>Request B</div>
          </div>
          {filteredResDiffs.length > 0 ? (
            filteredResDiffs.map((diff) => <HeaderDiffRow key={diff.key} diff={diff} />)
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              {showUnchanged ? 'No headers' : 'No differences'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BodyDiffTab({
  leftBody,
  rightBody,
  leftHeaders,
  rightHeaders,
  title,
}: {
  leftBody: unknown;
  rightBody: unknown;
  leftHeaders: Record<string, string | string[]> | null;
  rightHeaders: Record<string, string | string[]> | null;
  title: string;
}) {
  const [viewMode, setViewMode] = useState<'side-by-side' | 'inline' | 'raw'>('side-by-side');

  const leftFormatted = useMemo(
    () => formatBody(leftBody, leftHeaders),
    [leftBody, leftHeaders]
  );
  const rightFormatted = useMemo(
    () => formatBody(rightBody, rightHeaders),
    [rightBody, rightHeaders]
  );

  const lineDiffs = useMemo(
    () => computeLineDiff(leftFormatted, rightFormatted),
    [leftFormatted, rightFormatted]
  );

  const hasChanges = leftFormatted !== rightFormatted;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-300">{title}</h3>
        <div className="flex items-center bg-gray-800 rounded-md text-xs">
          <button
            onClick={() => setViewMode('side-by-side')}
            className={`px-3 py-1.5 rounded-l-md transition-colors ${
              viewMode === 'side-by-side'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Side by Side
          </button>
          <button
            onClick={() => setViewMode('inline')}
            className={`px-3 py-1.5 transition-colors ${
              viewMode === 'inline'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Inline
          </button>
          <button
            onClick={() => setViewMode('raw')}
            className={`px-3 py-1.5 rounded-r-md transition-colors ${
              viewMode === 'raw'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Raw
          </button>
        </div>
      </div>

      {!hasChanges ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          No differences found in {title.toLowerCase()}
        </div>
      ) : viewMode === 'raw' ? (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs font-medium text-gray-400 mb-2 px-1">Request A</div>
            <pre className="bg-gray-800 rounded-lg p-3 text-xs font-mono text-gray-300 whitespace-pre-wrap overflow-auto max-h-[500px] border border-gray-700">
              {leftFormatted}
            </pre>
          </div>
          <div>
            <div className="text-xs font-medium text-gray-400 mb-2 px-1">Request B</div>
            <pre className="bg-gray-800 rounded-lg p-3 text-xs font-mono text-gray-300 whitespace-pre-wrap overflow-auto max-h-[500px] border border-gray-700">
              {rightFormatted}
            </pre>
          </div>
        </div>
      ) : viewMode === 'inline' ? (
        <DiffView
          leftContent={leftFormatted}
          rightContent={rightFormatted}
          leftLabel="Request A"
          rightLabel="Request B"
          mode="inline"
        />
      ) : (
        /* side-by-side with LCS diff */
        <div className="grid grid-cols-2 gap-0 border border-gray-700 rounded-lg overflow-hidden">
          {/* Left header */}
          <div className="px-3 py-1.5 text-xs font-medium text-gray-400 bg-gray-800 border-b border-r border-gray-700">
            Request A
          </div>
          <div className="px-3 py-1.5 text-xs font-medium text-gray-400 bg-gray-800 border-b border-gray-700">
            Request B
          </div>

          {/* Left pane */}
          <div className="bg-gray-900 border-r border-gray-700 overflow-auto max-h-[500px]">
            {lineDiffs.map((line, index) => {
              const bgCls =
                line.type === 'removed'
                  ? 'bg-red-900/20'
                  : line.type === 'added'
                  ? 'bg-gray-800/30'
                  : '';
              const textCls =
                line.type === 'removed' ? 'text-red-300' : line.type === 'added' ? 'text-gray-600' : 'text-gray-300';
              return (
                <div
                  key={index}
                  className={`flex items-start px-1 py-0.5 font-mono text-xs border-b border-gray-800/50 min-h-[20px] ${bgCls}`}
                >
                  <span className="text-gray-600 w-8 text-right mr-2 select-none flex-shrink-0">
                    {line.leftLineNum ?? ''}
                  </span>
                  <span className={`flex-1 whitespace-pre-wrap break-all ${textCls}`}>
                    {line.left ?? '\u00A0'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Right pane */}
          <div className="bg-gray-900 overflow-auto max-h-[500px]">
            {lineDiffs.map((line, index) => {
              const bgCls =
                line.type === 'added'
                  ? 'bg-green-900/20'
                  : line.type === 'removed'
                  ? 'bg-gray-800/30'
                  : '';
              const textCls =
                line.type === 'added' ? 'text-green-300' : line.type === 'removed' ? 'text-gray-600' : 'text-gray-300';
              return (
                <div
                  key={index}
                  className={`flex items-start px-1 py-0.5 font-mono text-xs border-b border-gray-800/50 min-h-[20px] ${bgCls}`}
                >
                  <span className="text-gray-600 w-8 text-right mr-2 select-none flex-shrink-0">
                    {line.rightLineNum ?? ''}
                  </span>
                  <span className={`flex-1 whitespace-pre-wrap break-all ${textCls}`}>
                    {line.right ?? '\u00A0'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function TimingTab({
  leftEntry,
  rightEntry,
}: {
  leftEntry: TrafficEntry;
  rightEntry: TrafficEntry;
}) {
  const leftDuration = leftEntry.duration || 0;
  const rightDuration = rightEntry.duration || 0;
  const maxDuration = Math.max(leftDuration, rightDuration, 1);

  const leftReqSize = leftEntry.requestBodySize || 0;
  const rightReqSize = rightEntry.requestBodySize || 0;
  const leftResSize = leftEntry.responseBodySize || 0;
  const rightResSize = rightEntry.responseBodySize || 0;
  const maxReqSize = Math.max(leftReqSize, rightReqSize, 1);
  const maxResSize = Math.max(leftResSize, rightResSize, 1);

  const timingDiff = rightDuration - leftDuration;
  const timingPctDiff = leftDuration > 0 ? ((timingDiff / leftDuration) * 100).toFixed(1) : 'N/A';

  const bars: {
    label: string;
    leftVal: number;
    rightVal: number;
    maxVal: number;
    leftLabel: string;
    rightLabel: string;
  }[] = [
    {
      label: 'Duration',
      leftVal: leftDuration,
      rightVal: rightDuration,
      maxVal: maxDuration,
      leftLabel: formatDuration(leftEntry.duration),
      rightLabel: formatDuration(rightEntry.duration),
    },
    {
      label: 'Request Size',
      leftVal: leftReqSize,
      rightVal: rightReqSize,
      maxVal: maxReqSize,
      leftLabel: formatSize(leftReqSize),
      rightLabel: formatSize(rightReqSize),
    },
    {
      label: 'Response Size',
      leftVal: leftResSize,
      rightVal: rightResSize,
      maxVal: maxResSize,
      leftLabel: formatSize(leftResSize),
      rightLabel: formatSize(rightResSize),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Timing delta */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="text-center">
          <div
            className={`text-3xl font-bold ${
              timingDiff > 0
                ? 'text-red-400'
                : timingDiff < 0
                ? 'text-green-400'
                : 'text-gray-400'
            }`}
          >
            {timingDiff > 0 ? '+' : ''}
            {timingDiff}ms
          </div>
          <div className="text-sm text-gray-400 mt-1">
            Duration difference{' '}
            {timingPctDiff !== 'N/A' && (
              <span
                className={
                  timingDiff > 0
                    ? 'text-red-400'
                    : timingDiff < 0
                    ? 'text-green-400'
                    : 'text-gray-400'
                }
              >
                ({timingDiff > 0 ? '+' : ''}
                {timingPctDiff}%)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Comparison bars */}
      <div className="space-y-6">
        {bars.map((bar) => (
          <div key={bar.label} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-300 font-medium">{bar.label}</span>
            </div>

            {/* Request A bar */}
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-20">Request A</span>
                <div className="flex-1 bg-gray-800 rounded-full h-6 overflow-hidden">
                  <div
                    className="h-full bg-blue-500/60 rounded-full flex items-center px-2 transition-all duration-500"
                    style={{
                      width: `${Math.max((bar.leftVal / bar.maxVal) * 100, 2)}%`,
                    }}
                  >
                    <span className="text-xs text-white font-mono whitespace-nowrap">
                      {bar.leftLabel}
                    </span>
                  </div>
                </div>
              </div>

              {/* Request B bar */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-20">Request B</span>
                <div className="flex-1 bg-gray-800 rounded-full h-6 overflow-hidden">
                  <div
                    className={`h-full rounded-full flex items-center px-2 transition-all duration-500 ${
                      bar.rightVal > bar.leftVal
                        ? 'bg-red-500/60'
                        : bar.rightVal < bar.leftVal
                        ? 'bg-green-500/60'
                        : 'bg-blue-500/60'
                    }`}
                    style={{
                      width: `${Math.max((bar.rightVal / bar.maxVal) * 100, 2)}%`,
                    }}
                  >
                    <span className="text-xs text-white font-mono whitespace-nowrap">
                      {bar.rightLabel}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Timing details table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="grid grid-cols-3 text-xs font-medium text-gray-400 px-4 py-2 border-b border-gray-700">
          <div>Metric</div>
          <div>Request A</div>
          <div>Request B</div>
        </div>
        <div className="grid grid-cols-3 text-sm px-4 py-2 border-b border-gray-700/50">
          <div className="text-gray-400 text-xs">Duration</div>
          <div className="text-gray-300 font-mono text-xs">{formatDuration(leftEntry.duration)}</div>
          <div className="text-gray-300 font-mono text-xs">{formatDuration(rightEntry.duration)}</div>
        </div>
        <div className="grid grid-cols-3 text-sm px-4 py-2 border-b border-gray-700/50">
          <div className="text-gray-400 text-xs">Request Size</div>
          <div className="text-gray-300 font-mono text-xs">{formatSize(leftEntry.requestBodySize)}</div>
          <div className="text-gray-300 font-mono text-xs">{formatSize(rightEntry.requestBodySize)}</div>
        </div>
        <div className="grid grid-cols-3 text-sm px-4 py-2 border-b border-gray-700/50">
          <div className="text-gray-400 text-xs">Response Size</div>
          <div className="text-gray-300 font-mono text-xs">{formatSize(leftEntry.responseBodySize)}</div>
          <div className="text-gray-300 font-mono text-xs">{formatSize(rightEntry.responseBodySize)}</div>
        </div>
        {leftEntry.remoteAddress && (
          <div className="grid grid-cols-3 text-sm px-4 py-2 border-b border-gray-700/50">
            <div className="text-gray-400 text-xs">Remote Address</div>
            <div className="text-gray-300 font-mono text-xs">{leftEntry.remoteAddress || '-'}</div>
            <div className="text-gray-300 font-mono text-xs">{rightEntry.remoteAddress || '-'}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Main DiffViewer ---

const TABS: { id: DiffTab; label: string; icon: typeof FileText }[] = [
  { id: 'overview', label: 'Overview', icon: Globe },
  { id: 'headers', label: 'Headers', icon: FileText },
  { id: 'request', label: 'Request Body', icon: FileText },
  { id: 'response', label: 'Response Body', icon: FileText },
  { id: 'timing', label: 'Timing', icon: Clock },
];

export function DiffViewer({ leftEntry, rightEntry, onClose }: DiffViewerProps) {
  const [activeTab, setActiveTab] = useState<DiffTab>('overview');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div
        className="bg-gray-900 rounded-lg shadow-2xl w-full max-w-7xl max-h-[92vh] flex flex-col border border-gray-700"
        role="dialog"
        aria-modal="true"
        aria-labelledby="diffviewer-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700 rounded-t-lg">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-blue-400" />
            <h2 id="diffviewer-title" className="text-lg font-semibold text-white">
              Compare Requests
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            aria-label="Close diff viewer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Entry summaries */}
        <div className="flex gap-4 px-4 py-3 border-b border-gray-700 bg-gray-800/50">
          <EntryBadge entry={leftEntry} label="Request A" />
          <div className="flex items-center">
            <ArrowLeftRight className="w-4 h-4 text-gray-600" />
          </div>
          <EntryBadge entry={rightEntry} label="Request B" />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700 bg-gray-800/30 px-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'text-blue-400 border-blue-400'
                  : 'text-gray-400 hover:text-gray-300 border-transparent'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-auto p-4">
          {activeTab === 'overview' && (
            <OverviewTab leftEntry={leftEntry} rightEntry={rightEntry} />
          )}

          {activeTab === 'headers' && (
            <HeadersTab leftEntry={leftEntry} rightEntry={rightEntry} />
          )}

          {activeTab === 'request' && (
            <BodyDiffTab
              leftBody={leftEntry.requestBody}
              rightBody={rightEntry.requestBody}
              leftHeaders={leftEntry.requestHeaders}
              rightHeaders={rightEntry.requestHeaders}
              title="Request Body"
            />
          )}

          {activeTab === 'response' && (
            <BodyDiffTab
              leftBody={leftEntry.responseBody}
              rightBody={rightEntry.responseBody}
              leftHeaders={leftEntry.responseHeaders}
              rightHeaders={rightEntry.responseHeaders}
              title="Response Body"
            />
          )}

          {activeTab === 'timing' && (
            <TimingTab leftEntry={leftEntry} rightEntry={rightEntry} />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700 bg-gray-800/30 rounded-b-lg">
          <div className="text-xs text-gray-500">
            Comparing {getPath(leftEntry.url)} vs {getPath(rightEntry.url)}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
