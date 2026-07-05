import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { createServer, type Server as HttpServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import crypto from 'node:crypto';
import path from 'node:path';
import type { CertificateManager } from '@nectoproxy/certs';
import { SocketServer } from './websocket/SocketServer.js';
import trafficRouter from './routes/traffic.js';
import sessionsRouter from './routes/sessions.js';
import settingsRouter from './routes/settings.js';
import websocketRouter from './routes/websocket.js';
import harRouter from './routes/har.js';
import snapshotRouter from './routes/snapshot.js';
import networkRouter from './routes/network.js';
import upstreamProxyRouter from './routes/upstream-proxy.js';
import { createRulesRouter } from './routes/rules.js';
import { createBreakpointsRouter } from './routes/breakpoints.js';
import { createCertificatesRouter } from './routes/certificates.js';
import sslPassthroughRouter from './routes/ssl-passthrough.js';
import dnsRouter from './routes/dns.js';
import annotationsRouter from './routes/annotations.js';
import { buildSetupPage } from './setupPage.js';

export interface AppConfig {
  port: number;
  host?: string;
  staticDir?: string;
  /**
   * Session token required to access the control-plane API and Socket.IO.
   * Generated once per CLI run.
   */
  token: string;
}

/**
 * Constant-time string comparison that first guards against length mismatch.
 */
function timingSafeStrEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf-8');
  const bb = Buffer.from(b, 'utf-8');
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/**
 * Extract a Host header hostname without its port (handles IPv6 brackets).
 */
function hostnameFromHeader(hostHeader: string): string {
  if (hostHeader.startsWith('[')) {
    const end = hostHeader.indexOf(']');
    return end === -1 ? hostHeader : hostHeader.slice(0, end + 1);
  }
  const colon = hostHeader.lastIndexOf(':');
  return colon === -1 ? hostHeader : hostHeader.slice(0, colon);
}

/**
 * Compute the set of Host header hostnames considered "local" / same-origin.
 */
function computeAllowedHostnames(configHost?: string): Set<string> {
  const allowed = new Set<string>([
    'localhost',
    '127.0.0.1',
    '[::1]',
    '::1',
    '0.0.0.0',
  ]);
  if (configHost) allowed.add(configHost);
  // Include this machine's own interface addresses so legitimate LAN clients
  // work when the UI is intentionally exposed (--ui-host 0.0.0.0 / a LAN IP).
  for (const nets of Object.values(networkInterfaces())) {
    for (const net of nets ?? []) {
      if (net.address) allowed.add(net.address);
    }
  }
  return allowed;
}

export interface AppInstance {
  app: Express;
  httpServer: HttpServer;
  socketServer: SocketServer;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

export function createApp(certManager: CertificateManager, config: AppConfig): AppInstance {
  const app = express();
  const httpServer = createServer(app);
  const allowedHostnames = computeAllowedHostnames(config.host);
  const socketServer = new SocketServer(httpServer, {
    token: config.token,
    allowedHostnames,
  });

  // Endpoints exempt from token auth so device setup / health checks still work.
  // Matched exactly (method + full path) — the rest of the certificates router
  // stays protected.
  const isAuthExempt = (req: Request): boolean => {
    if (req.method !== 'GET') return false;
    return (
      req.path === '/api/health' ||
      req.path === '/api/certificates/ca' ||
      req.path === '/api/certificates/download' ||
      req.path === '/api/certificates/mobileconfig'
    );
  };

  // Strict CORS: the SPA is served from the same origin, so no cross-origin
  // access is required. Disabling permissive CORS prevents other origins from
  // reading API responses.
  app.use(cors({ origin: false }));

  // DNS-rebinding protection: reject /api requests whose Host header is not one
  // of our known-local hostnames. This blocks a malicious website from using
  // DNS rebinding to reach the local control plane.
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!req.path.startsWith('/api')) return next();
    const hostHeader = req.headers.host;
    if (!hostHeader) {
      res.status(403).json({ error: 'Forbidden: missing Host header' });
      return;
    }
    const hostname = hostnameFromHeader(hostHeader);
    if (!allowedHostnames.has(hostname)) {
      res.status(403).json({ error: 'Forbidden: invalid Host header' });
      return;
    }
    next();
  });

  // Token auth: require the session token on all /api routes (except exemptions).
  // Accept it via `Authorization: Bearer <token>` or `?token=<token>`.
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!req.path.startsWith('/api')) return next();
    if (isAuthExempt(req)) return next();

    let provided: string | null = null;
    const authHeader = req.headers.authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      provided = authHeader.slice('Bearer '.length).trim();
    } else if (typeof req.query.token === 'string') {
      provided = req.query.token;
    }

    if (!provided || !timingSafeStrEqual(provided, config.token)) {
      res.status(401).json({ error: 'Unauthorized: missing or invalid token' });
      return;
    }
    next();
  });

  // Middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true }));

  // API routes
  app.use('/api/traffic', trafficRouter);
  app.use('/api/sessions', sessionsRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/websocket', websocketRouter);
  app.use('/api/har', harRouter);
  app.use('/api/snapshot', snapshotRouter);
  app.use('/api/network', networkRouter);
  app.use('/api/upstream-proxy', upstreamProxyRouter);
  app.use('/api/rules', createRulesRouter(socketServer));
  app.use('/api/breakpoints', createBreakpointsRouter());
  app.use('/api/certificates', createCertificatesRouter(certManager));
  app.use('/api/ssl-passthrough', sslPassthroughRouter);
  app.use('/api/dns', dnsRouter);
  app.use('/api/annotations', annotationsRouter);

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: Date.now(),
      connectedClients: socketServer.getConnectedClients(),
    });
  });

  // Token-free device-setup landing page (for phones scanning the CLI's QR code).
  app.get('/setup', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(buildSetupPage());
  });

  // Serve static files for Web UI
  if (config.staticDir) {
    const indexPath = path.join(config.staticDir, 'index.html');
    const tokenScript = `<script>window.__NECTO_TOKEN__=${JSON.stringify(config.token)};</script>`;

    // Inject the session token into index.html on the fly (never mutate on disk),
    // so the SPA can authenticate its API/Socket.IO requests.
    const sendIndexWithToken = (_req: Request, res: Response) => {
      try {
        let html = readFileSync(indexPath, 'utf-8');
        html = html.includes('</head>')
          ? html.replace('</head>', `${tokenScript}</head>`)
          : `${tokenScript}${html}`;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
      } catch {
        res.status(500).send('Failed to load UI');
      }
    };

    // Serve assets, but not index.html directly — we always inject the token.
    app.use(express.static(config.staticDir, { index: false }));

    // SPA fallback (and root) — serve the token-injected index.html.
    app.get('*', sendIndexWithToken);
  }

  return {
    app,
    httpServer,
    socketServer,
    start: () => {
      return new Promise((resolve, reject) => {
        httpServer.listen(config.port, config.host ?? '0.0.0.0', () => {
          console.log(`Server listening on ${config.host ?? '0.0.0.0'}:${config.port}`);
          resolve();
        });
        httpServer.once('error', reject);
      });
    },
    stop: () => {
      return new Promise((resolve) => {
        socketServer.close();
        httpServer.close(() => {
          resolve();
        });
      });
    },
  };
}
