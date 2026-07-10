import { type ReactNode } from 'react';
import { cn } from './cn';

export interface Segment<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
  /** Accessible name — required when the segment is icon-only (empty label). */
  ariaLabel?: string;
}

export interface SegmentedControlProps<T extends string> {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  'aria-label'?: string;
}

/** Compact grouped toggle for switching views (e.g. list / waterfall / dashboard). */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  className,
  ...aria
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={aria['aria-label']}
      className={cn('inline-flex items-center gap-0.5 rounded-md bg-surface p-0.5 border border-edge', className)}
    >
      {segments.map((seg) => {
        const selected = seg.value === value;
        return (
          <button
            key={seg.value}
            role="radio"
            aria-checked={selected}
            aria-label={seg.ariaLabel}
            title={seg.ariaLabel}
            type="button"
            onClick={() => onChange(seg.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded px-2 h-6 text-xs font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60',
              selected
                ? 'bg-surface-overlay text-ink shadow-panel'
                : 'text-ink-muted hover:text-ink'
            )}
          >
            {seg.icon}
            {seg.label}
          </button>
        );
      })}
    </div>
  );
}
