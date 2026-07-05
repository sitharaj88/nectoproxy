import type { ModifyResponseConfig } from '@nectoproxy/shared';
import type { ActionHandler, RuleResult } from './types.js';
import type { MatchContext } from '../RuleMatcher.js';
import { runTransform } from '../sandbox.js';

export class ModifyResponseAction implements ActionHandler<ModifyResponseConfig> {
  async executeRequest(_config: ModifyResponseConfig, _ctx: MatchContext): Promise<RuleResult> {
    // This action doesn't modify the request, only the response
    return { handled: false };
  }

  async executeResponse(
    config: ModifyResponseConfig,
    _ctx: MatchContext,
    response: {
      status: number;
      statusText?: string;
      headers: Record<string, string | string[]>;
      body: Buffer | null;
    }
  ): Promise<RuleResult> {
    const modifiedHeaders = { ...response.headers };
    let modifiedStatus = response.status;
    let modifiedStatusText = response.statusText;
    let modifiedBody = response.body;

    // Set status
    if (config.setStatus !== undefined) {
      modifiedStatus = config.setStatus;
      modifiedStatusText = this.getStatusText(config.setStatus);
    }

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

    // Replace body
    if (config.replaceBody) {
      modifiedBody = Buffer.isBuffer(config.replaceBody)
        ? config.replaceBody
        : Buffer.from(config.replaceBody);
      modifiedHeaders['content-length'] = String(modifiedBody.length);
    }

    // Transform body using a sandboxed JavaScript function
    if (config.transformBody && response.body) {
      const bodyStr = response.body.toString('utf-8');
      const result = runTransform(config.transformBody, {
        body: bodyStr,
        headers: modifiedHeaders,
        status: modifiedStatus,
      });
      if (result.ok && result.value !== undefined) {
        modifiedBody = Buffer.from(result.value);
        modifiedHeaders['content-length'] = String(modifiedBody.length);
      } else if (!result.ok) {
        console.error('Response body transform error:', result.error);
      }
    }

    return {
      handled: false,
      modifiedResponse: {
        status: modifiedStatus,
        statusText: modifiedStatusText,
        headers: modifiedHeaders,
        body: modifiedBody || undefined,
      },
    };
  }

  private getStatusText(status: number): string {
    const statusTexts: Record<number, string> = {
      200: 'OK',
      201: 'Created',
      204: 'No Content',
      301: 'Moved Permanently',
      302: 'Found',
      304: 'Not Modified',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
    };
    return statusTexts[status] || 'OK';
  }
}
