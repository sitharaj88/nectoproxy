import { forwardRef, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from './cn';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  sizeVariant?: 'sm' | 'md';
}

/** Styled native select — keeps native a11y + keyboard behavior. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, sizeVariant = 'sm', children, ...props }, ref) => {
    const height = sizeVariant === 'md' ? 'h-8 text-sm' : 'h-7 text-xs';
    return (
      <div className="relative inline-flex items-center">
        <select
          ref={ref}
          className={cn(
            'appearance-none bg-surface-raised text-ink rounded-md border border-edge',
            'pl-2.5 pr-7 transition-colors hover:border-edge-strong',
            'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50',
            'disabled:opacity-60',
            height,
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-ink-muted" />
      </div>
    );
  }
);
Select.displayName = 'Select';
