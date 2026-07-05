import { EventEmitter } from 'node:events';
import http from 'node:http';
import http2 from 'node:http2';
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';
import { URL } from 'node:url';
import zlib from 'node:zlib';
import { v4 as uuid } from 'uuid';
import { CertificateManager } from '@nectoproxy/certs';
import type { TrafficEntry, Rule, Breakpoint, BreakpointHit, BreakpointResume, WebSocketFrame, NetworkProfile, UpstreamProxyConfig } from '@nectoproxy/shared';
import { RuleEngine, type MatchContext, type RuleResult } from '../rules/index.js';
import { BreakpointManager } from '../breakpoints/index.js';
import { WebSocketHandler } from './WebSocketHandler.js';
import { ThrottleService } from '../services/ThrottleService.js';
import { UpstreamProxyAgent } from './UpstreamProxyAgent.js';

export interface ProxyServerConfig {
  port: number;
  host: string;
  maxBodySize: number;
  timeout: number;
  /**
   * Enable HTTP/2 MITM. When on, intercepted TLS connections negotiate ALPN and
   * h2 clients are handled over an HTTP/2 session (forwarded to origins over
   * HTTP/1.1). Off by default so the battle-tested h1 path is unchanged.
   */
  enableHttp2: boolean;
}

export interface ProxyContext {
  id: string;
  startTime: number;
  clientRequest: http.IncomingMessage;
  clientResponse: http.ServerResponse;
  serverRequest?: http.ClientRequest;
  serverResponse?: http.IncomingMessage;
  requestBody: Buffer | null;
  responseBody: Buffer | null;
  isHttps: boolean;
  host: string;
  port: number;
  path: string;
  error?: Error;
}

const DEFAULT_CONFIG: ProxyServerConfig = {
  port: 8888,
  host: '0.0.0.0',
  maxBodySize: 10 * 1024 * 1024, // 10MB
  timeout: 30000,
  enableHttp2: false,
};

/** Hostnames a proxied device can request to reach the CA-install page. */
const SETUP_HOSTS = new Set(['necto.setup', 'nectoproxy.local', 'necto.it']);

export class ProxyServer extends EventEmitter {
  private config: ProxyServerConfig;
  private certManager: CertificateManager;
  private server: http.Server | null = null;
  private activeConnections: Set<net.Socket> = new Set();
  private tlsServers: Map<string, tls.Server> = new Map();
  private sessionId: string = '';
  private ruleEngine: RuleEngine = new RuleEngine();
  private breakpointManager: BreakpointManager = new BreakpointManager();
  private webSocketHandler: WebSocketHandler = new WebSocketHandler();
  private throttleService: ThrottleService = new ThrottleService();
  private upstreamProxyAgent: UpstreamProxyAgent | null = null;
  private httpsAgent: https.Agent = new https.Agent({
    rejectUnauthorized: false,
    keepAlive: true,
    maxSockets: 256,
  });
  private sslPassthroughDomains: Set<string> = new Set();
  private dnsMappings: Map<string, string> = new Map();

  constructor(certManager: CertificateManager, config: Partial<ProxyServerConfig> = {}) {
    super();
    this.certManager = certManager;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  setRules(rules: Rule[]): void {
    this.ruleEngine.setRules(rules);
  }

  getRules(): Rule[] {
    return this.ruleEngine.getRules();
  }

  addRule(rule: Rule): void {
    this.ruleEngine.addRule(rule);
  }

  removeRule(id: string): void {
    this.ruleEngine.removeRule(id);
  }

  updateRule(id: string, updates: Partial<Rule>): void {
    this.ruleEngine.updateRule(id, updates);
  }

  // Breakpoint management methods
  setBreakpoints(breakpoints: Breakpoint[]): void {
    this.breakpointManager.setBreakpoints(breakpoints);
  }

  getBreakpoints(): Breakpoint[] {
    return this.breakpointManager.getBreakpoints();
  }

  addBreakpoint(breakpoint: Breakpoint): void {
    this.breakpointManager.addBreakpoint(breakpoint);
  }

  removeBreakpoint(id: string): void {
    this.breakpointManager.removeBreakpoint(id);
  }

  updateBreakpoint(id: string, updates: Partial<Breakpoint>): void {
    this.breakpointManager.updateBreakpoint(id, updates);
  }

  resumeBreakpoint(hitId: string, resume: BreakpointResume): void {
    this.breakpointManager.resume(hitId, resume);
  }

  getPendingBreakpointHits(): BreakpointHit[] {
    return this.breakpointManager.getPendingHits();
  }

  getBreakpointManager(): BreakpointManager {
    return this.breakpointManager;
  }

  // Network conditioning methods
  setNetworkProfile(profile: NetworkProfile | null): void {
    this.throttleService.setProfile(profile);
  }

  getNetworkProfile(): NetworkProfile | null {
    return this.throttleService.getProfile();
  }

  // Upstream proxy methods
  setUpstreamProxy(config: UpstreamProxyConfig | null): void {
    if (config && config.enabled) {
      this.upstreamProxyAgent = new UpstreamProxyAgent({ config });
    } else {
      this.upstreamProxyAgent = null;
    }
  }

  getUpstreamProxyConfig(): UpstreamProxyConfig | null {
    return this.upstreamProxyAgent?.getConfig() || null;
  }

  // SSL Passthrough methods
  setSslPassthroughDomains(domains: string[]): void {
    this.sslPassthroughDomains = new Set(domains);
  }

  isPassthroughDomain(hostname: string): boolean {
    if (this.sslPassthroughDomains.has(hostname)) {
      return true;
    }

    // Check wildcard matches (e.g., *.google.com matches www.google.com)
    for (const domain of this.sslPassthroughDomains) {
      if (domain.startsWith('*.')) {
        const suffix = domain.slice(2);
        if (hostname.endsWith(suffix) && hostname !== suffix) {
          return true;
        }
      }
    }

    return false;
  }

  // DNS Spoofing methods
  setDnsMappings(mappings: Array<{ domain: string; targetIp: string }>): void {
    this.dnsMappings.clear();
    for (const m of mappings) {
      this.dnsMappings.set(m.domain, m.targetIp);
    }
  }

  private resolveDns(hostname: string): string {
    // Check exact match
    const exact = this.dnsMappings.get(hostname);
    if (exact) return exact;

    // Check wildcard matches
    for (const [domain, ip] of this.dnsMappings) {
      if (domain.startsWith('*.')) {
        const suffix = domain.slice(2);
        if (hostname === suffix || hostname.endsWith('.' + suffix)) {
          return ip;
        }
      }
    }

    return hostname; // No mapping, use original
  }

  async start(sessionId: string): Promise<void> {
    this.sessionId = sessionId;

    this.server = http.createServer((req, res) => {
      this.handleHttpRequest(req, res);
    });

    this.server.on('connect', (req, socket, head) => {
      this.handleConnect(req, socket as net.Socket, head);
    });

    // Handle WebSocket upgrades for plain HTTP
    this.server.on('upgrade', (req, socket, head) => {
      this.handleWebSocketUpgrade(req, socket as net.Socket, head, false);
    });

    // Wire up WebSocket events
    this.setupWebSocketEvents();

    this.server.on('connection', (socket) => {
      this.activeConnections.add(socket);
      socket.once('close', () => {
        this.activeConnections.delete(socket);
      });
    });

    this.server.on('error', (err) => {
      this.emit('error', err);
    });

    return new Promise((resolve, reject) => {
      this.server!.listen(this.config.port, this.config.host, () => {
        this.emit('started', {
          port: this.config.port,
          host: this.config.host,
        });
        resolve();
      });

      this.server!.once('error', reject);
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      // Close all active connections
      for (const socket of this.activeConnections) {
        socket.destroy();
      }
      this.activeConnections.clear();

      // Close TLS servers
      for (const tlsServer of this.tlsServers.values()) {
        tlsServer.close();
      }
      this.tlsServers.clear();

      // Destroy shared HTTPS agent
      this.httpsAgent.destroy();

      if (this.server) {
        this.server.close(() => {
          this.emit('stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  private async handleHttpRequest(
    clientReq: http.IncomingMessage,
    clientRes: http.ServerResponse
  ): Promise<void> {
    const ctx = this.createContext(clientReq, clientRes, false);
    let isBreakpointed = false;

    // Device-setup magic host: a proxied device can browse to http://necto.setup
    // to install the CA, regardless of where the Web UI is bound (mitm.it-style).
    if (SETUP_HOSTS.has(ctx.host.toLowerCase())) {
      this.handleSetupRequest(ctx);
      return;
    }

    try {
      // Collect request body
      ctx.requestBody = await this.collectBody(clientReq, this.config.maxBodySize);

      // Evaluate rules before forwarding
      let matchCtx = this.createMatchContext(ctx);
      const ruleResult = await this.ruleEngine.evaluateRequest(matchCtx);

      // If rule handles the request completely (mock/block), send response directly
      if (ruleResult.handled && ruleResult.response) {
        this.emitTrafficNew(ctx, true); // isMocked = true

        // Apply delay if specified
        if (ruleResult.delay) {
          await this.delay(ruleResult.delay);
        }

        // Send the mock/blocked response
        this.sendRuleResponse(ctx, ruleResult.response);
        return;
      }

      // Apply request modifications if any
      if (ruleResult.modifiedRequest) {
        this.applyRequestModifications(ctx, ruleResult.modifiedRequest);
        matchCtx = this.createMatchContext(ctx); // Update match context
      }

      // Check for request breakpoints
      const breakpoint = this.breakpointManager.shouldBreak(matchCtx, 'request');
      if (breakpoint) {
        isBreakpointed = true;
        this.emitTrafficNew(ctx, false, true); // isBreakpointed = true

        const hit = this.breakpointManager.createBreakpointHit(
          breakpoint,
          ctx.id,
          'request',
          matchCtx
        );

        const resume = await this.breakpointManager.waitForResume(hit);

        // Handle breakpoint resume action
        if (resume.action === 'abort') {
          this.sendAbortResponse(ctx, 'Request aborted by breakpoint');
          return;
        }

        if (resume.action === 'mock' && resume.mockResponse) {
          this.sendMockResponse(ctx, resume.mockResponse);
          return;
        }

        // Apply request modifications from breakpoint
        if (resume.modifiedRequest) {
          this.applyBreakpointRequestModifications(ctx, resume.modifiedRequest);
          matchCtx = this.createMatchContext(ctx);
        }
      }

      // Emit traffic entry for request (if not already emitted for breakpoint)
      if (!isBreakpointed) {
        this.emitTrafficNew(ctx);
      }

      // Apply delay if specified
      if (ruleResult.delay) {
        await this.delay(ruleResult.delay);
      }

      // Apply network conditioning (request throttle)
      const requestSize = ctx.requestBody?.length || 0;
      const { dropped } = await this.throttleService.throttleRequest(requestSize);
      if (dropped) {
        this.sendDroppedResponse(ctx, 'Request dropped due to packet loss');
        return;
      }

      // Forward the request
      await this.forwardRequest(ctx, ruleResult);
    } catch (err) {
      ctx.error = err as Error;
      this.handleError(ctx, err as Error);
    }
  }

  private handleSetupRequest(ctx: ProxyContext): void {
    const res = ctx.clientResponse;
    const pathname = ctx.path.split('?')[0];

    try {
      if (pathname === '/mobileconfig') {
        const profile = this.certManager.getMobileConfig();
        res.writeHead(200, {
          'content-type': 'application/x-apple-aspen-config',
          'content-disposition': 'attachment; filename="nectoproxy-ca.mobileconfig"',
        });
        res.end(profile);
        return;
      }

      if (pathname === '/ca' || pathname === '/cert' || pathname === '/download') {
        const pem = this.certManager.getCACertificatePem();
        res.writeHead(200, {
          'content-type': 'application/x-x509-ca-cert',
          'content-disposition': 'attachment; filename="nectoproxy-ca.crt"',
        });
        res.end(pem);
        return;
      }

      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(this.buildSetupHtml());
    } catch (err) {
      res.writeHead(500, { 'content-type': 'text/plain' });
      res.end(`Setup error: ${(err as Error).message}`);
    }
  }

  private buildSetupHtml(): string {
    return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>NectoProxy - Install CA</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
max-width:600px;margin:0 auto;padding:24px;line-height:1.55;background:#0b0f17;color:#e6edf3}
@media(prefers-color-scheme:light){body{background:#f6f8fa;color:#1f2328}}
.card{border:1px solid rgba(128,128,128,.28);border-radius:14px;padding:18px;margin:14px 0;background:rgba(128,128,128,.06)}
a.btn{display:inline-block;margin-top:10px;padding:11px 18px;border-radius:10px;background:#2f81f7;color:#fff;text-decoration:none;font-weight:600}
h1{font-size:1.4rem}.note{font-size:.85rem;opacity:.7}</style></head><body>
<h1>NectoProxy - Device Setup</h1>
<p>Your device is routing through NectoProxy. Install the CA to inspect HTTPS traffic.</p>
<div class="card"><h2>iPhone / iPad</h2>
<p>Install the profile, then enable full trust under Settings &rarr; General &rarr; About &rarr; Certificate Trust Settings.</p>
<a class="btn" href="/mobileconfig">Install profile</a></div>
<div class="card"><h2>Android / Desktop</h2>
<p>Download the certificate and add it as a trusted CA in your system settings.</p>
<a class="btn" href="/download">Download certificate</a></div>
<p class="note">Only install this on devices you own. It lets NectoProxy decrypt this device's HTTPS traffic.</p>
</body></html>`;
  }

  private async handleConnect(
    req: http.IncomingMessage,
    socket: net.Socket,
    head: Buffer
  ): Promise<void> {
    const [host, portStr] = (req.url || '').split(':');
    const port = parseInt(portStr, 10) || 443;

    // Check if domain should bypass MITM interception
    if (this.isPassthroughDomain(host)) {
      const resolvedHost = this.resolveDns(host);
      const targetSocket = net.connect(port, resolvedHost, () => {
        socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
        targetSocket.pipe(socket);
        socket.pipe(targetSocket);
      });
      targetSocket.on('error', () => socket.destroy());
      socket.on('error', () => targetSocket.destroy());
      return;
    }

    try {
      // Get certificate for domain
      const domainCert = await this.certManager.getCertificateForDomain(host);

      // Acknowledge the CONNECT request
      socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');

      // When HTTP/2 is enabled, negotiate ALPN and let an http2 secure server
      // (with allowHTTP1) terminate TLS — it transparently handles both h2 and
      // h1 clients through the same request path.
      if (this.config.enableHttp2) {
        this.createHttp2Session(socket, head, domainCert.key, domainCert.cert, host, port);
        return;
      }

      // Create a TLS socket from the existing socket
      const tlsSocket = new tls.TLSSocket(socket, {
        key: domainCert.key,
        cert: domainCert.cert,
        isServer: true,
      });

      if (head.length > 0) {
        tlsSocket.unshift(head);
      }

      // Handle the TLS connection
      tlsSocket.on('error', (err) => {
        this.emit('tlsError', { host, port, error: err });
        tlsSocket.destroy();
      });

      // Process decrypted HTTP requests
      this.createHttpParser(tlsSocket, host, port);
    } catch (err) {
      this.emit('error', err);
      socket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n');
      socket.destroy();
    }
  }

  private createHttpParser(
    tlsSocket: tls.TLSSocket,
    host: string,
    port: number
  ): void {
    // Create a simple HTTP server to handle requests on the TLS socket
    const server = http.createServer((req, res) => {
      const ctx = this.createContextFromTls(req, res, tlsSocket, host, port);
      this.handleHttpsRequest(ctx);
    });

    // Handle WebSocket upgrades over HTTPS
    server.on('upgrade', (req, socket, head) => {
      this.handleWebSocketUpgrade(req, socket as net.Socket, head, true, host, port);
    });

    // Emit the socket to the server so it starts parsing HTTP from it
    server.emit('connection', tlsSocket);
  }

  private createHttp2Session(
    socket: net.Socket,
    head: Buffer,
    key: string,
    cert: string,
    host: string,
    port: number
  ): void {
    // allowHTTP1 lets the same server serve h1 clients that don't negotiate h2,
    // so enabling HTTP/2 never breaks a plain-h1 client.
    const server = http2.createSecureServer({
      key,
      cert,
      allowHTTP1: true,
    });

    server.on('error', (err) => {
      this.emit('tlsError', { host, port, error: err });
    });
    server.on('sessionError', (err) => {
      this.emit('tlsError', { host, port, error: err });
    });

    // The http2 compatibility layer fires 'request' for BOTH h2 streams and h1
    // requests, with req/res that are API-compatible with the h1 handler.
    server.on('request', (req, res) => {
      const ctx = this.createContextFromTls(
        req as unknown as http.IncomingMessage,
        res as unknown as http.ServerResponse,
        req.socket as tls.TLSSocket,
        host,
        port
      );
      // Setup magic host works over the intercepted connection too.
      if (SETUP_HOSTS.has(ctx.host.toLowerCase())) {
        this.handleSetupRequest(ctx);
        return;
      }
      this.handleHttpsRequest(ctx);
    });

    if (head.length > 0) {
      socket.unshift(head);
    }
    // http2.createSecureServer terminates TLS itself, so emit the raw socket.
    server.emit('connection', socket);
  }

  private createContext(
    clientReq: http.IncomingMessage,
    clientRes: http.ServerResponse,
    isHttps: boolean
  ): ProxyContext {
    const url = new URL(clientReq.url || '/', `http://${clientReq.headers.host}`);

    return {
      id: uuid(),
      startTime: Date.now(),
      clientRequest: clientReq,
      clientResponse: clientRes,
      requestBody: null,
      responseBody: null,
      isHttps,
      host: url.hostname,
      port: parseInt(url.port, 10) || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
    };
  }

  private createContextFromTls(
    clientReq: http.IncomingMessage,
    clientRes: http.ServerResponse,
    _tlsSocket: tls.TLSSocket,
    host: string,
    port: number
  ): ProxyContext {
    return {
      id: uuid(),
      startTime: Date.now(),
      clientRequest: clientReq,
      clientResponse: clientRes,
      requestBody: null,
      responseBody: null,
      isHttps: true,
      host,
      port,
      path: clientReq.url || '/',
    };
  }

  private async handleHttpsRequest(ctx: ProxyContext): Promise<void> {
    let isBreakpointed = false;

    try {
      // Collect request body
      ctx.requestBody = await this.collectBody(
        ctx.clientRequest,
        this.config.maxBodySize
      );

      // Evaluate rules before forwarding
      let matchCtx = this.createMatchContext(ctx);
      const ruleResult = await this.ruleEngine.evaluateRequest(matchCtx);

      // If rule handles the request completely (mock/block), send response directly
      if (ruleResult.handled && ruleResult.response) {
        this.emitTrafficNew(ctx, true); // isMocked = true

        // Apply delay if specified
        if (ruleResult.delay) {
          await this.delay(ruleResult.delay);
        }

        // Send the mock/blocked response
        this.sendRuleResponse(ctx, ruleResult.response);
        return;
      }

      // Apply request modifications if any
      if (ruleResult.modifiedRequest) {
        this.applyRequestModifications(ctx, ruleResult.modifiedRequest);
        matchCtx = this.createMatchContext(ctx); // Update match context
      }

      // Check for request breakpoints
      const breakpoint = this.breakpointManager.shouldBreak(matchCtx, 'request');
      if (breakpoint) {
        isBreakpointed = true;
        this.emitTrafficNew(ctx, false, true); // isBreakpointed = true

        const hit = this.breakpointManager.createBreakpointHit(
          breakpoint,
          ctx.id,
          'request',
          matchCtx
        );

        const resume = await this.breakpointManager.waitForResume(hit);

        // Handle breakpoint resume action
        if (resume.action === 'abort') {
          this.sendAbortResponse(ctx, 'Request aborted by breakpoint');
          return;
        }

        if (resume.action === 'mock' && resume.mockResponse) {
          this.sendMockResponse(ctx, resume.mockResponse);
          return;
        }

        // Apply request modifications from breakpoint
        if (resume.modifiedRequest) {
          this.applyBreakpointRequestModifications(ctx, resume.modifiedRequest);
          matchCtx = this.createMatchContext(ctx);
        }
      }

      // Emit traffic entry for request (if not already emitted for breakpoint)
      if (!isBreakpointed) {
        this.emitTrafficNew(ctx);
      }

      // Apply delay if specified
      if (ruleResult.delay) {
        await this.delay(ruleResult.delay);
      }

      // Apply network conditioning (request throttle)
      const requestSize = ctx.requestBody?.length || 0;
      const { dropped } = await this.throttleService.throttleRequest(requestSize);
      if (dropped) {
        this.sendDroppedResponse(ctx, 'Request dropped due to packet loss');
        return;
      }

      // Forward the request
      await this.forwardHttpsRequest(ctx, ruleResult);
    } catch (err) {
      ctx.error = err as Error;
      this.handleError(ctx, err as Error);
    }
  }

  private async forwardRequest(ctx: ProxyContext, ruleResult?: RuleResult): Promise<void> {
    // Derive the target from ctx (host/port/path), not clientRequest.url, so that
    // rules and breakpoints that rewrite the URL actually take effect on plain HTTP.
    const resolvedHostname = this.resolveDns(ctx.host);
    const headers = this.filterHeaders(ctx.clientRequest.headers);
    // Keep the Host header consistent with the (possibly rewritten) target.
    headers.host = ctx.port && ctx.port !== 80 ? `${ctx.host}:${ctx.port}` : ctx.host;

    const options: http.RequestOptions = {
      hostname: resolvedHostname,
      port: ctx.port || 80,
      path: ctx.path,
      method: ctx.clientRequest.method,
      headers,
      timeout: this.config.timeout,
    };

    // Use upstream proxy if configured and not bypassed
    if (this.upstreamProxyAgent && !this.upstreamProxyAgent.shouldBypass(ctx.host)) {
      const proxyConfig = this.upstreamProxyAgent.getConfig();
      if (proxyConfig.type === 'http' || proxyConfig.type === 'https') {
        // For an HTTP upstream proxy, use the absolute-form URI as the path.
        options.hostname = proxyConfig.host;
        options.port = proxyConfig.port;
        options.path = this.buildUrl(ctx);

        // Add proxy auth if configured
        if (proxyConfig.auth) {
          const auth = Buffer.from(
            `${proxyConfig.auth.username}:${proxyConfig.auth.password}`
          ).toString('base64');
          options.headers = {
            ...options.headers,
            'Proxy-Authorization': `Basic ${auth}`,
          };
        }
      }
    }

    return new Promise((resolve, reject) => {
      const proxyReq = http.request(options, (proxyRes) => {
        ctx.serverResponse = proxyRes;
        this.handleResponse(ctx, proxyRes, ruleResult).then(resolve).catch(reject);
      });

      proxyReq.on('error', reject);
      proxyReq.on('timeout', () => {
        proxyReq.destroy();
        reject(new Error('Request timeout'));
      });

      ctx.serverRequest = proxyReq;

      if (ctx.requestBody && ctx.requestBody.length > 0) {
        proxyReq.write(ctx.requestBody);
      }
      proxyReq.end();
    });
  }

  private async forwardHttpsRequest(ctx: ProxyContext, ruleResult?: RuleResult): Promise<void> {
    const resolvedHost = this.resolveDns(ctx.host);

    // Use upstream proxy if configured and not bypassed
    if (this.upstreamProxyAgent && !this.upstreamProxyAgent.shouldBypass(ctx.host)) {
      const options: http.RequestOptions = {
        hostname: resolvedHost,
        port: ctx.port,
        path: ctx.path,
        method: ctx.clientRequest.method,
        headers: this.filterHeaders(ctx.clientRequest.headers),
        timeout: this.config.timeout,
      };
      return this.forwardHttpsRequestThroughProxy(ctx, options, ruleResult);
    }

    return new Promise((resolve, reject) => {
      const proxyReq = https.request(
        {
          hostname: resolvedHost,
          port: ctx.port,
          path: ctx.path,
          method: ctx.clientRequest.method,
          headers: this.filterHeaders(ctx.clientRequest.headers),
          timeout: this.config.timeout,
          agent: this.httpsAgent,
          servername: ctx.host,
        },
        (proxyRes) => {
          ctx.serverResponse = proxyRes;
          this.handleResponse(ctx, proxyRes, ruleResult).then(resolve).catch(reject);
        }
      );

      proxyReq.on('error', reject);
      proxyReq.on('timeout', () => {
        proxyReq.destroy();
        reject(new Error('Request timeout'));
      });

      ctx.serverRequest = proxyReq;

      if (ctx.requestBody && ctx.requestBody.length > 0) {
        proxyReq.write(ctx.requestBody);
      }
      proxyReq.end();
    });
  }

  private async forwardHttpsRequestThroughProxy(
    ctx: ProxyContext,
    _options: http.RequestOptions,
    ruleResult?: RuleResult
  ): Promise<void> {
    if (!this.upstreamProxyAgent) {
      throw new Error('No upstream proxy configured');
    }

    // Create connection through the upstream proxy
    const socket = await this.upstreamProxyAgent.createConnection(
      ctx.host,
      ctx.port,
      true
    );

    // Wrap in TLS
    const tlsSocket = tls.connect({
      socket,
      host: ctx.host,
      servername: ctx.host,
      rejectUnauthorized: false,
    });

    return new Promise((resolve, reject) => {
      tlsSocket.on('secureConnect', () => {
        // Build the request manually
        let requestLine = `${ctx.clientRequest.method} ${ctx.path} HTTP/1.1\r\n`;
        const headers = this.filterHeaders(ctx.clientRequest.headers);
        headers.host = ctx.host;

        for (const [key, value] of Object.entries(headers)) {
          if (Array.isArray(value)) {
            for (const v of value) {
              requestLine += `${key}: ${v}\r\n`;
            }
          } else {
            requestLine += `${key}: ${value}\r\n`;
          }
        }
        requestLine += '\r\n';

        tlsSocket.write(requestLine);

        if (ctx.requestBody && ctx.requestBody.length > 0) {
          tlsSocket.write(ctx.requestBody);
        }

        // Parse the response
        let responseData = Buffer.alloc(0);
        let headersParsed = false;
        let statusCode = 0;
        let statusMessage = '';
        let responseHeaders: Record<string, string | string[]> = {};
        let bodyStart = 0;

        const parseHeaders = () => {
          const headerEnd = responseData.indexOf('\r\n\r\n');
          if (headerEnd === -1) return false;

          const headerText = responseData.slice(0, headerEnd).toString();
          const lines = headerText.split('\r\n');

          // Parse status line
          const statusLine = lines[0];
          const statusMatch = statusLine.match(/HTTP\/\d\.\d\s+(\d+)\s*(.*)/);
          if (statusMatch) {
            statusCode = parseInt(statusMatch[1], 10);
            statusMessage = statusMatch[2];
          }

          // Parse headers
          for (let i = 1; i < lines.length; i++) {
            const colonIdx = lines[i].indexOf(':');
            if (colonIdx > 0) {
              const key = lines[i].slice(0, colonIdx).toLowerCase();
              const value = lines[i].slice(colonIdx + 1).trim();
              if (responseHeaders[key]) {
                if (Array.isArray(responseHeaders[key])) {
                  (responseHeaders[key] as string[]).push(value);
                } else {
                  responseHeaders[key] = [responseHeaders[key] as string, value];
                }
              } else {
                responseHeaders[key] = value;
              }
            }
          }

          bodyStart = headerEnd + 4;
          return true;
        };

        tlsSocket.on('data', (chunk) => {
          responseData = Buffer.concat([responseData, chunk]);

          if (!headersParsed) {
            headersParsed = parseHeaders();
          }
        });

        tlsSocket.on('end', async () => {
          if (!headersParsed) {
            reject(new Error('Incomplete response'));
            return;
          }

          // Create a fake IncomingMessage-like response
          const fakeRes = {
            statusCode,
            statusMessage,
            headers: responseHeaders,
            on: (event: string, cb: Function) => {
              if (event === 'data') {
                cb(responseData.slice(bodyStart));
              } else if (event === 'end') {
                cb();
              }
            },
            removeListener: () => {},
          } as unknown as http.IncomingMessage;

          ctx.serverResponse = fakeRes;

          try {
            await this.handleResponse(ctx, fakeRes, ruleResult);
            resolve();
          } catch (err) {
            reject(err);
          }
        });

        tlsSocket.on('error', reject);
      });

      tlsSocket.on('error', reject);
    });
  }

  private async handleResponse(
    ctx: ProxyContext,
    proxyRes: http.IncomingMessage,
    _ruleResult?: RuleResult
  ): Promise<void> {
    // Server-Sent Events and other long-lived streams must be passed through in
    // real time — buffering until 'end' would hang them forever. Detect the
    // event-stream content type and switch to a streaming passthrough that tees
    // a capped copy of the bytes for the UI/log.
    const contentType = String(proxyRes.headers['content-type'] || '').toLowerCase();
    if (contentType.includes('text/event-stream')) {
      return this.streamResponse(ctx, proxyRes);
    }

    // Collect response body
    ctx.responseBody = await this.collectBody(proxyRes, this.config.maxBodySize);

    // Decompress if needed
    const decompressed = await this.decompressBody(
      ctx.responseBody,
      proxyRes.headers['content-encoding']
    );
    ctx.responseBody = decompressed;

    // Evaluate response modification rules
    const matchCtx = this.createMatchContext(ctx);
    let responseData = {
      status: proxyRes.statusCode || 200,
      statusText: proxyRes.statusMessage,
      headers: proxyRes.headers as Record<string, string | string[]>,
      body: ctx.responseBody,
    };
    const responseRuleResult = await this.ruleEngine.evaluateResponse(matchCtx, responseData);

    // Apply response modifications if any
    let status = proxyRes.statusCode || 200;
    let statusText = proxyRes.statusMessage;
    let responseBody = ctx.responseBody;
    let headers = this.filterHeaders(proxyRes.headers);

    if (responseRuleResult.modifiedResponse) {
      if (responseRuleResult.modifiedResponse.status !== undefined) {
        status = responseRuleResult.modifiedResponse.status;
      }
      if (responseRuleResult.modifiedResponse.statusText !== undefined) {
        statusText = responseRuleResult.modifiedResponse.statusText;
      }
      if (responseRuleResult.modifiedResponse.headers) {
        Object.assign(headers, responseRuleResult.modifiedResponse.headers);
      }
      if (responseRuleResult.modifiedResponse.body !== undefined) {
        responseBody = responseRuleResult.modifiedResponse.body;
        ctx.responseBody = responseBody;
      }
    }

    // Check for response breakpoints
    const breakpoint = this.breakpointManager.shouldBreak(matchCtx, 'response', {
      status,
      statusText,
      headers,
      body: responseBody,
      duration: Date.now() - ctx.startTime,
    });
    if (breakpoint) {
      // Emit breakpoint update
      this.emit('traffic:update', {
        id: ctx.id,
        isBreakpointed: true,
      });

      const hit = this.breakpointManager.createBreakpointHit(
        breakpoint,
        ctx.id,
        'response',
        matchCtx,
        { status, statusText, headers, body: responseBody }
      );

      const resume = await this.breakpointManager.waitForResume(hit);

      // Handle breakpoint resume action
      if (resume.action === 'abort') {
        this.sendAbortResponse(ctx, 'Response aborted by breakpoint');
        return;
      }

      if (resume.action === 'mock' && resume.mockResponse) {
        this.sendMockResponse(ctx, resume.mockResponse);
        return;
      }

      // Apply response modifications from breakpoint
      if (resume.modifiedResponse) {
        if (resume.modifiedResponse.status !== undefined) {
          status = resume.modifiedResponse.status;
        }
        if (resume.modifiedResponse.statusText !== undefined) {
          statusText = resume.modifiedResponse.statusText;
        }
        if (resume.modifiedResponse.headers) {
          headers = { ...headers, ...resume.modifiedResponse.headers };
        }
        if (resume.modifiedResponse.body !== undefined) {
          responseBody = typeof resume.modifiedResponse.body === 'string'
            ? Buffer.from(resume.modifiedResponse.body)
            : resume.modifiedResponse.body;
          ctx.responseBody = responseBody;
        }
      }
    }

    delete headers['content-encoding']; // We've already decompressed
    delete headers['transfer-encoding'];

    if (responseBody) {
      headers['content-length'] = String(responseBody.length);
    }

    // Apply network conditioning (response throttle)
    const responseSize = responseBody?.length || 0;
    const { dropped } = await this.throttleService.throttleResponse(responseSize);
    if (dropped) {
      this.sendDroppedResponse(ctx, 'Response dropped due to packet loss');
      return;
    }

    ctx.clientResponse.writeHead(status, statusText, headers);

    if (responseBody) {
      ctx.clientResponse.write(responseBody);
    }
    ctx.clientResponse.end();

    // Emit traffic update
    this.emitTrafficUpdate(ctx);
  }

  /**
   * Stream a long-lived response (e.g. Server-Sent Events) straight through to
   * the client as bytes arrive, while tee-ing a capped copy into ctx for the UI.
   * Response-modifying rules and response breakpoints do not apply to streams —
   * the body is unbounded, so there is nothing to buffer-and-rewrite.
   */
  private async streamResponse(
    ctx: ProxyContext,
    proxyRes: http.IncomingMessage
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const status = proxyRes.statusCode || 200;
      const statusText = proxyRes.statusMessage;
      const headers = this.filterHeaders(proxyRes.headers);
      // Let the connection chunk; a fixed content-length would truncate a stream.
      delete headers['content-length'];

      ctx.clientResponse.writeHead(status, statusText, headers);
      // Flush headers immediately so the client can start consuming events.
      if (typeof ctx.clientResponse.flushHeaders === 'function') {
        ctx.clientResponse.flushHeaders();
      }

      const chunks: Buffer[] = [];
      let collected = 0;
      let truncated = false;
      const cap = this.config.maxBodySize;

      proxyRes.on('data', (chunk: Buffer) => {
        // Real-time passthrough to the client.
        ctx.clientResponse.write(chunk);
        // Capped tee for the UI/log.
        if (collected < cap) {
          const remaining = cap - collected;
          chunks.push(chunk.length <= remaining ? chunk : chunk.subarray(0, remaining));
          if (chunk.length > remaining) truncated = true;
        } else {
          truncated = true;
        }
        collected += chunk.length;
      });

      proxyRes.on('end', () => {
        ctx.clientResponse.end();
        ctx.responseBody = chunks.length ? Buffer.concat(chunks) : null;
        if (truncated) {
          this.emit('bodyTruncated', { size: collected, maxSize: cap });
        }
        this.emitTrafficUpdate(ctx);
        resolve();
      });

      proxyRes.on('error', (err) => {
        ctx.clientResponse.destroy();
        reject(err);
      });

      // If the client goes away, tear down the upstream stream.
      ctx.clientResponse.on('close', () => {
        proxyRes.destroy();
      });
    });
  }

  private async collectBody(
    stream: http.IncomingMessage,
    maxSize: number
  ): Promise<Buffer | null> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      let totalSize = 0;
      let truncated = false;

      stream.on('data', (chunk: Buffer) => {
        totalSize += chunk.length;
        if (totalSize <= maxSize) {
          chunks.push(chunk);
        } else {
          truncated = true;
        }
      });

      stream.on('end', () => {
        if (chunks.length === 0) {
          resolve(null);
        } else {
          const body = Buffer.concat(chunks);
          if (truncated) {
            this.emit('bodyTruncated', { size: totalSize, maxSize });
          }
          resolve(body);
        }
      });

      stream.on('error', reject);
    });
  }

  private async decompressBody(
    body: Buffer | null,
    encoding: string | undefined
  ): Promise<Buffer | null> {
    if (!body || !encoding) {
      return body;
    }

    return new Promise((resolve) => {
      const normalizedEncoding = encoding.toLowerCase();

      if (normalizedEncoding === 'gzip') {
        zlib.gunzip(body, (err, result) => {
          if (err) {
            resolve(body); // Return original on error
          } else {
            resolve(result);
          }
        });
      } else if (normalizedEncoding === 'deflate') {
        zlib.inflate(body, (err, result) => {
          if (err) {
            zlib.inflateRaw(body, (err2, result2) => {
              if (err2) {
                resolve(body);
              } else {
                resolve(result2);
              }
            });
          } else {
            resolve(result);
          }
        });
      } else if (normalizedEncoding === 'br') {
        zlib.brotliDecompress(body, (err, result) => {
          if (err) {
            resolve(body);
          } else {
            resolve(result);
          }
        });
      } else {
        resolve(body);
      }
    });
  }

  private filterHeaders(
    headers: http.IncomingHttpHeaders
  ): Record<string, string | string[]> {
    const filtered: Record<string, string | string[]> = {};
    const hopByHopHeaders = [
      'connection',
      'keep-alive',
      'proxy-authenticate',
      'proxy-authorization',
      'te',
      'trailer',
      'transfer-encoding',
      'upgrade',
    ];

    for (const [key, value] of Object.entries(headers)) {
      // Drop HTTP/2 pseudo-headers (":method", ":path", ":scheme", ":authority")
      // — they are illegal as HTTP/1.1 header tokens when forwarding upstream.
      if (key.startsWith(':')) continue;
      if (!hopByHopHeaders.includes(key.toLowerCase()) && value !== undefined) {
        filtered[key] = value;
      }
    }

    return filtered;
  }

  private emitTrafficNew(ctx: ProxyContext, isMocked: boolean = false, isBreakpointed: boolean = false): void {
    const entry: TrafficEntry = {
      id: ctx.id,
      sessionId: this.sessionId,
      timestamp: ctx.startTime,
      method: ctx.clientRequest.method || 'GET',
      url: this.buildUrl(ctx),
      protocol: ctx.isHttps ? 'https' : 'http',
      host: ctx.host,
      path: ctx.path,
      requestHeaders: ctx.clientRequest.headers as Record<string, string | string[]>,
      requestBody: ctx.requestBody,
      requestBodySize: ctx.requestBody?.length || 0,
      status: null,
      statusText: null,
      responseHeaders: null,
      responseBody: null,
      responseBodySize: null,
      duration: null,
      remoteAddress: ctx.clientRequest.socket?.remoteAddress || null,
      tlsVersion: null,
      error: null,
      isComplete: false,
      isMocked,
      isBreakpointed,
      isTruncated: false,
    };

    this.emit('traffic:new', entry);
  }

  private emitTrafficUpdate(ctx: ProxyContext): void {
    const duration = Date.now() - ctx.startTime;

    const update: Partial<TrafficEntry> & { id: string } = {
      id: ctx.id,
      status: ctx.serverResponse?.statusCode || null,
      statusText: ctx.serverResponse?.statusMessage || null,
      responseHeaders: ctx.serverResponse?.headers as Record<string, string | string[]> || null,
      responseBody: ctx.responseBody,
      responseBodySize: ctx.responseBody?.length || null,
      duration,
      isComplete: true,
      error: ctx.error?.message || null,
    };

    this.emit('traffic:update', update);
  }

  private buildUrl(ctx: ProxyContext): string {
    const protocol = ctx.isHttps ? 'https' : 'http';
    const port =
      (ctx.isHttps && ctx.port === 443) || (!ctx.isHttps && ctx.port === 80)
        ? ''
        : `:${ctx.port}`;
    return `${protocol}://${ctx.host}${port}${ctx.path}`;
  }

  private handleError(ctx: ProxyContext, err: Error): void {
    this.emit('traffic:update', {
      id: ctx.id,
      status: 502,
      statusText: 'Bad Gateway',
      error: err.message,
      isComplete: true,
      duration: Date.now() - ctx.startTime,
    });

    if (!ctx.clientResponse.headersSent) {
      ctx.clientResponse.writeHead(502, 'Bad Gateway');
      ctx.clientResponse.end(`Proxy Error: ${err.message}`);
    }
  }

  getPort(): number {
    return this.config.port;
  }

  private createMatchContext(ctx: ProxyContext): MatchContext {
    return {
      url: this.buildUrl(ctx),
      method: ctx.clientRequest.method || 'GET',
      host: ctx.host,
      path: ctx.path,
      requestHeaders: ctx.clientRequest.headers as Record<string, string | string[]>,
      requestBody: ctx.requestBody,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private sendRuleResponse(
    ctx: ProxyContext,
    response: {
      status: number;
      statusText?: string;
      headers: Record<string, string>;
      body: Buffer | null;
    }
  ): void {
    const duration = Date.now() - ctx.startTime;

    // Set response body for traffic logging
    ctx.responseBody = response.body;

    // Send response headers
    const headers: Record<string, string | number> = { ...response.headers };
    if (response.body) {
      headers['content-length'] = response.body.length;
    }

    ctx.clientResponse.writeHead(response.status, response.statusText || 'OK', headers);

    // Send response body
    if (response.body) {
      ctx.clientResponse.write(response.body);
    }
    ctx.clientResponse.end();

    // Emit traffic update
    this.emit('traffic:update', {
      id: ctx.id,
      status: response.status,
      statusText: response.statusText || 'OK',
      responseHeaders: response.headers,
      responseBody: response.body,
      responseBodySize: response.body?.length || null,
      duration,
      isComplete: true,
      isMocked: true,
    });
  }

  private applyRequestModifications(
    ctx: ProxyContext,
    modifications: {
      url?: string;
      method?: string;
      headers?: Record<string, string | string[]>;
      body?: Buffer;
    }
  ): void {
    // Update URL-related context if URL was modified
    if (modifications.url) {
      const newUrl = new URL(modifications.url);
      ctx.host = newUrl.hostname;
      ctx.port = parseInt(newUrl.port, 10) || (newUrl.protocol === 'https:' ? 443 : 80);
      ctx.path = newUrl.pathname + newUrl.search;
      ctx.isHttps = newUrl.protocol === 'https:';
    }

    // Update headers on the original request object
    if (modifications.headers) {
      for (const [key, value] of Object.entries(modifications.headers)) {
        ctx.clientRequest.headers[key.toLowerCase()] = value;
      }
    }

    // Update request body
    if (modifications.body) {
      ctx.requestBody = modifications.body;
    }
  }

  private sendAbortResponse(ctx: ProxyContext, message: string): void {
    const duration = Date.now() - ctx.startTime;

    if (!ctx.clientResponse.headersSent) {
      ctx.clientResponse.writeHead(499, 'Client Closed Request');
      ctx.clientResponse.end(message);
    }

    this.emit('traffic:update', {
      id: ctx.id,
      status: 499,
      statusText: 'Client Closed Request',
      error: message,
      isComplete: true,
      isBreakpointed: false,
      duration,
    });
  }

  private sendDroppedResponse(ctx: ProxyContext, message: string): void {
    const duration = Date.now() - ctx.startTime;

    if (!ctx.clientResponse.headersSent) {
      ctx.clientResponse.writeHead(503, 'Service Unavailable');
      ctx.clientResponse.end(message);
    }

    this.emit('traffic:update', {
      id: ctx.id,
      status: 503,
      statusText: 'Service Unavailable',
      error: message,
      isComplete: true,
      duration,
    });
  }

  private sendMockResponse(
    ctx: ProxyContext,
    mockResponse: {
      status: number;
      statusText?: string;
      headers?: Record<string, string>;
      body?: string | Buffer;
    }
  ): void {
    const duration = Date.now() - ctx.startTime;
    const body = mockResponse.body
      ? typeof mockResponse.body === 'string'
        ? Buffer.from(mockResponse.body)
        : mockResponse.body
      : null;

    ctx.responseBody = body;

    const headers: Record<string, string | number> = { ...mockResponse.headers };
    if (body) {
      headers['content-length'] = body.length;
    }

    ctx.clientResponse.writeHead(
      mockResponse.status,
      mockResponse.statusText || 'OK',
      headers
    );

    if (body) {
      ctx.clientResponse.write(body);
    }
    ctx.clientResponse.end();

    this.emit('traffic:update', {
      id: ctx.id,
      status: mockResponse.status,
      statusText: mockResponse.statusText || 'OK',
      responseHeaders: mockResponse.headers || {},
      responseBody: body,
      responseBodySize: body?.length || null,
      duration,
      isComplete: true,
      isMocked: true,
      isBreakpointed: false,
    });
  }

  private applyBreakpointRequestModifications(
    ctx: ProxyContext,
    modifications: {
      method?: string;
      url?: string;
      headers?: Record<string, string>;
      body?: string | Buffer;
    }
  ): void {
    // Update method if modified
    if (modifications.method) {
      (ctx.clientRequest as { method: string }).method = modifications.method;
    }

    // Update URL-related context if URL was modified
    if (modifications.url) {
      const newUrl = new URL(modifications.url);
      ctx.host = newUrl.hostname;
      ctx.port = parseInt(newUrl.port, 10) || (newUrl.protocol === 'https:' ? 443 : 80);
      ctx.path = newUrl.pathname + newUrl.search;
      ctx.isHttps = newUrl.protocol === 'https:';
    }

    // Update headers on the original request object
    if (modifications.headers) {
      for (const [key, value] of Object.entries(modifications.headers)) {
        ctx.clientRequest.headers[key.toLowerCase()] = value;
      }
    }

    // Update request body
    if (modifications.body) {
      ctx.requestBody = typeof modifications.body === 'string'
        ? Buffer.from(modifications.body)
        : modifications.body;
    }
  }

  private setupWebSocketEvents(): void {
    this.webSocketHandler.on('websocket:open', (data) => {
      this.emit('websocket:open', {
        ...data,
        sessionId: this.sessionId,
      });
    });

    this.webSocketHandler.on('websocket:frame', (frame: WebSocketFrame) => {
      this.emit('websocket:frame', frame);
    });

    this.webSocketHandler.on('websocket:close', (data) => {
      this.emit('websocket:close', data);
    });

    this.webSocketHandler.on('websocket:error', (data) => {
      this.emit('websocket:error', data);
    });
  }

  private handleWebSocketUpgrade(
    req: http.IncomingMessage,
    socket: net.Socket,
    head: Buffer,
    isSecure: boolean,
    host?: string,
    port?: number
  ): void {
    // Determine host and port
    const targetHost = host || req.headers.host?.split(':')[0] || 'localhost';
    const targetPort = port || (isSecure ? 443 : parseInt(req.headers.host?.split(':')[1] || '80', 10));

    // Create a traffic entry for the WebSocket connection
    const trafficId = uuid();

    // Emit traffic entry for the WebSocket upgrade request
    const entry: TrafficEntry = {
      id: trafficId,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      method: req.method || 'GET',
      url: `${isSecure ? 'wss' : 'ws'}://${targetHost}:${targetPort}${req.url || '/'}`,
      protocol: isSecure ? 'wss' : 'ws',
      host: targetHost,
      path: req.url || '/',
      requestHeaders: req.headers as Record<string, string | string[]>,
      requestBody: null,
      requestBodySize: 0,
      status: 101,
      statusText: 'Switching Protocols',
      responseHeaders: null,
      responseBody: null,
      responseBodySize: null,
      duration: null,
      remoteAddress: req.socket?.remoteAddress || null,
      tlsVersion: null,
      error: null,
      isComplete: false,
      isMocked: false,
      isBreakpointed: false,
      isTruncated: false,
    };

    this.emit('traffic:new', entry);

    // Delegate to WebSocket handler
    this.webSocketHandler.handleUpgrade(
      req,
      socket,
      head,
      targetHost,
      targetPort,
      isSecure,
      trafficId
    );
  }

  isWebSocketUpgrade(req: http.IncomingMessage): boolean {
    const upgrade = req.headers.upgrade;
    return upgrade?.toLowerCase() === 'websocket';
  }

  getWebSocketHandler(): WebSocketHandler {
    return this.webSocketHandler;
  }
}
