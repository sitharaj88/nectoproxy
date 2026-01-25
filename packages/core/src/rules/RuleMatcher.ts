import type { RuleMatcher } from '@proxyscope/shared';

export interface MatchContext {
  url: string;
  method: string;
  host: string;
  path: string;
  requestHeaders: Record<string, string | string[]>;
  requestBody?: Buffer | null;
}

export class RuleMatcherEngine {
  matchesContext(matcher: RuleMatcher, ctx: MatchContext): boolean {
    // URL matching (string pattern with wildcards or regex)
    if (matcher.url) {
      if (!this.matchPattern(matcher.url, ctx.url)) {
        return false;
      }
    }

    // Method matching
    if (matcher.method) {
      const methods = Array.isArray(matcher.method) ? matcher.method : [matcher.method];
      const normalizedMethods = methods.map((m) => m.toUpperCase());
      if (!normalizedMethods.includes(ctx.method.toUpperCase())) {
        return false;
      }
    }

    // Host matching
    if (matcher.host) {
      if (!this.matchPattern(matcher.host, ctx.host)) {
        return false;
      }
    }

    // Path matching (string pattern with wildcards or regex)
    if (matcher.path) {
      if (!this.matchPattern(matcher.path, ctx.path)) {
        return false;
      }
    }

    // Header matching
    if (matcher.headers) {
      for (const [key, pattern] of Object.entries(matcher.headers)) {
        const headerValue = this.getHeader(ctx.requestHeaders, key);
        if (!headerValue) {
          return false;
        }
        if (!this.matchPattern(pattern, headerValue)) {
          return false;
        }
      }
    }

    // Body contains (requires request body)
    if (matcher.bodyContains && ctx.requestBody) {
      const bodyStr = ctx.requestBody.toString('utf-8');
      if (!bodyStr.includes(matcher.bodyContains)) {
        return false;
      }
    }

    return true;
  }

  private matchPattern(pattern: string | RegExp, value: string): boolean {
    if (pattern instanceof RegExp) {
      return pattern.test(value);
    }

    // Check if pattern is a regex string (starts and ends with /)
    if (pattern.startsWith('/') && pattern.lastIndexOf('/') > 0) {
      const lastSlash = pattern.lastIndexOf('/');
      const regexBody = pattern.slice(1, lastSlash);
      const flags = pattern.slice(lastSlash + 1);
      try {
        const regex = new RegExp(regexBody, flags);
        return regex.test(value);
      } catch {
        // Invalid regex, fall through to glob matching
      }
    }

    // Support glob-like patterns with * wildcard
    // Escape special regex characters except * and ?
    const escaped = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');

    const regex = new RegExp(`^${escaped}$`, 'i');
    return regex.test(value);
  }

  private getHeader(
    headers: Record<string, string | string[]>,
    key: string
  ): string | null {
    const normalizedKey = key.toLowerCase();
    for (const [k, v] of Object.entries(headers)) {
      if (k.toLowerCase() === normalizedKey) {
        return Array.isArray(v) ? v.join(', ') : v;
      }
    }
    return null;
  }
}
