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

export function scanHeaders({ entry }: ScannerInput): SecurityIssue[] {
  const issues: SecurityIssue[] = [];
  const headers = entry.responseHeaders;

  if (!headers) return issues;

  // Content-Security-Policy
  const csp = getHeader(headers, 'content-security-policy');
  if (!csp) {
    issues.push({
      id: 'missing-csp',
      category: 'headers',
      severity: 'medium',
      title: 'Missing Content-Security-Policy',
      description:
        'The Content-Security-Policy header is not set. CSP helps prevent XSS attacks by specifying which sources of content are allowed.',
      recommendation:
        "Add a Content-Security-Policy header. Start with: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'",
    });
  } else if (csp.includes("'unsafe-inline'") && csp.includes("'unsafe-eval'")) {
    issues.push({
      id: 'weak-csp',
      category: 'headers',
      severity: 'low',
      title: 'Weak Content-Security-Policy',
      description:
        "CSP allows 'unsafe-inline' and 'unsafe-eval', which significantly weakens XSS protection.",
      recommendation: "Remove 'unsafe-inline' and 'unsafe-eval' from your CSP where possible.",
      evidence: csp,
    });
  }

  // Strict-Transport-Security
  const hsts = getHeader(headers, 'strict-transport-security');
  if (entry.protocol === 'https' && !hsts) {
    issues.push({
      id: 'missing-hsts',
      category: 'headers',
      severity: 'medium',
      title: 'Missing Strict-Transport-Security',
      description:
        'HTTPS is used but HSTS is not enabled. This allows downgrade attacks and SSL stripping.',
      recommendation:
        'Add Strict-Transport-Security header with: max-age=31536000; includeSubDomains; preload',
    });
  } else if (hsts) {
    const maxAgeMatch = hsts.match(/max-age=(\d+)/);
    if (maxAgeMatch) {
      const maxAge = parseInt(maxAgeMatch[1], 10);
      if (maxAge < 15768000) {
        // Less than 6 months
        issues.push({
          id: 'short-hsts',
          category: 'headers',
          severity: 'low',
          title: 'Short HSTS max-age',
          description: `HSTS max-age is ${maxAge} seconds (${Math.round(maxAge / 86400)} days). Recommended minimum is 6 months.`,
          recommendation: 'Increase max-age to at least 15768000 (6 months) or 31536000 (1 year).',
          evidence: hsts,
        });
      }
    }
  }

  // X-Frame-Options
  const xfo = getHeader(headers, 'x-frame-options');
  if (!xfo) {
    issues.push({
      id: 'missing-xfo',
      category: 'headers',
      severity: 'medium',
      title: 'Missing X-Frame-Options',
      description:
        'X-Frame-Options is not set. This allows the page to be embedded in frames, enabling clickjacking attacks.',
      recommendation: 'Add X-Frame-Options: DENY or X-Frame-Options: SAMEORIGIN',
    });
  } else if (xfo.toUpperCase() === 'ALLOWALL') {
    issues.push({
      id: 'permissive-xfo',
      category: 'headers',
      severity: 'medium',
      title: 'Permissive X-Frame-Options',
      description: 'X-Frame-Options is set to ALLOWALL, which provides no protection.',
      recommendation: 'Change to DENY or SAMEORIGIN.',
      evidence: xfo,
    });
  }

  // X-Content-Type-Options
  const xcto = getHeader(headers, 'x-content-type-options');
  if (!xcto) {
    issues.push({
      id: 'missing-xcto',
      category: 'headers',
      severity: 'low',
      title: 'Missing X-Content-Type-Options',
      description:
        'X-Content-Type-Options is not set. Browsers may sniff content types, leading to XSS via malicious uploads.',
      recommendation: 'Add X-Content-Type-Options: nosniff',
    });
  }

  // Referrer-Policy
  const referrerPolicy = getHeader(headers, 'referrer-policy');
  if (!referrerPolicy) {
    issues.push({
      id: 'missing-referrer-policy',
      category: 'headers',
      severity: 'low',
      title: 'Missing Referrer-Policy',
      description:
        'Referrer-Policy is not set. The full URL may be sent to third parties in the Referer header.',
      recommendation:
        'Add Referrer-Policy: strict-origin-when-cross-origin or no-referrer-when-downgrade',
    });
  } else if (referrerPolicy.toLowerCase() === 'unsafe-url') {
    issues.push({
      id: 'unsafe-referrer-policy',
      category: 'headers',
      severity: 'medium',
      title: 'Unsafe Referrer-Policy',
      description:
        'Referrer-Policy is set to unsafe-url, sending full URL (including path and query) to all destinations.',
      recommendation:
        'Change to strict-origin-when-cross-origin, same-origin, or no-referrer.',
      evidence: referrerPolicy,
    });
  }

  // Permissions-Policy
  const permissionsPolicy =
    getHeader(headers, 'permissions-policy') || getHeader(headers, 'feature-policy');
  if (!permissionsPolicy) {
    issues.push({
      id: 'missing-permissions-policy',
      category: 'headers',
      severity: 'info',
      title: 'Missing Permissions-Policy',
      description:
        'Permissions-Policy is not set. Browser features like camera, microphone, and geolocation are not restricted.',
      recommendation:
        'Add Permissions-Policy to restrict unnecessary browser features: geolocation=(), camera=(), microphone=()',
    });
  }

  return issues;
}
