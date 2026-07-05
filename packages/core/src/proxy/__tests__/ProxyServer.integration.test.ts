import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import https from 'node:https';
import http2 from 'node:http2';
import net from 'node:net';
import tls from 'node:tls';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { AddressInfo } from 'node:net';
import { WebSocketServer, WebSocket } from 'ws';
import { CertificateManager } from '@nectoproxy/certs';
import type { Rule, Breakpoint, TrafficEntry } from '@nectoproxy/shared';
import { ProxyServer } from '../ProxyServer.js';

/**
 * End-to-end integration tests: real ProxyServer instances with real origin
 * servers, driving traffic through the proxy the way a client would (absolute
 * form for HTTP, CONNECT + TLS for HTTPS/h2). Origin certs are minted by the
 * proxy's own CertificateManager so no openssl dependency is needed.
 */

let certManager: CertificateManager;
let originCert: { key: string; cert: string };

// Origins
let httpOrigin: http.Server;
let httpsOrigin: https.Server;
let h2Origin: http2.Http2SecureServer;
let wsOrigin: WebSocketServer;
let httpPort = 0;
let httpsPort = 0;
let h2Port = 0;
let wsPort = 0;

// Proxies
let proxyH1: ProxyServer;
let proxyH2: ProxyServer;
const PROXY_H1_PORT = 18991;
const PROXY_H2_PORT = 18992;

// Captured traffic from both proxies
const captured: TrafficEntry[] = [];
const updates: Array<Partial<TrafficEntry> & { id: string }> = [];

function port(server: http.Server | https.Server | http2.Http2SecureServer): number {
  return (server.address() as AddressInfo).port;
}

function httpOriginHandler(req: http.IncomingMessage, res: http.ServerResponse): void {
  const url = req.url || '/';
  if (url.startsWith('/sse')) {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' });
    res.write('data: one\n\n');
    setTimeout(() => res.write('data: two\n\n'), 30);
    setTimeout(() => {
      res.write('data: three\n\n');
      res.end();
    }, 60);
    return;
  }
  const chunks: Buffer[] = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const body = Buffer.concat(chunks);
    res.writeHead(200, { 'content-type': 'text/plain', 'x-origin': 'http' });
    res.end(`HTTP:${req.method}:${url}:${body.toString()}`);
  });
}

function httpsOriginHandler(req: http.IncomingMessage, res: http.ServerResponse): void {
  const chunks: Buffer[] = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    res.writeHead(200, { 'content-type': 'text/plain', 'x-origin': 'https' });
    res.end(`HTTPS:${req.method}:${req.url}:${Buffer.concat(chunks).toString()}`);
  });
}

beforeAll(async () => {
  const certsDir = path.join(os.tmpdir(), `necto-itest-${process.pid}-${Date.now()}`);
  fs.mkdirSync(certsDir, { recursive: true });
  certManager = new CertificateManager({ certsDir });
  await certManager.initialize();
  originCert = await certManager.getCertificateForDomain('localhost');

  // HTTP origin
  httpOrigin = http.createServer(httpOriginHandler);
  await new Promise<void>((r) => httpOrigin.listen(0, '127.0.0.1', r));
  httpPort = port(httpOrigin);

  // HTTPS (h1) origin
  httpsOrigin = https.createServer({ key: originCert.key, cert: originCert.cert }, httpsOriginHandler);
  await new Promise<void>((r) => httpsOrigin.listen(0, '127.0.0.1', r));
  httpsPort = port(httpsOrigin);

  // HTTP/2 origin (allowHTTP1 so the proxy's h1-downgrade for non-gRPC works;
  // gRPC is forwarded over h2 and echoes body + grpc-status trailers).
  h2Origin = http2.createSecureServer({ key: originCert.key, cert: originCert.cert, allowHTTP1: true });
  h2Origin.on('request', (req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      const isGrpc = String(req.headers['content-type'] || '').startsWith('application/grpc');
      res.writeHead(200, {
        'content-type': isGrpc ? 'application/grpc' : 'text/plain',
        'x-origin': 'h2',
      });
      res.write(body.length ? body : Buffer.from('H2ECHO'));
      if (isGrpc) {
        res.addTrailers({ 'grpc-status': '0', 'grpc-message': 'ok' });
      }
      res.end();
    });
  });
  await new Promise<void>((r) => h2Origin.listen(0, '127.0.0.1', r));
  h2Port = port(h2Origin);

  // WebSocket echo origin
  const wsHttp = http.createServer();
  wsOrigin = new WebSocketServer({ server: wsHttp });
  wsOrigin.on('connection', (sock) => {
    sock.on('message', (data, isBinary) => sock.send(data, { binary: isBinary }));
  });
  await new Promise<void>((r) => wsHttp.listen(0, '127.0.0.1', r));
  wsPort = (wsHttp.address() as AddressInfo).port;

  // Proxies
  proxyH1 = new ProxyServer(certManager, { port: PROXY_H1_PORT, host: '127.0.0.1' });
  proxyH2 = new ProxyServer(certManager, { port: PROXY_H2_PORT, host: '127.0.0.1', enableHttp2: true });
  for (const p of [proxyH1, proxyH2]) {
    p.on('traffic:new', (e: TrafficEntry) => captured.push(e));
    p.on('traffic:update', (u: Partial<TrafficEntry> & { id: string }) => updates.push(u));
  }
  await proxyH1.start('itest-session');
  await proxyH2.start('itest-session');
});

afterAll(async () => {
  await Promise.allSettled([proxyH1?.stop(), proxyH2?.stop()]);
  httpOrigin?.close();
  httpsOrigin?.close();
  h2Origin?.close();
  wsOrigin?.close();
});

// ---- helpers ----

function httpThroughProxy(
  proxyPort: number,
  target: string,
  opts: { method?: string; headers?: Record<string, string>; body?: string } = {}
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: Buffer }> {
  const u = new URL(target);
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port: proxyPort,
        method: opts.method || 'GET',
        path: target,
        headers: { host: u.host, ...(opts.headers || {}) },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode || 0, headers: res.headers, body: Buffer.concat(chunks) }));
      }
    );
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

function connectTunnel(proxyPort: number, host: string, targetPort: number): Promise<net.Socket> {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: proxyPort, method: 'CONNECT', path: `${host}:${targetPort}` });
    req.on('connect', (res, socket) => {
      if (res.statusCode !== 200) return reject(new Error(`CONNECT failed: ${res.statusCode}`));
      resolve(socket);
    });
    req.on('error', reject);
    req.end();
  });
}

async function httpsThroughProxy(
  proxyPort: number,
  opts: { host: string; targetPort: number; path: string; method?: string; headers?: Record<string, string>; body?: string }
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: Buffer }> {
  const socket = await connectTunnel(proxyPort, opts.host, opts.targetPort);
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host: opts.host,
        port: opts.targetPort,
        path: opts.path,
        method: opts.method || 'GET',
        headers: opts.headers || {},
        // The proxy MITMs with a CA-signed leaf; this test exercises proxy
        // behavior, not chain validation (browsers trust the installed CA).
        rejectUnauthorized: false,
        createConnection: () => tls.connect({ socket, servername: opts.host, rejectUnauthorized: false, ALPNProtocols: ['http/1.1'] }) as unknown as net.Socket,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode || 0, headers: res.headers, body: Buffer.concat(chunks) }));
      }
    );
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

async function h2ThroughProxy(
  proxyPort: number,
  opts: { host: string; targetPort: number; path: string; method?: string; headers?: Record<string, string>; body?: string }
): Promise<{ status: number; headers: Record<string, unknown>; trailers: Record<string, unknown>; body: Buffer }> {
  const socket = await connectTunnel(proxyPort, opts.host, opts.targetPort);
  const tlsSock = tls.connect({ socket, servername: opts.host, rejectUnauthorized: false, ALPNProtocols: ['h2'] });
  await new Promise<void>((res, rej) => {
    tlsSock.once('secureConnect', () => res());
    tlsSock.once('error', rej);
  });
  const client = http2.connect(`https://${opts.host}:${opts.targetPort}`, { createConnection: () => tlsSock as unknown as net.Socket });
  return new Promise((resolve, reject) => {
    client.on('error', reject);
    const req = client.request({ ':method': opts.method || 'GET', ':path': opts.path, ...(opts.headers || {}) });
    let status = 0;
    let headers: Record<string, unknown> = {};
    let trailers: Record<string, unknown> = {};
    const chunks: Buffer[] = [];
    req.on('response', (h) => {
      headers = h as Record<string, unknown>;
      status = Number(h[':status']) || 0;
    });
    req.on('trailers', (t) => {
      trailers = t as Record<string, unknown>;
    });
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      client.close();
      resolve({ status, headers, trailers, body: Buffer.concat(chunks) });
    });
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

function findEntry(pred: (e: TrafficEntry) => boolean): TrafficEntry | undefined {
  return captured.find(pred);
}

// ---- tests ----

describe('ProxyServer integration — HTTP/1.1', () => {
  it('forwards a plain HTTP GET and captures it', async () => {
    const res = await httpThroughProxy(PROXY_H1_PORT, `http://localhost:${httpPort}/hello`);
    expect(res.status).toBe(200);
    expect(res.body.toString()).toBe('HTTP:GET:/hello:');
    expect(res.headers['x-origin']).toBe('http');
    const entry = findEntry((e) => e.url.includes('/hello') && e.protocol === 'http');
    expect(entry).toBeTruthy();
  });

  it('forwards a POST body to the origin', async () => {
    const res = await httpThroughProxy(PROXY_H1_PORT, `http://localhost:${httpPort}/echo`, {
      method: 'POST',
      body: 'payload123',
    });
    expect(res.body.toString()).toBe('HTTP:POST:/echo:payload123');
  });

  it('streams a Server-Sent Events response through without buffering it away', async () => {
    const res = await httpThroughProxy(PROXY_H1_PORT, `http://localhost:${httpPort}/sse`);
    expect(res.status).toBe(200);
    expect(String(res.headers['content-type'])).toContain('text/event-stream');
    const body = res.body.toString();
    expect(body).toContain('data: one');
    expect(body).toContain('data: two');
    expect(body).toContain('data: three');
    // A streamed response must not carry a fixed content-length.
    expect(res.headers['content-length']).toBeUndefined();
  });
});

describe('ProxyServer integration — rules', () => {
  it('mock rule returns a canned response without hitting the origin', async () => {
    const rule: Rule = {
      id: 'r-mock',
      name: 'mock',
      enabled: true,
      priority: 1,
      match: { path: '/mocked' },
      action: 'mock',
      config: { status: 201, body: 'MOCKED', headers: { 'x-mock': '1' } },
      createdAt: 0,
      updatedAt: 0,
    };
    proxyH1.setRules([rule]);
    const res = await httpThroughProxy(PROXY_H1_PORT, `http://localhost:${httpPort}/mocked`);
    proxyH1.setRules([]);
    expect(res.status).toBe(201);
    expect(res.body.toString()).toBe('MOCKED');
    expect(res.headers['x-mock']).toBe('1');
  });

  it('block rule rejects the request', async () => {
    const rule: Rule = {
      id: 'r-block',
      name: 'block',
      enabled: true,
      priority: 1,
      match: { path: '/blocked' },
      action: 'block',
      config: null,
      createdAt: 0,
      updatedAt: 0,
    };
    proxyH1.setRules([rule]);
    const res = await httpThroughProxy(PROXY_H1_PORT, `http://localhost:${httpPort}/blocked`);
    proxyH1.setRules([]);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('modify-response rewrites status and body', async () => {
    const rule: Rule = {
      id: 'r-mod',
      name: 'mod',
      enabled: true,
      priority: 1,
      match: { path: '/modme' },
      action: 'modify-response',
      config: { setStatus: 418, replaceBody: 'TEAPOT', setHeaders: { 'x-modified': 'yes' } },
      createdAt: 0,
      updatedAt: 0,
    };
    proxyH1.setRules([rule]);
    const res = await httpThroughProxy(PROXY_H1_PORT, `http://localhost:${httpPort}/modme`);
    proxyH1.setRules([]);
    expect(res.status).toBe(418);
    expect(res.body.toString()).toBe('TEAPOT');
    expect(res.headers['x-modified']).toBe('yes');
  });
});

describe('ProxyServer integration — network conditioning & breakpoints', () => {
  it('delay rule adds latency before the response', async () => {
    const rule: Rule = {
      id: 'r-delay',
      name: 'delay',
      enabled: true,
      priority: 1,
      match: { path: '/delayme' },
      action: 'delay',
      config: { delay: 150 },
      createdAt: 0,
      updatedAt: 0,
    };
    proxyH1.setRules([rule]);
    const started = performance.now();
    const res = await httpThroughProxy(PROXY_H1_PORT, `http://localhost:${httpPort}/delayme`);
    const elapsed = performance.now() - started;
    proxyH1.setRules([]);
    expect(res.status).toBe(200);
    expect(elapsed).toBeGreaterThanOrEqual(140);
  });

  it('a request breakpoint pauses then resumes on continue', async () => {
    const bp: Breakpoint = {
      id: 'bp-1',
      name: 'bp',
      enabled: true,
      type: 'request',
      match: { path: '/breakme' },
      createdAt: 0,
    };
    let hitFired = false;
    const mgr = proxyH1.getBreakpointManager();
    const onHit = (hit: { id: string }) => {
      hitFired = true;
      // Resume immediately so the request proceeds to the origin.
      proxyH1.resumeBreakpoint(hit.id, { id: hit.id, action: 'continue' });
    };
    mgr.on('breakpoint:hit', onHit);
    proxyH1.setBreakpoints([bp]);

    const res = await httpThroughProxy(PROXY_H1_PORT, `http://localhost:${httpPort}/breakme`);

    proxyH1.setBreakpoints([]);
    mgr.off('breakpoint:hit', onHit);
    expect(hitFired).toBe(true);
    expect(res.status).toBe(200);
    expect(res.body.toString()).toBe('HTTP:GET:/breakme:');
  });
});

describe('ProxyServer integration — HTTPS MITM', () => {
  it('intercepts an HTTPS request and records the TLS version', async () => {
    const res = await httpsThroughProxy(PROXY_H1_PORT, { host: 'localhost', targetPort: httpsPort, path: '/secure' });
    expect(res.status).toBe(200);
    expect(res.body.toString()).toBe('HTTPS:GET:/secure:');
    const entry = findEntry((e) => e.url.includes('/secure') && e.protocol === 'https');
    expect(entry).toBeTruthy();
    expect(entry?.tlsVersion).toMatch(/TLSv1\.[23]/);
  });
});

describe('ProxyServer integration — HTTP/2 & gRPC', () => {
  it('intercepts an HTTP/2 request end-to-end', async () => {
    const res = await h2ThroughProxy(PROXY_H2_PORT, { host: 'localhost', targetPort: h2Port, path: '/h2get' });
    expect(res.status).toBe(200);
    expect(res.headers['x-origin']).toBe('h2');
    expect(res.body.toString()).toBe('H2ECHO');
  });

  it('forwards gRPC over HTTP/2 and relays trailers (grpc-status)', async () => {
    const res = await h2ThroughProxy(PROXY_H2_PORT, {
      host: 'localhost',
      targetPort: h2Port,
      path: '/pkg.Svc/Method',
      method: 'POST',
      headers: { 'content-type': 'application/grpc', te: 'trailers' },
      body: 'GRPCBODY',
    });
    expect(res.status).toBe(200);
    expect(res.body.toString()).toBe('GRPCBODY');
    expect(res.trailers['grpc-status']).toBe('0');
    expect(res.trailers['grpc-message']).toBe('ok');
  });
});

describe('ProxyServer integration — WebSocket frame injection', () => {
  function nextMessage(ws: WebSocket, timeoutMs = 3000): Promise<string> {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('timeout waiting for ws message')), timeoutMs);
      ws.once('message', (data: Buffer) => {
        clearTimeout(t);
        resolve(data.toString());
      });
    });
  }

  it('bridges a WebSocket and injects frames to server and to client', async () => {
    // Route the ws client through the proxy: the proxy targets the origin from
    // the Host header of the upgrade request.
    const client = new WebSocket(`ws://127.0.0.1:${PROXY_H1_PORT}/`, {
      headers: { host: `127.0.0.1:${wsPort}` },
    });
    await new Promise<void>((resolve, reject) => {
      client.once('open', () => resolve());
      client.once('error', reject);
    });
    // The proxy accepts the client upgrade before the upstream bridge finishes
    // connecting; give the upstream a moment so early frames aren't dropped.
    await new Promise((r) => setTimeout(r, 300));

    const wsEntry = captured.find((e) => e.protocol === 'ws');
    expect(wsEntry).toBeTruthy();
    const trafficId = wsEntry!.id;
    const handler = proxyH1.getWebSocketHandler();

    // Baseline: a client message is echoed by the origin.
    const echoP = nextMessage(client);
    client.send('hello');
    expect(await echoP).toBe('hello');

    // Inject a frame TO THE SERVER — the origin echoes it back to the client.
    const toServerP = nextMessage(client);
    expect(handler.sendFrame(trafficId, 'to-server', 'FROM_INJECT')).toBe(true);
    expect(await toServerP).toBe('FROM_INJECT');

    // Inject a frame TO THE CLIENT — delivered directly, without the origin.
    const toClientP = nextMessage(client);
    expect(handler.sendFrame(trafficId, 'to-client', 'DIRECT_TO_CLIENT')).toBe(true);
    expect(await toClientP).toBe('DIRECT_TO_CLIENT');

    // Unknown connection id returns false.
    expect(handler.sendFrame('no-such-id', 'to-server', 'x')).toBe(false);

    client.close();
  });
});
