import { type ReactNode } from 'react';
import { cn } from './cn';

type Tone = 'neutral' | 'accent' | 'success' | 'info' | 'warn' | 'danger';

const tones: Record<Tone, string> = {
  neutral: 'bg-surface-raised text-ink-secondary border-edge',
  accent: 'bg-accent/12 text-accent border-accent/25',
  success: 'bg-success/12 text-success border-success/25',
  info: 'bg-info/12 text-info border-info/25',
  warn: 'bg-warn/12 text-warn border-warn/25',
  danger: 'bg-danger/12 text-danger border-danger/25',
};

export interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  mono?: boolean;
}

export function Badge({ children, tone = 'neutral', className, mono }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium border leading-none',
        mono && 'font-mono tabular-nums',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/** Map an HTTP status code to a semantic tone. */
export function statusTone(status: number): Tone {
  if (status >= 500) return 'danger';
  if (status >= 400) return 'warn';
  if (status >= 300) return 'info';
  if (status >= 200) return 'success';
  return 'neutral';
}
