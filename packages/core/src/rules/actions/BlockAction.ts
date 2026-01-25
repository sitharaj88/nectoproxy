import type { ActionHandler, RuleResult } from './types.js';
import type { MatchContext } from '../RuleMatcher.js';

export class BlockAction implements ActionHandler<null> {
  async executeRequest(_config: null, _ctx: MatchContext): Promise<RuleResult> {
    return {
      handled: true,
      response: {
        status: 403,
        statusText: 'Blocked',
        headers: {
          'content-type': 'text/plain',
        },
        body: Buffer.from('Request blocked by proxy rule'),
      },
    };
  }
}
