import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from './cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle';
type Size = 'xs' | 'sm' | 'md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const base =
  'inline-flex items-center justify-center gap-1.5 font-medium whitespace-nowrap rounded-md ' +
  'transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-accent/70 disabled:opacity-50 disabled:pointer-events-none select-none';

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-accent-fg hover:bg-accent-hover shadow-panel',
  secondary:
    'bg-surface-raised text-ink border border-edge hover:bg-surface-overlay hover:border-edge-strong',
  ghost: 'text-ink-secondary hover:bg-surface-raised hover:text-ink',
  subtle: 'bg-surface-raised/60 text-ink-secondary hover:bg-surface-raised hover:text-ink',
  danger: 'bg-danger text-white hover:brightness-110 shadow-panel',
};

const sizes: Record<Size, string> = {
  xs: 'h-6 px-2 text-xs',
  sm: 'h-7 px-2.5 text-xs',
  md: 'h-8 px-3 text-sm',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'sm', className, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  )
);
Button.displayName = 'Button';
