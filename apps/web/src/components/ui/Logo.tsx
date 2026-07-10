import { cn } from './cn';

/**
 * NectoProxy brand mark — a hexagonal "node" with a routing path threaded
 * through it, evoking traffic passing through a proxy node. Uses the accent
 * token so it adapts to theme.
 */
export function LogoMark({ className, size = 20 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M12 2.2l8.5 4.9v9.8L12 21.8l-8.5-4.9V7.1L12 2.2z"
        className="fill-accent/15 stroke-accent"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M4.5 15.2l4.6-.02 2.9-6.2 2.4 8.6 1.9-4.3 3.2-.02"
        className="stroke-accent"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2 select-none', className)}>
      <LogoMark />
      <span className="text-sm font-semibold tracking-tight text-ink">
        Necto<span className="text-accent">Proxy</span>
      </span>
    </span>
  );
}
