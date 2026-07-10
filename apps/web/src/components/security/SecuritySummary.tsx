import { ShieldCheck, ShieldX, ShieldAlert, AlertTriangle, Shield, Info } from 'lucide-react';
import { Card, cn } from '@/components/ui';
import type { SecurityIssue, Severity } from './scanners';

interface SecuritySummaryProps {
  issues: SecurityIssue[];
}

interface SeverityCount {
  severity: Severity;
  count: number;
  icon: React.ReactNode;
  color: string;
}

export function SecuritySummary({ issues }: SecuritySummaryProps) {
  const counts: Record<Severity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };

  for (const issue of issues) {
    counts[issue.severity]++;
  }

  const severities: SeverityCount[] = [
    { severity: 'critical', count: counts.critical, icon: <ShieldX className="w-4 h-4" />, color: 'text-danger' },
    { severity: 'high', count: counts.high, icon: <ShieldAlert className="w-4 h-4" />, color: 'text-danger' },
    { severity: 'medium', count: counts.medium, icon: <AlertTriangle className="w-4 h-4" />, color: 'text-warn' },
    { severity: 'low', count: counts.low, icon: <Shield className="w-4 h-4" />, color: 'text-info' },
    { severity: 'info', count: counts.info, icon: <Info className="w-4 h-4" />, color: 'text-info' },
  ];

  const totalIssues = issues.length;
  const hasIssues = totalIssues > 0;
  const hasCritical = counts.critical > 0 || counts.high > 0;

  return (
    <Card className="p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {hasIssues ? (
            hasCritical ? (
              <ShieldAlert className="w-5 h-5 text-danger" />
            ) : (
              <Shield className="w-5 h-5 text-warn" />
            )
          ) : (
            <ShieldCheck className="w-5 h-5 text-success" />
          )}
          <span className="font-medium text-ink">
            {hasIssues
              ? `${totalIssues} Security ${totalIssues === 1 ? 'Issue' : 'Issues'} Found`
              : 'No Security Issues Found'}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {severities.map(({ severity, count, icon, color }) => (
          <div
            key={severity}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-md bg-surface',
              count > 0 ? color : 'text-ink-faint'
            )}
          >
            {icon}
            <span className="text-sm font-medium">{count}</span>
            <span className="text-xs capitalize">{severity}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
