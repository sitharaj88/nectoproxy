import type { Rule, RuleAction } from '@proxyscope/shared';
import { RuleMatcherEngine, type MatchContext } from './RuleMatcher.js';
import {
  type ActionHandler,
  type RuleResult,
  MockAction,
  MapLocalAction,
  MapRemoteAction,
  ModifyRequestAction,
  ModifyResponseAction,
  DelayAction,
  ThrottleAction,
  BlockAction,
} from './actions/index.js';

export interface ResponseData {
  status: number;
  statusText?: string;
  headers: Record<string, string | string[]>;
  body: Buffer | null;
}

export class RuleEngine {
  private rules: Rule[] = [];
  private matcher = new RuleMatcherEngine();
  private actions: Map<RuleAction, ActionHandler>;

  constructor() {
    this.actions = new Map<RuleAction, ActionHandler>([
      ['mock', new MockAction()],
      ['map-local', new MapLocalAction()],
      ['map-remote', new MapRemoteAction()],
      ['modify-request', new ModifyRequestAction()],
      ['modify-response', new ModifyResponseAction()],
      ['delay', new DelayAction()],
      ['throttle', new ThrottleAction()],
      ['block', new BlockAction()],
    ]);
  }

  setRules(rules: Rule[]): void {
    // Store rules sorted by priority (lower number = higher priority)
    this.rules = [...rules].sort((a, b) => a.priority - b.priority);
  }

  getRules(): Rule[] {
    return this.rules;
  }

  addRule(rule: Rule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => a.priority - b.priority);
  }

  removeRule(id: string): void {
    this.rules = this.rules.filter((r) => r.id !== id);
  }

  updateRule(id: string, updates: Partial<Rule>): void {
    const index = this.rules.findIndex((r) => r.id === id);
    if (index !== -1) {
      this.rules[index] = { ...this.rules[index], ...updates };
      this.rules.sort((a, b) => a.priority - b.priority);
    }
  }

  async evaluateRequest(ctx: MatchContext): Promise<RuleResult> {
    const combinedResult: RuleResult = { handled: false };

    for (const rule of this.rules) {
      if (!rule.enabled) continue;
      if (!this.matcher.matchesContext(rule.match, ctx)) continue;

      const action = this.actions.get(rule.action);
      if (!action) continue;

      const result = await action.executeRequest(rule.config as never, ctx);

      // If the action handles the request completely (mock, block), return immediately
      if (result.handled) {
        return {
          ...result,
          delay: combinedResult.delay || result.delay,
          throttle: combinedResult.throttle || result.throttle,
        };
      }

      // Accumulate modifications from multiple rules
      if (result.modifiedRequest) {
        combinedResult.modifiedRequest = {
          ...combinedResult.modifiedRequest,
          ...result.modifiedRequest,
          headers: {
            ...combinedResult.modifiedRequest?.headers,
            ...result.modifiedRequest.headers,
          },
        };
      }

      // Take the first delay value encountered
      if (result.delay !== undefined && combinedResult.delay === undefined) {
        combinedResult.delay = result.delay;
      }

      // Take the first throttle value encountered
      if (result.throttle && !combinedResult.throttle) {
        combinedResult.throttle = result.throttle;
      }
    }

    return combinedResult;
  }

  async evaluateResponse(ctx: MatchContext, response: ResponseData): Promise<RuleResult> {
    const combinedResult: RuleResult = { handled: false };

    for (const rule of this.rules) {
      if (!rule.enabled) continue;
      if (rule.action !== 'modify-response') continue;
      if (!this.matcher.matchesContext(rule.match, ctx)) continue;

      const action = this.actions.get(rule.action);
      if (!action || !action.executeResponse) continue;

      const result = await action.executeResponse(rule.config as never, ctx, response);

      // Accumulate response modifications
      if (result.modifiedResponse) {
        // Update the response object for subsequent rules
        if (result.modifiedResponse.status !== undefined) {
          response.status = result.modifiedResponse.status;
        }
        if (result.modifiedResponse.statusText !== undefined) {
          response.statusText = result.modifiedResponse.statusText;
        }
        if (result.modifiedResponse.headers) {
          response.headers = {
            ...response.headers,
            ...result.modifiedResponse.headers,
          };
        }
        if (result.modifiedResponse.body !== undefined) {
          response.body = result.modifiedResponse.body;
        }

        combinedResult.modifiedResponse = {
          ...combinedResult.modifiedResponse,
          ...result.modifiedResponse,
          headers: {
            ...combinedResult.modifiedResponse?.headers,
            ...result.modifiedResponse.headers,
          },
        };
      }
    }

    return combinedResult;
  }

  getMatchingRules(ctx: MatchContext): Rule[] {
    return this.rules.filter(
      (rule) => rule.enabled && this.matcher.matchesContext(rule.match, ctx)
    );
  }
}
