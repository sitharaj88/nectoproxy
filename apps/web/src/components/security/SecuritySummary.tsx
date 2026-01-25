import { ShieldCheck, ShieldX, ShieldAlert, AlertTriangle, Shield, Info } from 'lucide-react';
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
    { severity: 'critical', count: counts.critical, icon: <ShieldX className="w-4 h-4" />, color: 'text-red-500' },
    { severity: 'high', count: counts.high, icon: <ShieldAlert className="w-4 h-4" />, color: 'text-orange-500' },
    { severity: 'medium', count: counts.medium, icon: <AlertTriangle className="w-4 h-4" />, color: 'text-yellow-500' },
    { severity: 'low', count: counts.low, icon: <Shield className="w-4 h-4" />, color: 'text-blue-500' },
    { severity: 'info', count: counts.info, icon: <Info className="w-4 h-4" />, color: 'text-gray-400' },
  ];

  const totalIssues = issues.length;
  const hasIssues = totalIssues > 0;
  const hasCritical = counts.critical > 0 || counts.high > 0;

  return (
    <div className="bg-gray-800 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {hasIssues ? (
            hasCritical ? (
              <ShieldAlert className="w-5 h-5 text-orange-500" />
            ) : (
              <Shield className="w-5 h-5 text-yellow-500" />
            )
          ) : (
            <ShieldCheck className="w-5 h-5 text-green-500" />
          )}
          <span className="font-medium text-gray-200">
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
            className={`flex items-center gap-1.5 px-2 py-1 rounded bg-gray-700/50 ${
              count > 0 ? color : 'text-gray-500'
            }`}
          >
            {icon}
            <span className="text-sm font-medium">{count}</span>
            <span className="text-xs capitalize">{severity}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
