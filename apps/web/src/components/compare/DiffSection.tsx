import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface DiffSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  badge?: string;
}

export function DiffSection({ title, children, defaultExpanded = true, badge }: DiffSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2 bg-gray-800 hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
          <span className="font-medium text-gray-200">{title}</span>
        </div>
        {badge && (
          <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-400">
            {badge}
          </span>
        )}
      </button>
      {isExpanded && <div className="p-4 bg-gray-900/50">{children}</div>}
    </div>
  );
}
