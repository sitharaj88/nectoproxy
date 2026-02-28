import fs from 'node:fs/promises';
import type { MockResponse } from '@nectoproxy/shared';
import type { ActionHandler, RuleResult } from './types.js';
import type { MatchContext } from '../RuleMatcher.js';

export class MockAction implements ActionHandler<MockResponse> {
  async executeRequest(config: MockResponse, _ctx: MatchContext): Promise<RuleResult> {
    let body: Buffer | null = null;

    if (config.bodyFile) {
      try {
        body = await fs.readFile(config.bodyFile);
      } catch (error) {
        console.error(`Failed to read mock body file: ${config.bodyFile}`, error);
        body = Buffer.from(`Error reading file: ${config.bodyFile}`);
      }
    } else if (config.body) {
      body = Buffer.isBuffer(config.body) ? config.body : Buffer.from(config.body);
    }

    return {
      handled: true,
      response: {
        status: config.status,
        statusText: config.statusText || this.getStatusText(config.status),
        headers: config.headers || {},
        body,
      },
      delay: config.delay,
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
