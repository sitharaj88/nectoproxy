import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from './cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: ReactNode;
  sizeVariant?: 'sm' | 'md';
}

const inputBase =
  'w-full bg-canvas text-ink placeholder:text-ink-faint rounded-md border border-edge ' +
  'transition-colors focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 ' +
  'disabled:opacity-60';

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, leftIcon, sizeVariant = 'sm', ...props }, ref) => {
    const height = sizeVariant === 'md' ? 'h-8 text-sm' : 'h-7 text-xs';
    if (leftIcon) {
      return (
        <div className="relative flex items-center">
          <span className="pointer-events-none absolute left-2 text-ink-faint">{leftIcon}</span>
          <input ref={ref} className={cn(inputBase, height, 'pl-7 pr-2.5', className)} {...props} />
        </div>
      );
    }
    return <input ref={ref} className={cn(inputBase, height, 'px-2.5', className)} {...props} />;
  }
);
Input.displayName = 'Input';
