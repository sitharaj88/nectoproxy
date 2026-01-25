export type {
  Severity,
  IssueCategory,
  SecurityIssue,
  ScannerInput,
  SecurityScanner,
} from './types';

export { severityColors, severityOrder } from './types';

export { scanHeaders } from './headerScanner';
export { scanCookies } from './cookieScanner';
export { scanCors } from './corsScanner';
export { scanInfoDisclosure } from './infoDisclosureScanner';

import { scanHeaders } from './headerScanner';
import { scanCookies } from './cookieScanner';
import { scanCors } from './corsScanner';
import { scanInfoDisclosure } from './infoDisclosureScanner';
import type { ScannerInput, SecurityIssue } from './types';
import { severityOrder } from './types';

export function runAllScanners(input: ScannerInput): SecurityIssue[] {
  const issues: SecurityIssue[] = [
    ...scanHeaders(input),
    ...scanCookies(input),
    ...scanCors(input),
    ...scanInfoDisclosure(input),
  ];

  // Sort by severity
  return issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}
