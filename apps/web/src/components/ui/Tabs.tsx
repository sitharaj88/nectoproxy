import { type ReactNode } from 'react';
import * as RTabs from '@radix-ui/react-tabs';
import { cn } from './cn';

export interface TabItem {
  value: string;
  label: ReactNode;
  count?: number;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  size?: 'sm' | 'md';
  /** Accessible name for the tablist. */
  label?: string;
}

/**
 * Accessible underline tab bar (Radix): arrow-key nav, roving focus, aria wiring.
 * Renders only the tab list — pair with your own panels keyed off `value`.
 */
export function Tabs({ items, value, onValueChange, className, size = 'sm', label }: TabsProps) {
  const pad = size === 'md' ? 'h-9 px-3 text-sm' : 'h-8 px-2.5 text-xs';
  return (
    <RTabs.Root value={value} onValueChange={onValueChange}>
      <RTabs.List
        aria-label={label}
        className={cn('flex items-center gap-0.5 border-b border-edge', className)}
      >
        {items.map((item) => (
          <RTabs.Trigger
            key={item.value}
            value={item.value}
            className={cn(
              'relative inline-flex items-center gap-1.5 font-medium -mb-px border-b-2 border-transparent',
              'text-ink-muted hover:text-ink transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 rounded-t',
              'data-[state=active]:text-ink data-[state=active]:border-accent',
              pad
            )}
          >
            {item.label}
            {item.count != null && (
              <span className="rounded-full bg-surface-raised px-1.5 text-[10px] tabular-nums text-ink-muted">
                {item.count}
              </span>
            )}
          </RTabs.Trigger>
        ))}
      </RTabs.List>
    </RTabs.Root>
  );
}
