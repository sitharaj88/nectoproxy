import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';
import type { TrafficEntry } from '@nectoproxy/shared';

export interface ReplayRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string | Buffer;
  timeout?: number;
}

export interface ReplayResult {
  status: number;
  statusText: string;
  headers: Record<string, string | string[]>;
  body: Buffer | null;
  duration: number;
  error?: string;
}

export class ReplayService {
  /**
   * Replay a request with optional modifications
   */
  async replay(request: ReplayRequest): Promise<ReplayResult> {
    const startTime = Date.now();
    const url = new URL(request.url);
    const isHttps = url.protocol === 'https:';
    const timeout = request.timeout || 30000;

    const options: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: request.method,
      headers: this.prepareHeaders(request.headers, url.hostname),
      timeout,
    };

    if (isHttps) {
      (options as https.RequestOptions).rejectUnauthorized = false;
    }

    return new Promise((resolve) => {
      const httpModule = isHttps ? https : http;

      const req = httpModule.request(options, (res) => {
        const chunks: Buffer[] = [];

        res.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        res.on('end', () => {
          const duration = Date.now() - startTime;
          const body = chunks.length > 0 ? Buffer.concat(chunks) : null;

          resolve({
            status: res.statusCode || 0,
            statusText: res.statusMessage || '',
            headers: res.headers as Record<string, string | string[]>,
            body,
            duration,
          });
        });
      });

      req.on('error', (err) => {
        const duration = Date.now() - startTime;
        resolve({
          status: 0,
          statusText: 'Error',
          headers: {},
          body: null,
          duration,
          error: err.message,
        });
      });

      req.on('timeout', () => {
        req.destroy();
        const duration = Date.now() - startTime;
        resolve({
          status: 0,
          statusText: 'Timeout',
          headers: {},
          body: null,
          duration,
          error: 'Request timed out',
        });
      });

      // Send body if present
      if (request.body) {
        const bodyBuffer = typeof request.body === 'string'
          ? Buffer.from(request.body)
          : request.body;
        req.write(bodyBuffer);
      }

      req.end();
    });
  }

  /**
   * Create a replay request from a traffic entry
   */
  fromTrafficEntry(entry: TrafficEntry): ReplayRequest {
    const headers: Record<string, string> = {};

    // Convert headers to simple key-value pairs
    if (entry.requestHeaders) {
      for (const [key, value] of Object.entries(entry.requestHeaders)) {
        if (key.toLowerCase() === 'host') continue; // Will be set by URL
        if (key.toLowerCase() === 'content-length') continue; // Will be recalculated
        headers[key] = Array.isArray(value) ? value.join(', ') : value;
      }
    }

    return {
      method: entry.method,
      url: entry.url,
      headers,
      body: entry.requestBody || undefined,
    };
  }

  /**
   * Compare original response with replay response
   */
  compare(original: TrafficEntry, replay: ReplayResult): ReplayComparison {
    const changes: ReplayChange[] = [];

    // Compare status
    if (original.status !== replay.status) {
      changes.push({
        type: 'status',
        field: 'status',
        original: String(original.status),
        replayed: String(replay.status),
      });
    }

    // Compare headers
    const originalHeaders = original.responseHeaders || {};
    const replayHeaders = replay.headers || {};

    const allHeaderKeys = new Set([
      ...Object.keys(originalHeaders),
      ...Object.keys(replayHeaders),
    ]);

    for (const key of allHeaderKeys) {
      const originalValue = this.headerToString(originalHeaders[key]);
      const replayValue = this.headerToString(replayHeaders[key]);

      if (originalValue !== replayValue) {
        changes.push({
          type: 'header',
          field: key,
          original: originalValue,
          replayed: replayValue,
        });
      }
    }

    // Compare body size
    const originalSize = original.responseBodySize || 0;
    const replaySize = replay.body?.length || 0;

    if (originalSize !== replaySize) {
      changes.push({
        type: 'body_size',
        field: 'body_size',
        original: String(originalSize),
        replayed: String(replaySize),
      });
    }

    // Compare body content
    const originalBody = original.responseBody;
    const replayBody = replay.body;

    const bodiesMatch =
      (!originalBody && !replayBody) ||
      (originalBody && replayBody && originalBody.equals(replayBody));

    if (!bodiesMatch) {
      changes.push({
        type: 'body',
        field: 'body',
        original: originalBody ? 'present' : 'empty',
        replayed: replayBody ? 'present' : 'empty',
      });
    }

    return {
      identical: changes.length === 0,
      changes,
      originalDuration: original.duration || 0,
      replayDuration: replay.duration,
    };
  }

  private prepareHeaders(headers: Record<string, string>, hostname: string): Record<string, string> {
    const prepared: Record<string, string> = { ...headers };

    // Ensure host header is set
    if (!prepared['host'] && !prepared['Host']) {
      prepared['Host'] = hostname;
    }

    // Remove problematic headers
    delete prepared['content-length'];
    delete prepared['Content-Length'];

    return prepared;
  }

  private headerToString(value: string | string[] | undefined): string {
    if (!value) return '';
    return Array.isArray(value) ? value.join(', ') : value;
  }
}

export interface ReplayChange {
  type: 'status' | 'header' | 'body_size' | 'body';
  field: string;
  original: string;
  replayed: string;
}

export interface ReplayComparison {
  identical: boolean;
  changes: ReplayChange[];
  originalDuration: number;
  replayDuration: number;
}
