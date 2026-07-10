import { type ReactNode } from 'react';
import * as RTooltip from '@radix-ui/react-tooltip';
import { cn } from './cn';

export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <RTooltip.Provider delayDuration={400} skipDelayDuration={200}>
      {children}
    </RTooltip.Provider>
  );
}

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  shortcut?: string;
}

/** Accessible rich tooltip. Wrap any focusable trigger. */
export function Tooltip({ content, children, side = 'top', align = 'center', shortcut }: TooltipProps) {
  if (content == null || content === '') return <>{children}</>;
  return (
    <RTooltip.Root>
      <RTooltip.Trigger asChild>{children}</RTooltip.Trigger>
      <RTooltip.Portal>
        <RTooltip.Content
          side={side}
          align={align}
          sideOffset={6}
          className={cn(
            'z-[100] flex items-center gap-2 rounded-md px-2 py-1 text-xs',
            'bg-surface-overlay text-ink border border-edge shadow-popover',
            'animate-scaleIn origin-[var(--radix-tooltip-content-transform-origin)]'
          )}
        >
          {content}
          {shortcut && (
            <kbd className="rounded bg-surface px-1 py-px font-mono text-[10px] text-ink-muted border border-edge">
              {shortcut}
            </kbd>
          )}
          <RTooltip.Arrow className="fill-surface-overlay" />
        </RTooltip.Content>
      </RTooltip.Portal>
    </RTooltip.Root>
  );
}
