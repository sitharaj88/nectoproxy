import { type ReactNode } from 'react';
import { cn } from './cn';

/** Keyboard key hint. */
export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex min-w-[18px] items-center justify-center rounded border border-edge',
        'bg-surface-raised px-1 py-px font-mono text-[10px] font-medium text-ink-muted',
        className
      )}
    >
      {children}
    </kbd>
  );
}
