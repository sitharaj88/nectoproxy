import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui';

interface DiffSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  badge?: string;
}

export function DiffSection({ title, children, defaultExpanded = true, badge }: DiffSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border border-edge rounded-md overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2 bg-surface-raised hover:bg-surface-overlay transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-ink-muted" />
          ) : (
            <ChevronRight className="w-4 h-4 text-ink-muted" />
          )}
          <span className="font-medium text-ink">{title}</span>
        </div>
        {badge && <Badge tone="neutral">{badge}</Badge>}
      </button>
      {isExpanded && <div className="p-4 bg-surface">{children}</div>}
    </div>
  );
}
