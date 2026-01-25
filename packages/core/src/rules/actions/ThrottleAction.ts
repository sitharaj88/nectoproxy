import type { ThrottleConfig } from '@proxyscope/shared';
import type { ActionHandler, RuleResult } from './types.js';
import type { MatchContext } from '../RuleMatcher.js';

export class ThrottleAction implements ActionHandler<ThrottleConfig> {
  async executeRequest(config: ThrottleConfig, _ctx: MatchContext): Promise<RuleResult> {
    return {
      handled: false,
      throttle: {
        bytesPerSecond: config.bytesPerSecond,
        latency: config.latency,
      },
    };
  }
}
