import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  /** Smaller, denser variant for panel sidebars. */
  compact?: boolean;
}

export function EmptyState({ icon: Icon, title, description, action, compact = false }: EmptyStateProps) {
  return (
    <div
      className={`flex-1 flex items-center justify-center p-6 text-center ${
        compact ? '' : 'min-h-[200px]'
      }`}
      role="status"
    >
      <div className="max-w-sm flex flex-col items-center gap-3">
        {Icon && (
          <div
            className={`rounded-full bg-gray-800/80 text-gray-500 flex items-center justify-center ${
              compact ? 'w-10 h-10' : 'w-14 h-14'
            }`}
            aria-hidden="true"
          >
            <Icon className={compact ? 'w-5 h-5' : 'w-7 h-7'} />
          </div>
        )}
        <div className="space-y-1">
          <p className={`font-medium text-gray-300 ${compact ? 'text-sm' : 'text-base'}`}>{title}</p>
          {description && (
            <div className={`text-gray-500 ${compact ? 'text-xs' : 'text-sm'}`}>{description}</div>
          )}
        </div>
        {action && <div className="pt-1">{action}</div>}
      </div>
    </div>
  );
}
