import { useMemo } from 'react';
import type { TrafficEntry } from '@proxyscope/shared';
import { runAllScanners, type SecurityIssue, type IssueCategory } from './scanners';
import { SecuritySummary } from './SecuritySummary';
import { SecurityIssueCard } from './SecurityIssueCard';

interface SecurityTabProps {
  entry: TrafficEntry;
  responseBody?: string | null;
}

const categoryLabels: Record<IssueCategory, string> = {
  headers: 'Security Headers',
  cookies: 'Cookie Security',
  cors: 'CORS Configuration',
  disclosure: 'Information Disclosure',
};

export function SecurityTab({ entry, responseBody }: SecurityTabProps) {
  const issues = useMemo(() => {
    return runAllScanners({ entry, responseBody });
  }, [entry, responseBody]);

  // Group issues by category
  const groupedIssues = useMemo(() => {
    const groups: Record<IssueCategory, SecurityIssue[]> = {
      headers: [],
      cookies: [],
      cors: [],
      disclosure: [],
    };

    for (const issue of issues) {
      groups[issue.category].push(issue);
    }

    return groups;
  }, [issues]);

  const categories = (['headers', 'cookies', 'cors', 'disclosure'] as IssueCategory[]).filter(
    (cat) => groupedIssues[cat].length > 0
  );

  return (
    <div className="space-y-4">
      <SecuritySummary issues={issues} />

      {issues.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400">
            No security issues detected in this request/response.
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Note: This scanner checks for common security misconfigurations but is not exhaustive.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {categories.map((category) => (
            <div key={category}>
              <h3 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                {categoryLabels[category]}
                <span className="text-xs text-gray-500 bg-gray-700 px-1.5 py-0.5 rounded">
                  {groupedIssues[category].length}
                </span>
              </h3>
              <div className="space-y-2">
                {groupedIssues[category].map((issue) => (
                  <SecurityIssueCard key={issue.id} issue={issue} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
