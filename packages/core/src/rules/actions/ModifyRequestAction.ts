import type { ModifyRequestConfig } from '@nectoproxy/shared';
import type { ActionHandler, RuleResult } from './types.js';
import type { MatchContext } from '../RuleMatcher.js';

export class ModifyRequestAction implements ActionHandler<ModifyRequestConfig> {
  async executeRequest(config: ModifyRequestConfig, ctx: MatchContext): Promise<RuleResult> {
    const modifiedHeaders = { ...ctx.requestHeaders };
    let modifiedUrl = ctx.url;
    let modifiedBody = ctx.requestBody || undefined;

    // Set headers
    if (config.setHeaders) {
      for (const [key, value] of Object.entries(config.setHeaders)) {
        modifiedHeaders[key.toLowerCase()] = value;
      }
    }

    // Remove headers
    if (config.removeHeaders) {
      for (const header of config.removeHeaders) {
        delete modifiedHeaders[header.toLowerCase()];
      }
    }

    // Modify query parameters
    if (config.setQueryParams || config.removeQueryParams) {
      const url = new URL(ctx.url);

      // Set query params
      if (config.setQueryParams) {
        for (const [key, value] of Object.entries(config.setQueryParams)) {
          url.searchParams.set(key, value);
        }
      }

      // Remove query params
      if (config.removeQueryParams) {
        for (const param of config.removeQueryParams) {
          url.searchParams.delete(param);
        }
      }

      modifiedUrl = url.toString();
    }

    // Replace body
    if (config.replaceBody) {
      modifiedBody = Buffer.isBuffer(config.replaceBody)
        ? config.replaceBody
        : Buffer.from(config.replaceBody);
      // Update content-length header
      modifiedHeaders['content-length'] = String(modifiedBody.length);
    }

    // Transform body using JavaScript function
    if (config.transformBody && ctx.requestBody) {
      try {
        const transformFn = new Function('body', 'headers', config.transformBody);
        const bodyStr = ctx.requestBody.toString('utf-8');
        const result = transformFn(bodyStr, modifiedHeaders);
        modifiedBody = Buffer.from(result);
        modifiedHeaders['content-length'] = String(modifiedBody.length);
      } catch (error) {
        console.error('Body transform error:', error);
      }
    }

    return {
      handled: false,
      modifiedRequest: {
        url: modifiedUrl,
        headers: modifiedHeaders,
        body: modifiedBody,
      },
    };
  }
}
