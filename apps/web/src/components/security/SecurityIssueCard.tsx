import { useState } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle, Info, Shield, ShieldAlert, ShieldX } from 'lucide-react';
import { Card, Badge, cn, type BadgeProps } from '@/components/ui';
import type { SecurityIssue, Severity } from './scanners';

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

const severityStyles: Record<Severity, { tone: BadgeProps['tone']; icon: string; border: string }> = {
  critical: { tone: 'danger', icon: 'text-danger', border: 'border-danger/30' },
  high: { tone: 'danger', icon: 'text-danger', border: 'border-danger/30' },
  medium: { tone: 'warn', icon: 'text-warn', border: 'border-warn/30' },
  low: { tone: 'info', icon: 'text-info', border: 'border-info/30' },
  info: { tone: 'info', icon: 'text-info', border: 'border-info/30' },
};

export function SecurityIssueCard({ issue }: SecurityIssueCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const style = severityStyles[issue.severity];

  return (
    <Card className={cn('overflow-hidden', style.border)}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-surface-overlay transition-colors"
      >
        <span className={cn('flex-shrink-0', style.icon)}>{severityIcons[issue.severity]}</span>
        <span className="flex-1 font-medium text-sm text-ink">{issue.title}</span>
        <Badge tone={style.tone} className="uppercase">
          {issue.severity}
        </Badge>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-ink-muted" />
        ) : (
          <ChevronRight className="w-4 h-4 text-ink-muted" />
        )}
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-edge-subtle">
          <div className="pt-3">
            <p className="text-sm text-ink-secondary">{issue.description}</p>
          </div>

          <div>
            <h4 className="text-xs font-medium text-ink-muted uppercase mb-1">
              Recommendation
            </h4>
            <p className="text-sm text-ink-secondary">{issue.recommendation}</p>
          </div>

          {issue.evidence && (
            <div>
              <h4 className="text-xs font-medium text-ink-muted uppercase mb-1">
                Evidence
              </h4>
              <pre className="text-xs font-mono bg-canvas border border-edge-subtle p-2 rounded-md overflow-x-auto text-ink-muted">
                {issue.evidence}
              </pre>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
