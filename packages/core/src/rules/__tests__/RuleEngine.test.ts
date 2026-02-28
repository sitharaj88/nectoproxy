import { describe, it, expect } from 'vitest';
import { RuleEngine } from '../RuleEngine.js';
import type { Rule } from '@nectoproxy/shared';
import type { MatchContext } from '../RuleMatcher.js';

function makeRule(overrides: Partial<Rule> = {}): Rule {
  return {
    id: 'rule-1',
    name: 'Test Rule',
    enabled: true,
    priority: 0,
    match: { url: '*' },
    action: 'mock',
    config: {
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      body: '{"mocked":true}',
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

function makeCtx(overrides: Partial<MatchContext> = {}): MatchContext {
  return {
    url: 'https://example.com/api/users',
    method: 'GET',
    host: 'example.com',
    path: '/api/users',
    requestHeaders: { 'content-type': 'application/json' },
    requestBody: null,
    ...overrides,
  };
}

describe('RuleEngine', () => {
  describe('setRules', () => {
    it('sorts rules by priority (lower = higher priority)', () => {
      const engine = new RuleEngine();
      engine.setRules([
        makeRule({ id: 'low', priority: 10 }),
        makeRule({ id: 'high', priority: 1 }),
        makeRule({ id: 'mid', priority: 5 }),
      ]);
      const rules = engine.getRules();
      expect(rules[0].id).toBe('high');
      expect(rules[1].id).toBe('mid');
      expect(rules[2].id).toBe('low');
    });
  });

  describe('addRule / removeRule / updateRule', () => {
    it('adds and retrieves a rule', () => {
      const engine = new RuleEngine();
      engine.addRule(makeRule({ id: 'added' }));
      expect(engine.getRules()).toHaveLength(1);
      expect(engine.getRules()[0].id).toBe('added');
    });

    it('removes a rule by id', () => {
      const engine = new RuleEngine();
      engine.setRules([makeRule({ id: 'keep' }), makeRule({ id: 'remove' })]);
      engine.removeRule('remove');
      expect(engine.getRules()).toHaveLength(1);
      expect(engine.getRules()[0].id).toBe('keep');
    });

    it('updates a rule and re-sorts by priority', () => {
      const engine = new RuleEngine();
      engine.setRules([
        makeRule({ id: 'a', priority: 1 }),
        makeRule({ id: 'b', priority: 2 }),
      ]);
      engine.updateRule('b', { priority: 0 });
      expect(engine.getRules()[0].id).toBe('b');
    });
  });

  describe('evaluateRequest', () => {
    it('returns handled:true for mock rule', async () => {
      const engine = new RuleEngine();
      engine.setRules([makeRule({ action: 'mock' })]);
      const result = await engine.evaluateRequest(makeCtx());
      expect(result.handled).toBe(true);
      expect(result.response).toBeDefined();
      expect(result.response!.status).toBe(200);
    });

    it('returns handled:true for block rule', async () => {
      const engine = new RuleEngine();
      engine.setRules([makeRule({ action: 'block', config: null })]);
      const result = await engine.evaluateRequest(makeCtx());
      expect(result.handled).toBe(true);
      expect(result.response).toBeDefined();
      expect(result.response!.status).toBe(403);
    });

    it('skips disabled rules', async () => {
      const engine = new RuleEngine();
      engine.setRules([makeRule({ enabled: false })]);
      const result = await engine.evaluateRequest(makeCtx());
      expect(result.handled).toBe(false);
    });

    it('skips rules that do not match', async () => {
      const engine = new RuleEngine();
      engine.setRules([makeRule({ match: { url: 'https://other.com/*' } })]);
      const result = await engine.evaluateRequest(makeCtx());
      expect(result.handled).toBe(false);
    });

    it('accumulates delay from delay rule', async () => {
      const engine = new RuleEngine();
      engine.setRules([makeRule({ action: 'delay', config: { delay: 500 } })]);
      const result = await engine.evaluateRequest(makeCtx());
      expect(result.handled).toBe(false);
      expect(result.delay).toBe(500);
    });

    it('accumulates modifications from modify-request rule', async () => {
      const engine = new RuleEngine();
      engine.setRules([
        makeRule({
          action: 'modify-request',
          config: { setHeaders: { 'x-custom': 'value' } },
        }),
      ]);
      const result = await engine.evaluateRequest(makeCtx());
      expect(result.handled).toBe(false);
      expect(result.modifiedRequest).toBeDefined();
      expect(result.modifiedRequest!.headers!['x-custom']).toBe('value');
    });

    it('respects priority ordering - higher priority handled first', async () => {
      const engine = new RuleEngine();
      engine.setRules([
        makeRule({
          id: 'block-low',
          action: 'block',
          config: null,
          priority: 10,
        }),
        makeRule({
          id: 'mock-high',
          action: 'mock',
          config: { status: 201, body: 'first' },
          priority: 1,
        }),
      ]);
      const result = await engine.evaluateRequest(makeCtx());
      expect(result.handled).toBe(true);
      expect(result.response!.status).toBe(201);
    });
  });

  describe('evaluateResponse', () => {
    it('applies modify-response rules', async () => {
      const engine = new RuleEngine();
      engine.setRules([
        makeRule({
          action: 'modify-response',
          config: {
            setStatus: 201,
            setHeaders: { 'x-modified': 'true' },
          },
        }),
      ]);
      const response = { status: 200, headers: {}, body: null };
      const result = await engine.evaluateResponse(makeCtx(), response);
      expect(result.modifiedResponse).toBeDefined();
      expect(result.modifiedResponse!.status).toBe(201);
      expect(result.modifiedResponse!.headers!['x-modified']).toBe('true');
    });

    it('ignores non-modify-response rules', async () => {
      const engine = new RuleEngine();
      engine.setRules([makeRule({ action: 'mock' })]);
      const response = { status: 200, headers: {}, body: null };
      const result = await engine.evaluateResponse(makeCtx(), response);
      expect(result.modifiedResponse).toBeUndefined();
    });
  });

  describe('getMatchingRules', () => {
    it('returns only enabled matching rules', () => {
      const engine = new RuleEngine();
      engine.setRules([
        makeRule({ id: 'match', match: { url: '*' } }),
        makeRule({ id: 'no-match', match: { url: 'https://other.com/*' } }),
        makeRule({ id: 'disabled', enabled: false }),
      ]);
      const matching = engine.getMatchingRules(makeCtx());
      expect(matching).toHaveLength(1);
      expect(matching[0].id).toBe('match');
    });
  });
});
