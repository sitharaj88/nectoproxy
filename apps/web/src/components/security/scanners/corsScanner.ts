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

export function scanCors({ entry }: ScannerInput): SecurityIssue[] {
  const issues: SecurityIssue[] = [];
  const headers = entry.responseHeaders;

  if (!headers) return issues;

  const acaoHeader = getHeader(headers, 'access-control-allow-origin');
  const acacHeader = getHeader(headers, 'access-control-allow-credentials');
  const acahHeader = getHeader(headers, 'access-control-allow-headers');
  const acamHeader = getHeader(headers, 'access-control-allow-methods');

  // Wildcard origin with credentials
  if (acaoHeader === '*' && acacHeader?.toLowerCase() === 'true') {
    issues.push({
      id: 'cors-wildcard-credentials',
      category: 'cors',
      severity: 'critical',
      title: 'CORS wildcard with credentials',
      description:
        'Access-Control-Allow-Origin is set to * with Allow-Credentials: true. This is invalid and blocked by browsers, but indicates a misconfiguration.',
      recommendation:
        'Use a specific origin instead of * when credentials are required.',
      evidence: `Access-Control-Allow-Origin: ${acaoHeader}\nAccess-Control-Allow-Credentials: ${acacHeader}`,
    });
  }

  // Reflected origin with credentials (potential vulnerability)
  if (acaoHeader && acaoHeader !== '*' && acacHeader?.toLowerCase() === 'true') {
    const origin = getHeader(entry.requestHeaders, 'origin');
    if (origin && acaoHeader === origin) {
      // This might be okay, but worth noting if origin reflection is happening
      issues.push({
        id: 'cors-reflected-origin',
        category: 'cors',
        severity: 'info',
        title: 'CORS reflects request origin',
        description:
          'The server reflects the Origin header in Access-Control-Allow-Origin. Ensure this is intentional and properly validated.',
        recommendation:
          'Verify the server validates the Origin against an allowlist before reflecting it.',
        evidence: `Request Origin: ${origin}\nAccess-Control-Allow-Origin: ${acaoHeader}`,
      });
    }
  }

  // Null origin allowed with credentials
  if (acaoHeader === 'null' && acacHeader?.toLowerCase() === 'true') {
    issues.push({
      id: 'cors-null-origin',
      category: 'cors',
      severity: 'high',
      title: 'CORS allows null origin with credentials',
      description:
        'Access-Control-Allow-Origin: null with credentials is dangerous. Null origin can be spoofed using sandboxed iframes.',
      recommendation:
        'Never allow the null origin, especially with credentials.',
      evidence: `Access-Control-Allow-Origin: null\nAccess-Control-Allow-Credentials: ${acacHeader}`,
    });
  }

  // Overly permissive methods
  if (acamHeader) {
    const dangerousMethods = ['PUT', 'DELETE', 'PATCH'];
    const allowedMethods = acamHeader.split(',').map((m) => m.trim().toUpperCase());
    const foundDangerous = dangerousMethods.filter((m) => allowedMethods.includes(m));

    if (allowedMethods.includes('*')) {
      issues.push({
        id: 'cors-wildcard-methods',
        category: 'cors',
        severity: 'medium',
        title: 'CORS allows all HTTP methods',
        description:
          'Access-Control-Allow-Methods is set to *, allowing any HTTP method. This is overly permissive.',
        recommendation:
          'Specify only the HTTP methods actually needed by the application.',
        evidence: `Access-Control-Allow-Methods: ${acamHeader}`,
      });
    } else if (foundDangerous.length > 0 && acaoHeader === '*') {
      issues.push({
        id: 'cors-dangerous-methods-wildcard',
        category: 'cors',
        severity: 'medium',
        title: 'CORS allows dangerous methods with wildcard origin',
        description: `CORS allows ${foundDangerous.join(', ')} methods to any origin. This may enable unauthorized modifications.`,
        recommendation:
          'Restrict origins when allowing state-changing HTTP methods.',
        evidence: `Access-Control-Allow-Origin: *\nAccess-Control-Allow-Methods: ${acamHeader}`,
      });
    }
  }

  // Overly permissive headers
  if (acahHeader) {
    const allowedHeaders = acahHeader.split(',').map((h) => h.trim().toLowerCase());

    if (allowedHeaders.includes('*')) {
      issues.push({
        id: 'cors-wildcard-headers',
        category: 'cors',
        severity: 'low',
        title: 'CORS allows all request headers',
        description:
          'Access-Control-Allow-Headers is set to *, allowing any custom header. This may be overly permissive.',
        recommendation:
          'Specify only the headers actually needed by the application.',
        evidence: `Access-Control-Allow-Headers: ${acahHeader}`,
      });
    }

    // Authorization header with wildcard origin
    if (
      (allowedHeaders.includes('authorization') || allowedHeaders.includes('*')) &&
      acaoHeader === '*'
    ) {
      issues.push({
        id: 'cors-auth-header-wildcard',
        category: 'cors',
        severity: 'medium',
        title: 'CORS allows Authorization header with wildcard origin',
        description:
          'Authorization header is allowed from any origin. While credentials are blocked, this may indicate a misconfiguration.',
        recommendation:
          'Restrict origins when allowing sensitive headers like Authorization.',
        evidence: `Access-Control-Allow-Origin: *\nAccess-Control-Allow-Headers: ${acahHeader}`,
      });
    }
  }

  return issues;
}
