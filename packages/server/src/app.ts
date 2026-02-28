import express, { type Express } from 'express';
import cors from 'cors';
import { createServer, type Server as HttpServer } from 'node:http';
import path from 'node:path';
import type { CertificateManager } from '@proxyscope/certs';
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

export interface AppConfig {
  port: number;
  staticDir?: string;
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
  const socketServer = new SocketServer(httpServer);

  // Middleware
  app.use(cors());
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

  // Serve static files for Web UI
  if (config.staticDir) {
    app.use(express.static(config.staticDir));

    // SPA fallback
    app.get('*', (_req, res) => {
      res.sendFile(path.join(config.staticDir!, 'index.html'));
    });
  }

  return {
    app,
    httpServer,
    socketServer,
    start: () => {
      return new Promise((resolve, reject) => {
        httpServer.listen(config.port, () => {
          console.log(`Server listening on port ${config.port}`);
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
