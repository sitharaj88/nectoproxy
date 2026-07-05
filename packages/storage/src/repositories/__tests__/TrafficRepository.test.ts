import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { getDatabase, closeDatabase } from '../../db/connection.js';
import { encodeBody, decodeBody } from '../../db/bodyCodec.js';
import { TrafficRepository } from '../TrafficRepository.js';
import { SessionRepository } from '../SessionRepository.js';
import type { TrafficEntry } from '@nectoproxy/shared';

function makeEntry(sessionId: string, overrides: Partial<TrafficEntry> = {}): TrafficEntry {
  return {
    id: randomUUID(),
    sessionId,
    timestamp: Date.now(),
    method: 'GET',
    url: 'http://example.com/',
    protocol: 'http',
    host: 'example.com',
    path: '/',
    requestHeaders: {},
    requestBody: null,
    requestBodySize: 0,
    status: 200,
    statusText: 'OK',
    responseHeaders: {},
    responseBody: null,
    responseBodySize: 0,
    duration: 5,
    remoteAddress: '127.0.0.1',
    tlsVersion: null,
    error: null,
    isComplete: true,
    isMocked: false,
    isBreakpointed: false,
    isTruncated: false,
    ...overrides,
  };
}

describe('TrafficRepository body compression + retention', () => {
  let tmpDir: string;
  let repo: TrafficRepository;
  let sessions: SessionRepository;
  let sessionId: string;
  const savedMax = process.env.NECTO_MAX_TRAFFIC;
  const savedBuf = process.env.NECTO_TRAFFIC_PRUNE_BUFFER;

  beforeEach(async () => {
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'necto-storage-test-'));
    getDatabase({ dataDir: tmpDir, filename: 'test.db' });
    repo = new TrafficRepository();
    sessions = new SessionRepository();
    const session = await sessions.create({ name: 'test-session' });
    sessionId = session.id;
  });

  afterEach(async () => {
    closeDatabase();
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
    if (savedMax === undefined) delete process.env.NECTO_MAX_TRAFFIC;
    else process.env.NECTO_MAX_TRAFFIC = savedMax;
    if (savedBuf === undefined) delete process.env.NECTO_TRAFFIC_PRUNE_BUFFER;
    else process.env.NECTO_TRAFFIC_PRUNE_BUFFER = savedBuf;
  });

  describe('bodyCodec', () => {
    it('round-trips a large compressible body identically', () => {
      const body = Buffer.from('x'.repeat(100_000));
      const stored = encodeBody(body)!;
      // Should actually be compressed (marker 0x01) and much smaller.
      expect(stored[0]).toBe(0x01);
      expect(stored.length).toBeLessThan(body.length);
      expect(decodeBody(stored)!.equals(body)).toBe(true);
    });

    it('stores small bodies raw (marker 0x00) and round-trips', () => {
      const body = Buffer.from('hello');
      const stored = encodeBody(body)!;
      expect(stored[0]).toBe(0x00);
      expect(decodeBody(stored)!.equals(body)).toBe(true);
    });

    it('does not misread a raw body that itself starts with gzip magic bytes', () => {
      const body = Buffer.from([0x1f, 0x8b, 0x01, 0x02, 0x03]);
      const stored = encodeBody(body)!;
      expect(stored[0]).toBe(0x00); // raw marker
      expect(decodeBody(stored)!.equals(body)).toBe(true);
    });

    it('reads legacy unmarked rows as raw bytes', () => {
      const legacy = Buffer.from('legacy-body-no-marker');
      expect(decodeBody(legacy)!.equals(legacy)).toBe(true);
    });

    it('preserves null and empty bodies', () => {
      expect(encodeBody(null)).toBeNull();
      expect(decodeBody(null)).toBeNull();
      const empty = Buffer.alloc(0);
      const stored = encodeBody(empty)!;
      expect(decodeBody(stored)!.length).toBe(0);
    });
  });

  describe('create/read round-trip through SQLite', () => {
    it('round-trips a large body identically after compression', async () => {
      const requestBody = Buffer.from(JSON.stringify({ data: 'a'.repeat(50_000) }));
      const responseBody = Buffer.from('b'.repeat(80_000));
      const entry = makeEntry(sessionId, {
        requestBody,
        requestBodySize: requestBody.length,
        responseBody,
        responseBodySize: responseBody.length,
      });

      await repo.create(entry);
      const read = await repo.findById(entry.id);

      expect(read).not.toBeNull();
      expect(read!.requestBody!.equals(requestBody)).toBe(true);
      expect(read!.responseBody!.equals(responseBody)).toBe(true);
      // Sizes are the original (uncompressed) lengths.
      expect(read!.requestBodySize).toBe(requestBody.length);
      expect(read!.responseBodySize).toBe(responseBody.length);
    });

    it('round-trips empty and null bodies', async () => {
      const entry = makeEntry(sessionId, {
        requestBody: Buffer.alloc(0),
        requestBodySize: 0,
        responseBody: null,
        responseBodySize: null,
      });

      await repo.create(entry);
      const read = await repo.findById(entry.id);

      expect(read).not.toBeNull();
      expect(read!.requestBody!.length).toBe(0);
      expect(read!.responseBody).toBeNull();
    });

    it('applies compression on update() too', async () => {
      const entry = makeEntry(sessionId, { responseBody: null, responseBodySize: null });
      await repo.create(entry);

      const updated = Buffer.from('c'.repeat(60_000));
      await repo.update(entry.id, { responseBody: updated, responseBodySize: updated.length });

      const read = await repo.findById(entry.id);
      expect(read!.responseBody!.equals(updated)).toBe(true);
    });
  });

  describe('retention / pruning', () => {
    it('prunes oldest rows beyond the configured cap', async () => {
      process.env.NECTO_MAX_TRAFFIC = '5';
      process.env.NECTO_TRAFFIC_PRUNE_BUFFER = '0';

      const total = 20;
      const base = Date.now();
      for (let i = 0; i < total; i++) {
        await repo.create(
          makeEntry(sessionId, {
            timestamp: base + i * 1000,
            url: `http://example.com/${i}`,
            path: `/${i}`,
          })
        );
      }

      const remaining = await repo.findBySession(sessionId, 1000);
      expect(remaining.length).toBe(5);

      // The 5 newest (highest timestamps) should survive.
      const paths = remaining.map((r) => r.path).sort();
      expect(paths).toEqual(['/15', '/16', '/17', '/18', '/19']);
    });

    it('does not prune when under the cap', async () => {
      process.env.NECTO_MAX_TRAFFIC = '100';
      process.env.NECTO_TRAFFIC_PRUNE_BUFFER = '0';

      for (let i = 0; i < 10; i++) {
        await repo.create(makeEntry(sessionId, { timestamp: Date.now() + i }));
      }

      const remaining = await repo.findBySession(sessionId, 1000);
      expect(remaining.length).toBe(10);
    });
  });

  describe('searchGlobal body search (compressed blobs)', () => {
    it('finds a substring that appears only in a large compressed request body', async () => {
      // Large enough to be gzip-compressed on disk; the needle exists nowhere
      // in url/host/path/headers, only inside the body bytes.
      const needle = 'SECRET_NEEDLE_IN_REQUEST';
      const requestBody = Buffer.from('a'.repeat(50_000) + needle + 'b'.repeat(50_000));
      const entry = makeEntry(sessionId, {
        url: 'http://example.com/upload',
        path: '/upload',
        requestBody,
        requestBodySize: requestBody.length,
      });
      await repo.create(entry);

      // Sanity: it is actually stored compressed, not as plaintext.
      const stored = encodeBody(requestBody)!;
      expect(stored[0]).toBe(0x01);

      // Not requesting body -> should NOT match.
      const withoutBody = await repo.searchGlobal({ query: needle, searchIn: ['url'] });
      expect(withoutBody.total).toBe(0);
      expect(withoutBody.entries).toHaveLength(0);

      // Requesting body -> should match.
      const withBody = await repo.searchGlobal({ query: needle, searchIn: ['url', 'body'] });
      expect(withBody.total).toBe(1);
      expect(withBody.entries).toHaveLength(1);
      expect(withBody.entries[0].id).toBe(entry.id);
    });

    it('finds a substring that appears only in a large compressed response body', async () => {
      const needle = 'SECRET_NEEDLE_IN_RESPONSE';
      const responseBody = Buffer.from('x'.repeat(40_000) + needle + 'y'.repeat(40_000));
      const entry = makeEntry(sessionId, {
        url: 'http://example.com/download',
        path: '/download',
        responseBody,
        responseBodySize: responseBody.length,
      });
      await repo.create(entry);

      const result = await repo.searchGlobal({ query: needle, searchIn: ['body'] });
      expect(result.total).toBe(1);
      expect(result.entries[0].id).toBe(entry.id);
      expect(result.sessionNames[sessionId]).toBe('test-session');
    });

    it('body substring search is case-insensitive (mirrors SQL LIKE)', async () => {
      const responseBody = Buffer.from('z'.repeat(30_000) + 'MixedCaseToken' + 'z'.repeat(30_000));
      const entry = makeEntry(sessionId, {
        url: 'http://example.com/case',
        path: '/case',
        responseBody,
        responseBodySize: responseBody.length,
      });
      await repo.create(entry);

      const lower = await repo.searchGlobal({ query: 'mixedcasetoken', searchIn: ['body'] });
      expect(lower.total).toBe(1);
      expect(lower.entries[0].id).toBe(entry.id);

      const upper = await repo.searchGlobal({ query: 'MIXEDCASETOKEN', searchIn: ['body'] });
      expect(upper.total).toBe(1);
      expect(upper.entries[0].id).toBe(entry.id);
    });

    it('body search still honors method/status filters and url matches', async () => {
      const needle = 'FILTERED_NEEDLE';
      const body = Buffer.from('q'.repeat(30_000) + needle + 'q'.repeat(30_000));
      const getEntry = makeEntry(sessionId, {
        method: 'GET',
        status: 200,
        url: 'http://example.com/get',
        path: '/get',
        responseBody: body,
        responseBodySize: body.length,
      });
      const postEntry = makeEntry(sessionId, {
        method: 'POST',
        status: 500,
        url: 'http://example.com/post',
        path: '/post',
        responseBody: body,
        responseBodySize: body.length,
      });
      await repo.create(getEntry);
      await repo.create(postEntry);

      // Both bodies contain the needle, but restrict to POST only.
      const onlyPost = await repo.searchGlobal({
        query: needle,
        searchIn: ['body'],
        methods: ['POST'],
      });
      expect(onlyPost.total).toBe(1);
      expect(onlyPost.entries[0].id).toBe(postEntry.id);

      // A url-only match (needle absent from url) combined with body search
      // still returns via the body path for both rows.
      const both = await repo.searchGlobal({ query: needle, searchIn: ['url', 'body'] });
      expect(both.total).toBe(2);
    });
  });
});
