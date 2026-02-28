import { describe, it, expect } from 'vitest';
import { RuleMatcherEngine } from '../RuleMatcher.js';
import type { MatchContext } from '../RuleMatcher.js';

function makeCtx(overrides: Partial<MatchContext> = {}): MatchContext {
  return {
    url: 'https://example.com/api/users?page=1',
    method: 'GET',
    host: 'example.com',
    path: '/api/users?page=1',
    requestHeaders: { 'content-type': 'application/json' },
    requestBody: null,
    ...overrides,
  };
}

describe('RuleMatcherEngine', () => {
  const matcher = new RuleMatcherEngine();

  describe('URL matching', () => {
    it('matches exact URL', () => {
      expect(matcher.matchesContext({ url: 'https://example.com/api/users?page=1' }, makeCtx())).toBe(true);
    });

    it('rejects non-matching URL', () => {
      expect(matcher.matchesContext({ url: 'https://other.com/api' }, makeCtx())).toBe(false);
    });

    it('matches URL with wildcard *', () => {
      expect(matcher.matchesContext({ url: 'https://example.com/api/*' }, makeCtx())).toBe(true);
    });

    it('matches URL with wildcard in host', () => {
      expect(matcher.matchesContext({ url: 'https://*.com/api/*' }, makeCtx())).toBe(true);
    });

    it('matches URL with regex pattern', () => {
      expect(matcher.matchesContext({ url: '/https:\\/\\/example\\.com\\/api\\/.*/' }, makeCtx())).toBe(true);
    });

    it('rejects non-matching regex URL', () => {
      expect(matcher.matchesContext({ url: '/https:\\/\\/other\\.com/' }, makeCtx())).toBe(false);
    });

    it('matches case-insensitively', () => {
      expect(matcher.matchesContext({ url: 'HTTPS://EXAMPLE.COM/API/USERS?PAGE=1' }, makeCtx())).toBe(true);
    });
  });

  describe('method matching', () => {
    it('matches single method', () => {
      expect(matcher.matchesContext({ method: 'GET' }, makeCtx())).toBe(true);
    });

    it('rejects non-matching method', () => {
      expect(matcher.matchesContext({ method: 'POST' }, makeCtx())).toBe(false);
    });

    it('matches method case-insensitively', () => {
      expect(matcher.matchesContext({ method: 'get' }, makeCtx())).toBe(true);
    });

    it('matches method from array', () => {
      expect(matcher.matchesContext({ method: ['GET', 'POST'] }, makeCtx())).toBe(true);
    });

    it('rejects when method not in array', () => {
      expect(matcher.matchesContext({ method: ['POST', 'PUT'] }, makeCtx())).toBe(false);
    });
  });

  describe('host matching', () => {
    it('matches exact host', () => {
      expect(matcher.matchesContext({ host: 'example.com' }, makeCtx())).toBe(true);
    });

    it('matches host with wildcard', () => {
      expect(matcher.matchesContext({ host: '*.com' }, makeCtx())).toBe(true);
    });

    it('rejects non-matching host', () => {
      expect(matcher.matchesContext({ host: 'other.com' }, makeCtx())).toBe(false);
    });
  });

  describe('path matching', () => {
    it('matches exact path', () => {
      expect(matcher.matchesContext({ path: '/api/users?page=1' }, makeCtx())).toBe(true);
    });

    it('matches path with wildcard', () => {
      expect(matcher.matchesContext({ path: '/api/*' }, makeCtx())).toBe(true);
    });

    it('rejects non-matching path', () => {
      expect(matcher.matchesContext({ path: '/other/*' }, makeCtx())).toBe(false);
    });
  });

  describe('header matching', () => {
    it('matches header value', () => {
      expect(matcher.matchesContext({ headers: { 'content-type': 'application/json' } }, makeCtx())).toBe(true);
    });

    it('matches header with wildcard', () => {
      expect(matcher.matchesContext({ headers: { 'content-type': 'application/*' } }, makeCtx())).toBe(true);
    });

    it('rejects non-matching header', () => {
      expect(matcher.matchesContext({ headers: { 'content-type': 'text/html' } }, makeCtx())).toBe(false);
    });

    it('rejects missing header', () => {
      expect(matcher.matchesContext({ headers: { 'x-custom': 'value' } }, makeCtx())).toBe(false);
    });

    it('matches header case-insensitively for key', () => {
      expect(matcher.matchesContext({ headers: { 'Content-Type': 'application/json' } }, makeCtx())).toBe(true);
    });
  });

  describe('body matching', () => {
    it('matches body containing text', () => {
      const ctx = makeCtx({ requestBody: Buffer.from('{"username":"admin"}') });
      expect(matcher.matchesContext({ bodyContains: 'admin' }, ctx)).toBe(true);
    });

    it('rejects body not containing text', () => {
      const ctx = makeCtx({ requestBody: Buffer.from('{"username":"user"}') });
      expect(matcher.matchesContext({ bodyContains: 'admin' }, ctx)).toBe(false);
    });
  });

  describe('combined matchers', () => {
    it('matches when all conditions are met', () => {
      expect(matcher.matchesContext(
        { url: 'https://example.com/api/*', method: 'GET', host: 'example.com' },
        makeCtx()
      )).toBe(true);
    });

    it('rejects when one condition fails', () => {
      expect(matcher.matchesContext(
        { url: 'https://example.com/api/*', method: 'POST', host: 'example.com' },
        makeCtx()
      )).toBe(false);
    });

    it('matches empty matcher (matches everything)', () => {
      expect(matcher.matchesContext({}, makeCtx())).toBe(true);
    });
  });
});
