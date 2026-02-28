import type {
  HAR,
  HAREntry,
  HARHeader,
  HARQueryParam,
  HARCookie,
  TrafficEntry,
} from '@nectoproxy/shared';

const VERSION = '0.1.0';

export class HarConverter {
  /**
   * Convert traffic entries to HAR format
   */
  toHAR(entries: TrafficEntry[], sessionName: string = 'NectoProxy Session'): HAR {
    return {
      log: {
        version: '1.2',
        creator: {
          name: 'NectoProxy',
          version: VERSION,
        },
        pages: [
          {
            startedDateTime: new Date().toISOString(),
            id: 'page_1',
            title: sessionName,
            pageTimings: {
              onContentLoad: -1,
              onLoad: -1,
            },
          },
        ],
        entries: entries.map((entry) => this.convertEntry(entry)),
      },
    };
  }

  /**
   * Convert a single traffic entry to HAR entry
   */
  private convertEntry(entry: TrafficEntry): HAREntry {
    const url = new URL(entry.url);

    return {
      pageref: 'page_1',
      startedDateTime: new Date(entry.timestamp).toISOString(),
      time: entry.duration || 0,
      request: {
        method: entry.method,
        url: entry.url,
        httpVersion: 'HTTP/1.1',
        cookies: this.extractCookies(entry.requestHeaders),
        headers: this.convertHeaders(entry.requestHeaders),
        queryString: this.parseQueryString(url.searchParams),
        postData: entry.requestBody
          ? {
              mimeType: this.getContentType(entry.requestHeaders) || 'application/octet-stream',
              text: this.bodyToString(entry.requestBody),
            }
          : undefined,
        headersSize: this.calculateHeadersSize(entry.requestHeaders),
        bodySize: entry.requestBodySize || 0,
      },
      response: {
        status: entry.status || 0,
        statusText: entry.statusText || '',
        httpVersion: 'HTTP/1.1',
        cookies: entry.responseHeaders ? this.extractCookies(entry.responseHeaders) : [],
        headers: entry.responseHeaders ? this.convertHeaders(entry.responseHeaders) : [],
        content: {
          size: entry.responseBodySize || 0,
          mimeType: entry.responseHeaders
            ? this.getContentType(entry.responseHeaders) || 'application/octet-stream'
            : 'application/octet-stream',
          text: entry.responseBody
            ? this.isBinaryContent(entry.responseHeaders)
              ? this.bodyToBase64(entry.responseBody)
              : this.bodyToString(entry.responseBody)
            : undefined,
          encoding: this.isBinaryContent(entry.responseHeaders) ? 'base64' : undefined,
        },
        redirectURL: '',
        headersSize: entry.responseHeaders ? this.calculateHeadersSize(entry.responseHeaders) : -1,
        bodySize: entry.responseBodySize || -1,
      },
      cache: {},
      timings: {
        send: 0,
        wait: entry.duration || 0,
        receive: 0,
      },
      serverIPAddress: entry.remoteAddress || undefined,
    };
  }

  /**
   * Parse HAR file and convert to traffic entries
   */
  fromHAR(har: HAR, sessionId: string): TrafficEntry[] {
    return har.log.entries.map((entry, index) => this.convertHAREntry(entry, sessionId, index));
  }

  /**
   * Convert a single HAR entry to traffic entry
   */
  private convertHAREntry(entry: HAREntry, sessionId: string, index: number): TrafficEntry {
    const url = new URL(entry.request.url);

    return {
      id: `imported-${Date.now()}-${index}`,
      sessionId,
      timestamp: new Date(entry.startedDateTime).getTime(),
      method: entry.request.method,
      url: entry.request.url,
      protocol: url.protocol.replace(':', '') as 'http' | 'https',
      host: url.hostname,
      path: url.pathname + url.search,
      requestHeaders: this.headersToRecord(entry.request.headers),
      requestBody: entry.request.postData?.text
        ? Buffer.from(entry.request.postData.text)
        : null,
      requestBodySize: entry.request.bodySize,
      status: entry.response.status,
      statusText: entry.response.statusText,
      responseHeaders: this.headersToRecord(entry.response.headers),
      responseBody: entry.response.content.text
        ? entry.response.content.encoding === 'base64'
          ? Buffer.from(entry.response.content.text, 'base64')
          : Buffer.from(entry.response.content.text)
        : null,
      responseBodySize: entry.response.content.size,
      duration: entry.time,
      remoteAddress: entry.serverIPAddress || null,
      tlsVersion: null,
      error: null,
      isComplete: true,
      isMocked: false,
      isBreakpointed: false,
      isTruncated: false,
    };
  }

  /**
   * Convert headers record to HAR header array
   */
  private convertHeaders(headers: Record<string, string | string[]> | null): HARHeader[] {
    if (!headers) return [];

    const result: HARHeader[] = [];
    for (const [name, value] of Object.entries(headers)) {
      if (Array.isArray(value)) {
        for (const v of value) {
          result.push({ name, value: v });
        }
      } else {
        result.push({ name, value });
      }
    }
    return result;
  }

  /**
   * Convert HAR headers to record
   */
  private headersToRecord(headers: HARHeader[]): Record<string, string | string[]> {
    const result: Record<string, string | string[]> = {};

    for (const header of headers) {
      const existing = result[header.name.toLowerCase()];
      if (existing) {
        if (Array.isArray(existing)) {
          existing.push(header.value);
        } else {
          result[header.name.toLowerCase()] = [existing, header.value];
        }
      } else {
        result[header.name.toLowerCase()] = header.value;
      }
    }

    return result;
  }

  /**
   * Parse URL search params to HAR query string
   */
  private parseQueryString(params: URLSearchParams): HARQueryParam[] {
    const result: HARQueryParam[] = [];
    for (const [name, value] of params) {
      result.push({ name, value });
    }
    return result;
  }

  /**
   * Extract cookies from headers
   */
  private extractCookies(headers: Record<string, string | string[]> | null): HARCookie[] {
    if (!headers) return [];

    const cookieHeader = headers['cookie'] || headers['Cookie'];
    if (!cookieHeader) return [];

    const cookieString = Array.isArray(cookieHeader) ? cookieHeader.join('; ') : cookieHeader;

    return cookieString.split(';').map((cookie) => {
      const [name, ...valueParts] = cookie.trim().split('=');
      return {
        name: name.trim(),
        value: valueParts.join('=').trim(),
      };
    });
  }

  /**
   * Get content type from headers
   */
  private getContentType(headers: Record<string, string | string[]> | null): string | null {
    if (!headers) return null;

    const contentType = headers['content-type'] || headers['Content-Type'];
    if (!contentType) return null;

    const value = Array.isArray(contentType) ? contentType[0] : contentType;
    return value.split(';')[0].trim();
  }

  /**
   * Check if content is binary based on content type
   */
  private isBinaryContent(headers: Record<string, string | string[]> | null): boolean {
    const contentType = this.getContentType(headers);
    if (!contentType) return false;

    const textTypes = [
      'text/',
      'application/json',
      'application/xml',
      'application/javascript',
      'application/x-www-form-urlencoded',
    ];

    return !textTypes.some((type) => contentType.startsWith(type));
  }

  /**
   * Convert body buffer to string
   */
  private bodyToString(body: Buffer | string | null): string {
    if (!body) return '';
    if (typeof body === 'string') return body;
    if (Buffer.isBuffer(body)) return body.toString('utf-8');
    return String(body);
  }

  /**
   * Convert body buffer to base64 string (for binary content)
   */
  private bodyToBase64(body: Buffer | string | null): string {
    if (!body) return '';
    if (typeof body === 'string') return Buffer.from(body).toString('base64');
    if (Buffer.isBuffer(body)) return body.toString('base64');
    return '';
  }

  /**
   * Calculate approximate headers size
   */
  private calculateHeadersSize(headers: Record<string, string | string[]> | null): number {
    if (!headers) return -1;

    let size = 0;
    for (const [name, value] of Object.entries(headers)) {
      if (Array.isArray(value)) {
        for (const v of value) {
          size += name.length + v.length + 4; // ": " and "\r\n"
        }
      } else {
        size += name.length + value.length + 4;
      }
    }
    return size;
  }
}
