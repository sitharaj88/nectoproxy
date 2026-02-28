import { describe, it, expect } from 'vitest';
import { HarConverter } from '../HarConverter.js';
import type { TrafficEntry, HAR } from '@nectoproxy/shared';

function makeTrafficEntry(overrides: Partial<TrafficEntry> = {}): TrafficEntry {
  return {
    id: 'traffic-1',
    sessionId: 'session-1',
    timestamp: 1700000000000,
    method: 'GET',
    url: 'https://example.com/api/users?page=1',
    protocol: 'https',
    host: 'example.com',
    path: '/api/users?page=1',
    requestHeaders: {
      'content-type': 'application/json',
      'cookie': 'session=abc123; theme=dark',
    },
    requestBody: null,
    requestBodySize: 0,
    status: 200,
    statusText: 'OK',
    responseHeaders: {
      'content-type': 'application/json',
      'x-request-id': 'req-456',
    },
    responseBody: Buffer.from('{"users":[]}'),
    responseBodySize: 12,
    duration: 150,
    remoteAddress: '93.184.216.34',
    tlsVersion: 'TLSv1.3',
    error: null,
    isComplete: true,
    isMocked: false,
    isBreakpointed: false,
    isTruncated: false,
    ...overrides,
  };
}

describe('HarConverter', () => {
  const converter = new HarConverter();

  describe('toHAR', () => {
    it('produces valid HAR 1.2 structure', () => {
      const har = converter.toHAR([makeTrafficEntry()], 'Test Session');
      expect(har.log.version).toBe('1.2');
      expect(har.log.creator.name).toBe('NectoProxy');
      expect(har.log.pages).toHaveLength(1);
      expect(har.log.pages![0].title).toBe('Test Session');
      expect(har.log.entries).toHaveLength(1);
    });

    it('converts request fields correctly', () => {
      const har = converter.toHAR([makeTrafficEntry()]);
      const entry = har.log.entries[0];
      expect(entry.request.method).toBe('GET');
      expect(entry.request.url).toBe('https://example.com/api/users?page=1');
      expect(entry.request.httpVersion).toBe('HTTP/1.1');
    });

    it('converts response fields correctly', () => {
      const har = converter.toHAR([makeTrafficEntry()]);
      const entry = har.log.entries[0];
      expect(entry.response.status).toBe(200);
      expect(entry.response.statusText).toBe('OK');
      expect(entry.response.content.size).toBe(12);
      expect(entry.response.content.mimeType).toBe('application/json');
    });

    it('extracts query string parameters', () => {
      const har = converter.toHAR([makeTrafficEntry()]);
      const entry = har.log.entries[0];
      expect(entry.request.queryString).toEqual([
        { name: 'page', value: '1' },
      ]);
    });

    it('converts headers to HAR format', () => {
      const har = converter.toHAR([makeTrafficEntry()]);
      const entry = har.log.entries[0];
      const ctHeader = entry.request.headers.find(h => h.name === 'content-type');
      expect(ctHeader).toBeDefined();
      expect(ctHeader!.value).toBe('application/json');
    });

    it('extracts cookies from header', () => {
      const har = converter.toHAR([makeTrafficEntry()]);
      const entry = har.log.entries[0];
      expect(entry.request.cookies).toHaveLength(2);
      expect(entry.request.cookies[0].name).toBe('session');
      expect(entry.request.cookies[0].value).toBe('abc123');
      expect(entry.request.cookies[1].name).toBe('theme');
      expect(entry.request.cookies[1].value).toBe('dark');
    });

    it('handles multi-value headers', () => {
      const entry = makeTrafficEntry({
        requestHeaders: {
          'accept': ['text/html', 'application/json'],
        },
      });
      const har = converter.toHAR([entry]);
      const acceptHeaders = har.log.entries[0].request.headers.filter(h => h.name === 'accept');
      expect(acceptHeaders).toHaveLength(2);
    });

    it('includes server IP address', () => {
      const har = converter.toHAR([makeTrafficEntry()]);
      expect(har.log.entries[0].serverIPAddress).toBe('93.184.216.34');
    });

    it('handles entries with no response', () => {
      const entry = makeTrafficEntry({
        status: undefined as unknown as number,
        statusText: undefined as unknown as string,
        responseHeaders: null as unknown as Record<string, string | string[]>,
        responseBody: null,
        responseBodySize: undefined as unknown as number,
      });
      const har = converter.toHAR([entry]);
      expect(har.log.entries[0].response.status).toBe(0);
    });

    it('handles POST with request body', () => {
      const entry = makeTrafficEntry({
        method: 'POST',
        requestBody: Buffer.from('{"name":"test"}'),
        requestBodySize: 15,
      });
      const har = converter.toHAR([entry]);
      expect(har.log.entries[0].request.postData).toBeDefined();
      expect(har.log.entries[0].request.postData!.text).toBe('{"name":"test"}');
      expect(har.log.entries[0].request.postData!.mimeType).toBe('application/json');
    });

    it('converts multiple entries', () => {
      const entries = [
        makeTrafficEntry({ id: '1' }),
        makeTrafficEntry({ id: '2' }),
        makeTrafficEntry({ id: '3' }),
      ];
      const har = converter.toHAR(entries);
      expect(har.log.entries).toHaveLength(3);
    });
  });

  describe('fromHAR', () => {
    it('converts HAR entries to traffic entries', () => {
      const har = converter.toHAR([makeTrafficEntry()], 'Test');
      const entries = converter.fromHAR(har, 'new-session');
      expect(entries).toHaveLength(1);
      expect(entries[0].sessionId).toBe('new-session');
      expect(entries[0].method).toBe('GET');
      expect(entries[0].url).toBe('https://example.com/api/users?page=1');
    });

    it('preserves key fields in round-trip', () => {
      const original = makeTrafficEntry();
      const har = converter.toHAR([original]);
      const imported = converter.fromHAR(har, 'new-session');

      expect(imported[0].method).toBe(original.method);
      expect(imported[0].url).toBe(original.url);
      expect(imported[0].host).toBe(original.host);
      expect(imported[0].status).toBe(original.status);
      expect(imported[0].statusText).toBe(original.statusText);
      expect(imported[0].duration).toBe(original.duration);
      expect(imported[0].isComplete).toBe(true);
    });

    it('handles base64 encoded binary response body', () => {
      const binaryData = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
      const har: HAR = {
        log: {
          version: '1.2',
          creator: { name: 'test', version: '1.0' },
          pages: [],
          entries: [{
            pageref: 'page_1',
            startedDateTime: new Date().toISOString(),
            time: 100,
            request: {
              method: 'GET',
              url: 'https://example.com/image.png',
              httpVersion: 'HTTP/1.1',
              cookies: [],
              headers: [],
              queryString: [],
              headersSize: -1,
              bodySize: 0,
            },
            response: {
              status: 200,
              statusText: 'OK',
              httpVersion: 'HTTP/1.1',
              cookies: [],
              headers: [{ name: 'content-type', value: 'image/png' }],
              content: {
                size: 4,
                mimeType: 'image/png',
                text: binaryData.toString('base64'),
                encoding: 'base64',
              },
              redirectURL: '',
              headersSize: -1,
              bodySize: 4,
            },
            cache: {},
            timings: { send: 0, wait: 100, receive: 0 },
          }],
        },
      };

      const entries = converter.fromHAR(har, 'session-1');
      expect(entries[0].responseBody).toEqual(binaryData);
    });
  });
});
