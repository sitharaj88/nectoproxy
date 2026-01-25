import type { MapRemoteConfig } from '@proxyscope/shared';
import type { ActionHandler, RuleResult } from './types.js';
import type { MatchContext } from '../RuleMatcher.js';

export class MapRemoteAction implements ActionHandler<MapRemoteConfig> {
  async executeRequest(config: MapRemoteConfig, ctx: MatchContext): Promise<RuleResult> {
    const targetUrl = new URL(config.targetUrl);
    const originalUrl = new URL(ctx.url);

    // Preserve path if configured
    if (config.preservePath) {
      targetUrl.pathname = originalUrl.pathname;
    }

    // Preserve query string if configured
    if (config.preserveQuery) {
      targetUrl.search = originalUrl.search;
    }

    // Update host header to match target
    const modifiedHeaders = { ...ctx.requestHeaders };
    modifiedHeaders['host'] = targetUrl.host;

    return {
      handled: false, // Let proxy forward but to new URL
      modifiedRequest: {
        url: targetUrl.toString(),
        headers: modifiedHeaders,
      },
    };
  }
}
