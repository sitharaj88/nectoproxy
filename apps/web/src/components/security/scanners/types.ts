import type { TrafficEntry } from '@proxyscope/shared';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type IssueCategory = 'headers' | 'cookies' | 'cors' | 'disclosure';

export interface SecurityIssue {
  id: string;
  category: IssueCategory;
  severity: Severity;
  title: string;
  description: string;
  recommendation: string;
  evidence?: string;
}

export interface ScannerInput {
  entry: TrafficEntry;
  responseBody?: string | null;
}

export type SecurityScanner = (input: ScannerInput) => SecurityIssue[];

export const severityColors: Record<Severity, string> = {
  critical: 'text-red-500 bg-red-500/10 border-red-500/30',
  high: 'text-orange-500 bg-orange-500/10 border-orange-500/30',
  medium: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30',
  low: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
  info: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
};

export const severityOrder: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};
