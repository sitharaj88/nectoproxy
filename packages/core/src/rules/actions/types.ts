import type { MatchContext } from '../RuleMatcher.js';

export interface RuleResult {
  handled: boolean;
  response?: {
    status: number;
    statusText?: string;
    headers: Record<string, string>;
    body: Buffer | null;
  };
  modifiedRequest?: {
    url?: string;
    method?: string;
    headers?: Record<string, string | string[]>;
    body?: Buffer;
  };
  modifiedResponse?: {
    status?: number;
    statusText?: string;
    headers?: Record<string, string | string[]>;
    body?: Buffer;
  };
  delay?: number;
  throttle?: {
    bytesPerSecond: number;
    latency?: number;
  };
}

export interface ActionHandler<TConfig = unknown> {
  executeRequest(config: TConfig, ctx: MatchContext): Promise<RuleResult>;
  executeResponse?(
    config: TConfig,
    ctx: MatchContext,
    response: {
      status: number;
      statusText?: string;
      headers: Record<string, string | string[]>;
      body: Buffer | null;
    }
  ): Promise<RuleResult>;
}
