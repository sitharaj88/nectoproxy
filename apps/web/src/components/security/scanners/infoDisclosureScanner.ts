import type { ScannerInput, SecurityIssue } from './types';

function getHeader(
  headers: Record<string, string | string[]> | null,
  name: string
): string | null {
  if (!headers) return null;
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
  if (!key) return null;
  const value = headers[key];
  return Array.isArray(value) ? value[0] : value;
}

export function scanInfoDisclosure({ entry, responseBody }: ScannerInput): SecurityIssue[] {
  const issues: SecurityIssue[] = [];
  const headers = entry.responseHeaders;

  // Server header with version info
  const serverHeader = getHeader(headers, 'server');
  if (serverHeader) {
    // Check for version numbers
    const versionMatch = serverHeader.match(/[\d.]+/);
    if (versionMatch) {
      issues.push({
        id: 'server-version-disclosure',
        category: 'disclosure',
        severity: 'low',
        title: 'Server version disclosed',
        description:
          'The Server header reveals version information that could help attackers identify vulnerabilities.',
        recommendation:
          'Remove or obfuscate version information from the Server header.',
        evidence: `Server: ${serverHeader}`,
      });
    }
  }

  // X-Powered-By header
  const poweredBy = getHeader(headers, 'x-powered-by');
  if (poweredBy) {
    issues.push({
      id: 'powered-by-disclosure',
      category: 'disclosure',
      severity: 'low',
      title: 'Technology stack disclosed via X-Powered-By',
      description:
        'The X-Powered-By header reveals technology information that could help attackers target specific vulnerabilities.',
      recommendation: 'Remove the X-Powered-By header.',
      evidence: `X-Powered-By: ${poweredBy}`,
    });
  }

  // X-AspNet-Version
  const aspnetVersion = getHeader(headers, 'x-aspnet-version');
  if (aspnetVersion) {
    issues.push({
      id: 'aspnet-version-disclosure',
      category: 'disclosure',
      severity: 'low',
      title: 'ASP.NET version disclosed',
      description:
        'X-AspNet-Version header reveals framework version information.',
      recommendation:
        'Disable this header in web.config: <httpRuntime enableVersionHeader="false" />',
      evidence: `X-AspNet-Version: ${aspnetVersion}`,
    });
  }

  // X-AspNetMvc-Version
  const mvcVersion = getHeader(headers, 'x-aspnetmvc-version');
  if (mvcVersion) {
    issues.push({
      id: 'mvc-version-disclosure',
      category: 'disclosure',
      severity: 'low',
      title: 'ASP.NET MVC version disclosed',
      description: 'X-AspNetMvc-Version header reveals MVC framework version.',
      recommendation:
        'Remove this header: MvcHandler.DisableMvcResponseHeader = true;',
      evidence: `X-AspNetMvc-Version: ${mvcVersion}`,
    });
  }

  // Check URL for sensitive data
  const url = entry.url;
  const sensitivePatterns = [
    { pattern: /[?&]token=([^&]+)/i, name: 'token' },
    { pattern: /[?&]api[_-]?key=([^&]+)/i, name: 'API key' },
    { pattern: /[?&]password=([^&]+)/i, name: 'password' },
    { pattern: /[?&]secret=([^&]+)/i, name: 'secret' },
    { pattern: /[?&]auth=([^&]+)/i, name: 'auth token' },
    { pattern: /[?&]access[_-]?token=([^&]+)/i, name: 'access token' },
    { pattern: /[?&]private[_-]?key=([^&]+)/i, name: 'private key' },
  ];

  for (const { pattern, name } of sensitivePatterns) {
    if (pattern.test(url)) {
      issues.push({
        id: `sensitive-url-${name.replace(/\s+/g, '-')}`,
        category: 'disclosure',
        severity: 'high',
        title: `Sensitive data (${name}) in URL`,
        description:
          `The URL contains a ${name} parameter. This may be logged in browser history, server logs, and referrer headers.`,
        recommendation:
          'Send sensitive data in request headers or body instead of URL parameters.',
        evidence: url.replace(pattern, `?${name}=[REDACTED]`),
      });
    }
  }

  // Check response body for sensitive patterns
  if (responseBody && typeof responseBody === 'string') {
    // Stack traces
    const stackTracePatterns = [
      /at\s+[\w.]+\s*\([^)]+:\d+:\d+\)/,
      /File\s+"[^"]+",\s+line\s+\d+/,
      /Traceback\s+\(most recent call last\)/i,
      /^\s*at\s+\w+.*\(.*\.java:\d+\)/m,
      /Exception\s+in\s+thread\s+"[^"]+"/,
      /System\..*Exception:/,
    ];

    for (const pattern of stackTracePatterns) {
      if (pattern.test(responseBody)) {
        const match = responseBody.match(pattern);
        issues.push({
          id: 'stack-trace-disclosure',
          category: 'disclosure',
          severity: 'medium',
          title: 'Stack trace in response',
          description:
            'The response contains what appears to be a stack trace. This may reveal internal implementation details.',
          recommendation:
            'Configure error handling to hide stack traces in production environments.',
          evidence: match ? match[0].substring(0, 200) : undefined,
        });
        break;
      }
    }

    // SQL errors
    const sqlErrorPatterns = [
      /SQL\s+syntax.*MySQL/i,
      /ORA-\d{5}/,
      /PostgreSQL.*ERROR/i,
      /Microsoft\s+SQL\s+Server/i,
      /SQLITE_ERROR/i,
      /Unclosed\s+quotation\s+mark/i,
      /quoted\s+string\s+not\s+properly\s+terminated/i,
    ];

    for (const pattern of sqlErrorPatterns) {
      if (pattern.test(responseBody)) {
        const match = responseBody.match(pattern);
        issues.push({
          id: 'sql-error-disclosure',
          category: 'disclosure',
          severity: 'high',
          title: 'SQL error message in response',
          description:
            'The response contains a SQL error message. This may indicate SQL injection vulnerability and reveals database information.',
          recommendation:
            'Implement proper error handling and never expose database errors to users.',
          evidence: match ? match[0].substring(0, 200) : undefined,
        });
        break;
      }
    }

    // Internal paths
    const pathPatterns = [
      /[A-Z]:\\[\w\\]+/g, // Windows paths
      /\/(?:home|var|usr|etc|opt)\/[\w/]+/g, // Unix paths
    ];

    for (const pattern of pathPatterns) {
      const matches = responseBody.match(pattern);
      if (matches && matches.length > 0) {
        issues.push({
          id: 'internal-path-disclosure',
          category: 'disclosure',
          severity: 'low',
          title: 'Internal file paths in response',
          description:
            'The response contains internal file system paths that may reveal server structure.',
          recommendation:
            'Remove file paths from error messages and responses in production.',
          evidence: matches.slice(0, 3).join(', '),
        });
        break;
      }
    }

    // Email addresses (potential PII disclosure)
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = responseBody.match(emailPattern);
    if (emails && emails.length > 5) {
      issues.push({
        id: 'email-disclosure',
        category: 'disclosure',
        severity: 'info',
        title: 'Multiple email addresses in response',
        description:
          `Response contains ${emails.length} email addresses. Ensure this is intentional and not exposing user PII.`,
        recommendation:
          'Review if email disclosure is necessary and appropriate.',
        evidence: `Found ${emails.length} emails`,
      });
    }
  }

  return issues;
}
