import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from './cn';
import { Tooltip } from './Tooltip';

type Variant = 'ghost' | 'secondary' | 'primary' | 'danger';
type Size = 'sm' | 'md';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible label; also shown as a tooltip unless `tooltip={false}`. */
  label: string;
  icon: ReactNode;
  variant?: Variant;
  size?: Size;
  active?: boolean;
  tooltip?: boolean;
  shortcut?: string;
  tooltipSide?: 'top' | 'right' | 'bottom' | 'left';
}

const base =
  'inline-flex items-center justify-center rounded-md transition-colors duration-100 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 ' +
  'disabled:opacity-40 disabled:pointer-events-none';

const variants: Record<Variant, string> = {
  ghost: 'text-ink-muted hover:text-ink hover:bg-surface-raised',
  secondary: 'text-ink-secondary bg-surface-raised border border-edge hover:bg-surface-overlay',
  primary: 'text-accent-fg bg-accent hover:bg-accent-hover',
  danger: 'text-ink-muted hover:text-white hover:bg-danger',
};

const sizes: Record<Size, string> = {
  sm: 'h-7 w-7',
  md: 'h-8 w-8',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    { label, icon, variant = 'ghost', size = 'sm', active, tooltip = true, shortcut, tooltipSide = 'bottom', className, ...props },
    ref
  ) => {
    const btn = (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        aria-pressed={active}
        className={cn(
          base,
          variants[variant],
          sizes[size],
          active && 'bg-accent/15 text-accent hover:bg-accent/20 hover:text-accent',
          className
        )}
        {...props}
      >
        {icon}
      </button>
    );
    if (!tooltip) return btn;
    return (
      <Tooltip content={label} shortcut={shortcut} side={tooltipSide}>
        {btn}
      </Tooltip>
    );
  }
);
IconButton.displayName = 'IconButton';
