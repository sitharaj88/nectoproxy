import type { DelayConfig } from '@nectoproxy/shared';
import type { ActionHandler, RuleResult } from './types.js';
import type { MatchContext } from '../RuleMatcher.js';

export class DelayAction implements ActionHandler<DelayConfig> {
  async executeRequest(config: DelayConfig, _ctx: MatchContext): Promise<RuleResult> {
    let delay = config.delay;

    // Apply variance if configured
    if (config.variance && config.variance > 0) {
      // Add random variance between -variance and +variance
      const variance = (Math.random() * 2 - 1) * config.variance;
      delay += variance;
    }

    // Ensure delay is non-negative
    delay = Math.max(0, Math.round(delay));

    return {
      handled: false,
      delay,
    };
  }
}
