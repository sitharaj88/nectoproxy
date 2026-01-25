import { useState } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle, Info, Shield, ShieldAlert, ShieldX } from 'lucide-react';
import type { SecurityIssue, Severity } from './scanners';
import { severityColors } from './scanners';

interface SecurityIssueCardProps {
  issue: SecurityIssue;
}

const severityIcons: Record<Severity, React.ReactNode> = {
  critical: <ShieldX className="w-4 h-4" />,
  high: <ShieldAlert className="w-4 h-4" />,
  medium: <AlertTriangle className="w-4 h-4" />,
  low: <Shield className="w-4 h-4" />,
  info: <Info className="w-4 h-4" />,
};

export function SecurityIssueCard({ issue }: SecurityIssueCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const colorClasses = severityColors[issue.severity];

  return (
    <div className={`rounded-lg border ${colorClasses} overflow-hidden`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-800/50 transition-colors"
      >
        <span className="flex-shrink-0">{severityIcons[issue.severity]}</span>
        <span className="flex-1 font-medium text-sm">{issue.title}</span>
        <span className="text-xs uppercase px-2 py-0.5 rounded bg-gray-800/50">
          {issue.severity}
        </span>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-gray-700/50">
          <div className="pt-3">
            <p className="text-sm text-gray-300">{issue.description}</p>
          </div>

          <div>
            <h4 className="text-xs font-medium text-gray-400 uppercase mb-1">
              Recommendation
            </h4>
            <p className="text-sm text-gray-300">{issue.recommendation}</p>
          </div>

          {issue.evidence && (
            <div>
              <h4 className="text-xs font-medium text-gray-400 uppercase mb-1">
                Evidence
              </h4>
              <pre className="text-xs font-mono bg-gray-900/50 p-2 rounded overflow-x-auto text-gray-400">
                {issue.evidence}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
