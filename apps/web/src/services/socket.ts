import { io, Socket } from 'socket.io-client';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  TrafficEntry,
  Rule,
  BreakpointHit,
  BreakpointResumeModifications,
  WebSocketConnectionEvent,
  WebSocketFrameEvent,
  WebSocketCloseEvent,
  WebSocketErrorEvent,
} from '@nectoproxy/shared';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: TypedSocket | null = null;

export function getSocket(): TypedSocket {
  if (!socket) {
    socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket?.id);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
  }

  return socket;
}

export function subscribeToTraffic(
  onNew: (entry: TrafficEntry) => void,
  onUpdate: (update: Partial<TrafficEntry> & { id: string }) => void,
  onBatch: (entries: TrafficEntry[]) => void,
  onClear: (sessionId: string) => void
): () => void {
  const socket = getSocket();

  socket.on('traffic:new', onNew);
  socket.on('traffic:update', onUpdate);
  socket.on('traffic:batch', onBatch);
  socket.on('traffic:clear', onClear);

  socket.emit('traffic:subscribe', {});

  return () => {
    socket.off('traffic:new', onNew);
    socket.off('traffic:update', onUpdate);
    socket.off('traffic:batch', onBatch);
    socket.off('traffic:clear', onClear);
    socket.emit('traffic:unsubscribe');
  };
}

export function subscribeToProxy(
  onStarted: (config: { port: number; uiPort: number }) => void,
  onStopped: () => void,
  onError: (error: string) => void
): () => void {
  const socket = getSocket();

  socket.on('proxy:started', onStarted);
  socket.on('proxy:stopped', onStopped);
  socket.on('proxy:error', onError);

  return () => {
    socket.off('proxy:started', onStarted);
    socket.off('proxy:stopped', onStopped);
    socket.off('proxy:error', onError);
  };
}

export function subscribeToRules(
  onCreated: (rule: Rule) => void,
  onUpdated: (rule: Rule) => void,
  onDeleted: (ruleId: string) => void,
  onToggled: (rule: Rule) => void,
  onReordered: (rules: Rule[]) => void
): () => void {
  const socket = getSocket();

  socket.on('rule:created', onCreated);
  socket.on('rule:updated', onUpdated);
  socket.on('rule:deleted', onDeleted);
  socket.on('rule:toggled', onToggled);
  socket.on('rules:reordered', onReordered);

  return () => {
    socket.off('rule:created', onCreated);
    socket.off('rule:updated', onUpdated);
    socket.off('rule:deleted', onDeleted);
    socket.off('rule:toggled', onToggled);
    socket.off('rules:reordered', onReordered);
  };
}

export function subscribeToBreakpoints(
  onHit: (hit: BreakpointHit) => void,
  onResumed: (id: string) => void,
  onTimeout: (id: string) => void
): () => void {
  const socket = getSocket();

  socket.on('breakpoint:hit', onHit);
  socket.on('breakpoint:resumed', onResumed);
  socket.on('breakpoint:timeout', onTimeout);

  return () => {
    socket.off('breakpoint:hit', onHit);
    socket.off('breakpoint:resumed', onResumed);
    socket.off('breakpoint:timeout', onTimeout);
  };
}

export function resumeBreakpoint(
  id: string,
  action: 'continue' | 'abort' | 'mock',
  modifications?: BreakpointResumeModifications
): void {
  const socket = getSocket();
  socket.emit('breakpoint:resume', { id, action, modifications });
}

export function subscribeToWebSocket(
  onOpen: (event: WebSocketConnectionEvent) => void,
  onFrame: (event: WebSocketFrameEvent) => void,
  onClose: (event: WebSocketCloseEvent) => void,
  onError: (event: WebSocketErrorEvent) => void
): () => void {
  const socket = getSocket();

  socket.on('websocket:open', onOpen);
  socket.on('websocket:frame', onFrame);
  socket.on('websocket:close', onClose);
  socket.on('websocket:error', onError);

  return () => {
    socket.off('websocket:open', onOpen);
    socket.off('websocket:frame', onFrame);
    socket.off('websocket:close', onClose);
    socket.off('websocket:error', onError);
  };
}
