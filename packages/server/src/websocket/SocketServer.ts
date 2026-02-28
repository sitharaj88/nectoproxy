import { Server as HttpServer } from 'node:http';
import { Server, Socket } from 'socket.io';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  TrafficEntry,
  Rule,
  BreakpointResume,
  WebSocketConnectionEvent,
  WebSocketFrameEvent,
  WebSocketCloseEvent,
  WebSocketErrorEvent,
} from '@nectoproxy/shared';

export type BreakpointResumeHandler = (hitId: string, resume: BreakpointResume) => void;

export class SocketServer {
  private io: Server<ClientToServerEvents, ServerToClientEvents>;
  private trafficBuffer: TrafficEntry[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private bufferFlushMs = 100;
  private maxBufferSize = 50;
  private breakpointResumeHandler: BreakpointResumeHandler | null = null;

  constructor(httpServer: HttpServer) {
    this.io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
      transports: ['websocket', 'polling'],
    });

    this.setupEventHandlers();
    this.startBufferFlush();
  }

  setBreakpointResumeHandler(handler: BreakpointResumeHandler): void {
    this.breakpointResumeHandler = handler;
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
      console.log(`Client connected: ${socket.id}`);

      socket.on('session:subscribe', (sessionId: string) => {
        socket.join(`session:${sessionId}`);
        console.log(`Client ${socket.id} subscribed to session ${sessionId}`);
      });

      socket.on('session:unsubscribe', (sessionId: string) => {
        socket.leave(`session:${sessionId}`);
        console.log(`Client ${socket.id} unsubscribed from session ${sessionId}`);
      });

      socket.on('traffic:subscribe', (options) => {
        if (options.sessionId) {
          socket.join(`traffic:${options.sessionId}`);
        } else {
          socket.join('traffic:all');
        }
      });

      socket.on('traffic:unsubscribe', () => {
        // Leave all traffic rooms
        const rooms = Array.from(socket.rooms);
        for (const room of rooms) {
          if (room.startsWith('traffic:')) {
            socket.leave(room);
          }
        }
      });

      socket.on('breakpoint:resume', (data) => {
        if (this.breakpointResumeHandler) {
          const resume: BreakpointResume = {
            id: data.id,
            action: data.action,
            modifiedRequest: data.modifications?.request,
            modifiedResponse: data.modifications?.response,
            mockResponse: data.modifications?.mock,
          };
          this.breakpointResumeHandler(data.id, resume);
        }
      });

      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });
  }

  private startBufferFlush(): void {
    this.flushInterval = setInterval(() => {
      this.flushTrafficBuffer();
    }, this.bufferFlushMs);
  }

  private flushTrafficBuffer(): void {
    if (this.trafficBuffer.length === 0) return;

    const entries = this.trafficBuffer.splice(0);

    // Group entries by session
    const bySession = new Map<string, TrafficEntry[]>();
    for (const entry of entries) {
      const existing = bySession.get(entry.sessionId) || [];
      existing.push(entry);
      bySession.set(entry.sessionId, existing);
    }

    // Emit to session-specific rooms
    for (const [sessionId, sessionEntries] of bySession) {
      this.io.to(`traffic:${sessionId}`).emit('traffic:batch', sessionEntries);
    }

    // Also emit to 'all' room
    this.io.to('traffic:all').emit('traffic:batch', entries);
  }

  emitTrafficNew(entry: TrafficEntry): void {
    this.trafficBuffer.push(entry);

    // Flush immediately if buffer is full
    if (this.trafficBuffer.length >= this.maxBufferSize) {
      this.flushTrafficBuffer();
    }
  }

  emitTrafficUpdate(update: Partial<TrafficEntry> & { id: string }): void {
    this.io.to('traffic:all').emit('traffic:update', update);
  }

  emitTrafficClear(sessionId: string): void {
    this.io.to(`session:${sessionId}`).emit('traffic:clear', sessionId);
    this.io.to('traffic:all').emit('traffic:clear', sessionId);
  }

  emitBreakpointHit(hit: Parameters<ServerToClientEvents['breakpoint:hit']>[0]): void {
    this.io.emit('breakpoint:hit', hit);
  }

  emitBreakpointResumed(id: string): void {
    this.io.emit('breakpoint:resumed', id);
  }

  emitBreakpointTimeout(id: string): void {
    this.io.emit('breakpoint:timeout', id);
  }

  emitProxyStarted(config: Parameters<ServerToClientEvents['proxy:started']>[0]): void {
    this.io.emit('proxy:started', config);
  }

  emitProxyStopped(): void {
    this.io.emit('proxy:stopped');
  }

  emitProxyError(error: string): void {
    this.io.emit('proxy:error', error);
  }

  emitRuleCreated(rule: Rule): void {
    this.io.emit('rule:created', rule);
  }

  emitRuleUpdated(rule: Rule): void {
    this.io.emit('rule:updated', rule);
  }

  emitRuleDeleted(ruleId: string): void {
    this.io.emit('rule:deleted', ruleId);
  }

  emitRuleToggled(rule: Rule): void {
    this.io.emit('rule:toggled', rule);
  }

  emitRulesReordered(rules: Rule[]): void {
    this.io.emit('rules:reordered', rules);
  }

  emitWebSocketOpen(event: WebSocketConnectionEvent): void {
    this.io.emit('websocket:open', event);
  }

  emitWebSocketFrame(event: WebSocketFrameEvent): void {
    this.io.emit('websocket:frame', event);
  }

  emitWebSocketClose(event: WebSocketCloseEvent): void {
    this.io.emit('websocket:close', event);
  }

  emitWebSocketError(event: WebSocketErrorEvent): void {
    this.io.emit('websocket:error', event);
  }

  getConnectedClients(): number {
    return this.io.engine.clientsCount;
  }

  close(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flushTrafficBuffer();
    this.io.close();
  }
}
