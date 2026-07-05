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
});
