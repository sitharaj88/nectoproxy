import { useMemo } from 'react';
import DiffMatchPatch from 'diff-match-patch';

interface DiffViewProps {
  leftContent: string;
  rightContent: string;
  leftLabel?: string;
  rightLabel?: string;
  mode?: 'inline' | 'side-by-side';
}

const dmp = new DiffMatchPatch();

function getDiffClass(op: number): string {
  switch (op) {
    case -1:
      return 'bg-danger/12 text-danger';
    case 1:
      return 'bg-success/12 text-success';
    default:
      return 'text-ink-secondary';
  }
}

function InlineDiff({ diffs }: { diffs: DiffMatchPatch.Diff[] }) {
  return (
    <pre className="text-sm font-mono whitespace-pre-wrap break-all">
      {diffs.map(([op, text], index) => (
        <span key={index} className={getDiffClass(op)}>
          {text}
        </span>
      ))}
    </pre>
  );
}

function SideBySideDiff({
  diffs,
  leftLabel,
  rightLabel,
}: {
  diffs: DiffMatchPatch.Diff[];
  leftLabel?: string;
  rightLabel?: string;
}) {
  // Build left and right content from diffs
  const { leftLines, rightLines } = useMemo(() => {
    const left: { text: string; type: 'normal' | 'removed' | 'empty' }[] = [];
    const right: { text: string; type: 'normal' | 'added' | 'empty' }[] = [];

    // Split into lines and categorize
    for (const [op, text] of diffs) {
      const lines = text.split('\n');
      lines.forEach((line, i) => {
        // Skip empty string at the end of split
        if (i === lines.length - 1 && line === '') return;

        if (op === -1) {
          // Removed - goes to left
          left.push({ text: line, type: 'removed' });
          right.push({ text: '', type: 'empty' });
        } else if (op === 1) {
          // Added - goes to right
          left.push({ text: '', type: 'empty' });
          right.push({ text: line, type: 'added' });
        } else {
          // Unchanged - goes to both
          left.push({ text: line, type: 'normal' });
          right.push({ text: line, type: 'normal' });
        }
      });
    }

    // Merge adjacent empty lines if possible
    const mergedLeft: typeof left = [];
    const mergedRight: typeof right = [];

    let i = 0;
    while (i < left.length || i < right.length) {
      mergedLeft.push(left[i] || { text: '', type: 'empty' });
      mergedRight.push(right[i] || { text: '', type: 'empty' });
      i++;
    }

    return { leftLines: mergedLeft, rightLines: mergedRight };
  }, [diffs]);

  const getLineClass = (type: string) => {
    switch (type) {
      case 'removed':
        return 'bg-danger/12 text-danger';
      case 'added':
        return 'bg-success/12 text-success';
      case 'empty':
        return 'bg-surface text-ink-faint';
      default:
        return 'text-ink-secondary';
    }
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        {leftLabel && (
          <div className="text-xs font-medium text-ink-muted mb-2 px-2">
            {leftLabel}
          </div>
        )}
        <div className="bg-canvas rounded-md overflow-hidden border border-edge">
          {leftLines.map((line, index) => (
            <div
              key={index}
              className={`px-3 py-0.5 font-mono text-xs border-b border-edge-subtle ${getLineClass(
                line.type
              )}`}
            >
              <span className="text-ink-faint mr-3 select-none">{index + 1}</span>
              {line.text || '\u00A0'}
            </div>
          ))}
        </div>
      </div>
      <div>
        {rightLabel && (
          <div className="text-xs font-medium text-ink-muted mb-2 px-2">
            {rightLabel}
          </div>
        )}
        <div className="bg-canvas rounded-md overflow-hidden border border-edge">
          {rightLines.map((line, index) => (
            <div
              key={index}
              className={`px-3 py-0.5 font-mono text-xs border-b border-edge-subtle ${getLineClass(
                line.type
              )}`}
            >
              <span className="text-ink-faint mr-3 select-none">{index + 1}</span>
              {line.text || '\u00A0'}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DiffView({
  leftContent,
  rightContent,
  leftLabel,
  rightLabel,
  mode = 'side-by-side',
}: DiffViewProps) {
  const diffs = useMemo(() => {
    return dmp.diff_main(leftContent, rightContent);
  }, [leftContent, rightContent]);

  // Clean up the diffs
  useMemo(() => {
    dmp.diff_cleanupSemantic(diffs);
  }, [diffs]);

  const hasChanges = diffs.some(([op]) => op !== 0);

  if (!hasChanges) {
    return (
      <div className="text-center py-4 text-ink-faint text-sm">
        No differences found
      </div>
    );
  }

  if (mode === 'inline') {
    return <InlineDiff diffs={diffs} />;
  }

  return (
    <SideBySideDiff
      diffs={diffs}
      leftLabel={leftLabel}
      rightLabel={rightLabel}
    />
  );
}
