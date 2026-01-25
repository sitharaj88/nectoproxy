import type { ScannerInput, SecurityIssue } from './types';

interface ParsedCookie {
  name: string;
  value: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: string | null;
  domain: string | null;
  path: string | null;
  expires: string | null;
}

function parseCookie(setCookieHeader: string): ParsedCookie {
  const parts = setCookieHeader.split(';').map((p) => p.trim());
  const [nameValue, ...attributes] = parts;
  const [name, ...valueParts] = nameValue.split('=');
  const value = valueParts.join('=');

  const cookie: ParsedCookie = {
    name: name.trim(),
    value: value,
    httpOnly: false,
    secure: false,
    sameSite: null,
    domain: null,
    path: null,
    expires: null,
  };

  for (const attr of attributes) {
    const lower = attr.toLowerCase();
    if (lower === 'httponly') {
      cookie.httpOnly = true;
    } else if (lower === 'secure') {
      cookie.secure = true;
    } else if (lower.startsWith('samesite=')) {
      cookie.sameSite = attr.split('=')[1];
    } else if (lower.startsWith('domain=')) {
      cookie.domain = attr.split('=')[1];
    } else if (lower.startsWith('path=')) {
      cookie.path = attr.split('=')[1];
    } else if (lower.startsWith('expires=')) {
      cookie.expires = attr.substring(8);
    }
  }

  return cookie;
}

function getCookies(headers: Record<string, string | string[]> | null): string[] {
  if (!headers) return [];

  const setCookie =
    headers['set-cookie'] || headers['Set-Cookie'] || headers['SET-COOKIE'];
  if (!setCookie) return [];

  return Array.isArray(setCookie) ? setCookie : [setCookie];
}

export function scanCookies({ entry }: ScannerInput): SecurityIssue[] {
  const issues: SecurityIssue[] = [];
  const cookies = getCookies(entry.responseHeaders);

  for (const cookieStr of cookies) {
    const cookie = parseCookie(cookieStr);

    // Missing HttpOnly
    if (!cookie.httpOnly) {
      // Only flag as issue for sensitive-looking cookies
      const sensitiveNames = [
        'session',
        'auth',
        'token',
        'jwt',
        'access',
        'refresh',
        'csrf',
        'xsrf',
      ];
      const isSensitive = sensitiveNames.some(
        (n) =>
          cookie.name.toLowerCase().includes(n) ||
          cookie.name.toLowerCase().startsWith('__host-') ||
          cookie.name.toLowerCase().startsWith('__secure-')
      );

      if (isSensitive) {
        issues.push({
          id: `cookie-no-httponly-${cookie.name}`,
          category: 'cookies',
          severity: 'high',
          title: `Cookie "${cookie.name}" missing HttpOnly`,
          description:
            'This cookie appears to be sensitive but is accessible via JavaScript, making it vulnerable to XSS attacks.',
          recommendation: 'Add the HttpOnly flag to prevent JavaScript access.',
          evidence: cookieStr,
        });
      } else {
        issues.push({
          id: `cookie-no-httponly-${cookie.name}`,
          category: 'cookies',
          severity: 'low',
          title: `Cookie "${cookie.name}" missing HttpOnly`,
          description:
            'This cookie is accessible via JavaScript. Consider adding HttpOnly unless client-side access is required.',
          recommendation: 'Add HttpOnly flag if the cookie is not needed by JavaScript.',
          evidence: cookieStr,
        });
      }
    }

    // Missing Secure on HTTPS
    if (!cookie.secure && entry.protocol === 'https') {
      issues.push({
        id: `cookie-no-secure-${cookie.name}`,
        category: 'cookies',
        severity: 'medium',
        title: `Cookie "${cookie.name}" missing Secure flag`,
        description:
          'This cookie may be sent over unencrypted HTTP connections, exposing it to interception.',
        recommendation:
          'Add the Secure flag to ensure the cookie is only sent over HTTPS.',
        evidence: cookieStr,
      });
    }

    // Missing or weak SameSite
    if (!cookie.sameSite) {
      issues.push({
        id: `cookie-no-samesite-${cookie.name}`,
        category: 'cookies',
        severity: 'medium',
        title: `Cookie "${cookie.name}" missing SameSite`,
        description:
          'This cookie has no SameSite attribute, making it vulnerable to CSRF attacks in older browsers.',
        recommendation:
          "Add SameSite=Lax (or Strict for sensitive cookies) to prevent cross-site request forgery.",
        evidence: cookieStr,
      });
    } else if (cookie.sameSite.toLowerCase() === 'none' && !cookie.secure) {
      issues.push({
        id: `cookie-samesite-none-insecure-${cookie.name}`,
        category: 'cookies',
        severity: 'high',
        title: `Cookie "${cookie.name}" has SameSite=None without Secure`,
        description:
          'SameSite=None cookies require the Secure flag in modern browsers and will be rejected.',
        recommendation: 'Add the Secure flag when using SameSite=None.',
        evidence: cookieStr,
      });
    }

    // Overly permissive domain
    if (cookie.domain) {
      const domain = cookie.domain.toLowerCase();
      // Check for leading dot (subdomain wildcard)
      if (domain.startsWith('.')) {
        const baseDomain = domain.substring(1);
        // Count the dots to detect if it's a high-level domain
        const dotCount = baseDomain.split('.').length - 1;
        if (dotCount <= 1) {
          issues.push({
            id: `cookie-wide-domain-${cookie.name}`,
            category: 'cookies',
            severity: 'low',
            title: `Cookie "${cookie.name}" has wide domain scope`,
            description: `Cookie domain "${cookie.domain}" allows subdomains to access this cookie.`,
            recommendation:
              'Consider restricting the domain to only the required subdomain.',
            evidence: cookieStr,
          });
        }
      }
    }

    // Permissive path
    if (cookie.path === '/') {
      const sensitiveNames = ['session', 'auth', 'token', 'jwt'];
      const isSensitive = sensitiveNames.some((n) =>
        cookie.name.toLowerCase().includes(n)
      );

      if (isSensitive) {
        issues.push({
          id: `cookie-root-path-${cookie.name}`,
          category: 'cookies',
          severity: 'info',
          title: `Sensitive cookie "${cookie.name}" has root path`,
          description:
            'This sensitive cookie is available to all paths on the domain.',
          recommendation:
            'Consider restricting the path to only the required application area.',
          evidence: cookieStr,
        });
      }
    }
  }

  return issues;
}
