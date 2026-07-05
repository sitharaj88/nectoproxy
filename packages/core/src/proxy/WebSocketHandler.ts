import { EventEmitter } from 'node:events';
import { IncomingMessage } from 'node:http';
import net from 'node:net';
import { v4 as uuid } from 'uuid';
import WebSocket, { WebSocketServer, RawData } from 'ws';
import type { WebSocketFrame } from '@nectoproxy/shared';

export interface WebSocketContext {
  id: string;
  trafficId: string;
  host: string;
  port: number;
  path: string;
  isSecure: boolean;
  requestHeaders: Record<string, string | string[]>;
  startTime: number;
  clientSocket: net.Socket;
  serverSocket?: WebSocket;
  clientWebSocket?: WebSocket;
  frameCount: number;
}

export class WebSocketHandler extends EventEmitter {
  private activeConnections: Map<string, WebSocketContext> = new Map();

  handleUpgrade(
    req: IncomingMessage,
    socket: net.Socket,
    head: Buffer,
    host: string,
    port: number,
    isSecure: boolean,
    trafficId: string
  ): void {
    const ctx: WebSocketContext = {
      id: uuid(),
      trafficId,
      host,
      port,
      path: req.url || '/',
      isSecure,
      requestHeaders: req.headers as Record<string, string | string[]>,
      startTime: Date.now(),
      clientSocket: socket,
      frameCount: 0,
    };

    this.activeConnections.set(ctx.id, ctx);

    // Build upstream WebSocket URL
    const protocol = isSecure ? 'wss' : 'ws';
    const targetUrl = `${protocol}://${host}:${port}${ctx.path}`;

    // Prepare headers for upstream connection (filter out hop-by-hop headers)
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      const lowerKey = key.toLowerCase();
      // Skip WebSocket protocol-specific headers and hop-by-hop headers
      if (
        lowerKey !== 'upgrade' &&
        lowerKey !== 'connection' &&
        lowerKey !== 'sec-websocket-key' &&
        lowerKey !== 'sec-websocket-version' &&
        lowerKey !== 'sec-websocket-extensions' &&
        lowerKey !== 'host' &&
        value
      ) {
        headers[key] = Array.isArray(value) ? value.join(', ') : value;
      }
    }

    // Connect to upstream WebSocket server
    const serverWs = new WebSocket(targetUrl, {
      headers,
      rejectUnauthorized: false, // Allow self-signed certs on upstream
    });

    ctx.serverSocket = serverWs;

    // Create client WebSocket server
    const wss = new WebSocketServer({ noServer: true });

    wss.handleUpgrade(req, socket, head, (clientWs: WebSocket) => {
      ctx.clientWebSocket = clientWs;

      this.emit('websocket:open', {
        trafficId,
        id: ctx.id,
        url: targetUrl,
        timestamp: Date.now(),
      });

      // Server -> Client messages
      serverWs.on('message', (data: RawData, isBinary: boolean) => {
        ctx.frameCount++;
        const buffer = data instanceof Buffer ? data : Buffer.from(data as ArrayBuffer);

        const frame: WebSocketFrame = {
          id: uuid(),
          trafficId,
          timestamp: Date.now(),
          direction: 'server-to-client',
          opcode: isBinary ? 2 : 1,
          data: buffer,
          isBinary,
          length: buffer.length,
        };

        this.emit('websocket:frame', frame);

        // Forward to client
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(data, { binary: isBinary });
        }
      });

      // Client -> Server messages
      clientWs.on('message', (data: RawData, isBinary: boolean) => {
        ctx.frameCount++;
        const buffer = data instanceof Buffer ? data : Buffer.from(data as ArrayBuffer);

        const frame: WebSocketFrame = {
          id: uuid(),
          trafficId,
          timestamp: Date.now(),
          direction: 'client-to-server',
          opcode: isBinary ? 2 : 1,
          data: buffer,
          isBinary,
          length: buffer.length,
        };

        this.emit('websocket:frame', frame);

        // Forward to server
        if (serverWs.readyState === WebSocket.OPEN) {
          serverWs.send(data, { binary: isBinary });
        }
      });

      // Handle server close
      serverWs.on('close', (code: number, reason: Buffer) => {
        this.emit('websocket:close', {
          trafficId,
          id: ctx.id,
          code,
          reason: reason.toString(),
          timestamp: Date.now(),
          frameCount: ctx.frameCount,
        });

        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.close(code, reason);
        }

        this.cleanup(ctx.id);
      });

      // Handle client close
      clientWs.on('close', (code: number, reason: Buffer) => {
        if (serverWs.readyState === WebSocket.OPEN) {
          serverWs.close(code, reason);
        }
      });

      // Handle server errors
      serverWs.on('error', (error: Error) => {
        this.emit('websocket:error', {
          trafficId,
          id: ctx.id,
          error: error.message,
          timestamp: Date.now(),
        });

        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.close(1011, 'Upstream error');
        }

        this.cleanup(ctx.id);
      });

      // Handle client errors
      clientWs.on('error', (error: Error) => {
        this.emit('websocket:error', {
          trafficId,
          id: ctx.id,
          error: error.message,
          timestamp: Date.now(),
        });

        if (serverWs.readyState === WebSocket.OPEN) {
          serverWs.close(1011, 'Client error');
        }

        this.cleanup(ctx.id);
      });

      // Handle ping/pong
      serverWs.on('ping', (data: Buffer) => {
        const frame: WebSocketFrame = {
          id: uuid(),
          trafficId,
          timestamp: Date.now(),
          direction: 'server-to-client',
          opcode: 9,
          data: data instanceof Buffer ? data : null,
          isBinary: false,
          length: data instanceof Buffer ? data.length : 0,
        };
        this.emit('websocket:frame', frame);

        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.ping(data);
        }
      });

      clientWs.on('ping', (data: Buffer) => {
        const frame: WebSocketFrame = {
          id: uuid(),
          trafficId,
          timestamp: Date.now(),
          direction: 'client-to-server',
          opcode: 9,
          data: data instanceof Buffer ? data : null,
          isBinary: false,
          length: data instanceof Buffer ? data.length : 0,
        };
        this.emit('websocket:frame', frame);

        if (serverWs.readyState === WebSocket.OPEN) {
          serverWs.ping(data);
        }
      });

      serverWs.on('pong', (data: Buffer) => {
        const frame: WebSocketFrame = {
          id: uuid(),
          trafficId,
          timestamp: Date.now(),
          direction: 'server-to-client',
          opcode: 10,
          data: data instanceof Buffer ? data : null,
          isBinary: false,
          length: data instanceof Buffer ? data.length : 0,
        };
        this.emit('websocket:frame', frame);

        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.pong(data);
        }
      });

      clientWs.on('pong', (data: Buffer) => {
        const frame: WebSocketFrame = {
          id: uuid(),
          trafficId,
          timestamp: Date.now(),
          direction: 'client-to-server',
          opcode: 10,
          data: data instanceof Buffer ? data : null,
          isBinary: false,
          length: data instanceof Buffer ? data.length : 0,
        };
        this.emit('websocket:frame', frame);

        if (serverWs.readyState === WebSocket.OPEN) {
          serverWs.pong(data);
        }
      });
    });

    // Handle upstream connection failure
    serverWs.on('error', (error) => {
      this.emit('websocket:error', {
        trafficId,
        id: ctx.id,
        error: `Failed to connect to upstream: ${error.message}`,
        timestamp: Date.now(),
      });

      socket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n');
      socket.destroy();
      this.cleanup(ctx.id);
    });
  }

  /**
   * Inject a frame into a live WebSocket connection.
   *
   * @param trafficId  Identifies the connection to inject into.
   * @param direction  'to-server' writes on the upstream socket (appears as a
   *                   client-to-server frame); 'to-client' writes on the
   *                   client-facing socket (appears as a server-to-client frame).
   * @param data       Payload to send (string for text, Buffer for binary).
   * @param opcode     WebSocket opcode; defaults to 1 (text) or 2 (binary based on data type).
   * @returns          true if the frame was written, false if no open connection was found.
   */
  sendFrame(
    trafficId: string,
    direction: 'to-client' | 'to-server',
    data: string | Buffer,
    opcode?: number
  ): boolean {
    // The connection map is keyed by internal id, so look up by trafficId.
    let ctx: WebSocketContext | undefined;
    for (const c of this.activeConnections.values()) {
      if (c.trafficId === trafficId) {
        ctx = c;
        break;
      }
    }

    if (!ctx) {
      return false;
    }

    const target = direction === 'to-server' ? ctx.serverSocket : ctx.clientWebSocket;
    if (!target || target.readyState !== WebSocket.OPEN) {
      return false;
    }

    const buffer = typeof data === 'string' ? Buffer.from(data) : data;
    const isBinary = Buffer.isBuffer(data);
    const resolvedOpcode = opcode ?? (isBinary ? 2 : 1);

    target.send(buffer, { binary: resolvedOpcode === 2 });

    ctx.frameCount++;

    const frame: WebSocketFrame = {
      id: uuid(),
      trafficId,
      timestamp: Date.now(),
      direction: direction === 'to-server' ? 'client-to-server' : 'server-to-client',
      opcode: resolvedOpcode,
      data: buffer,
      isBinary: resolvedOpcode === 2,
      length: buffer.length,
      injected: true,
    };

    this.emit('websocket:frame', frame);

    return true;
  }

  private cleanup(id: string): void {
    this.activeConnections.delete(id);
  }

  getActiveConnections(): number {
    return this.activeConnections.size;
  }

  closeAll(): void {
    for (const [id, ctx] of this.activeConnections) {
      if (ctx.serverSocket && ctx.serverSocket.readyState === WebSocket.OPEN) {
        ctx.serverSocket.close();
      }
      ctx.clientSocket.destroy();
      this.cleanup(id);
    }
  }
}
