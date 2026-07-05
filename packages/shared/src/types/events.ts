import type { TrafficEntry } from './traffic.js';
import type { BreakpointHit } from './breakpoints.js';
import type { Session } from './session.js';
import type { Rule } from './rules.js';

// Server -> Client events
export interface ServerToClientEvents {
  'traffic:new': (entry: TrafficEntry) => void;
  'traffic:update': (update: Partial<TrafficEntry> & { id: string }) => void;
  'traffic:batch': (entries: TrafficEntry[]) => void;
  'traffic:clear': (sessionId: string) => void;

  'breakpoint:hit': (hit: BreakpointHit) => void;
  'breakpoint:resumed': (id: string) => void;
  'breakpoint:timeout': (id: string) => void;

  'session:created': (session: Session) => void;
  'session:updated': (session: Session) => void;
  'session:deleted': (sessionId: string) => void;

  'rule:created': (rule: Rule) => void;
  'rule:updated': (rule: Rule) => void;
  'rule:deleted': (ruleId: string) => void;
  'rule:toggled': (rule: Rule) => void;
  'rules:reordered': (rules: Rule[]) => void;

  'websocket:open': (data: WebSocketConnectionEvent) => void;
  'websocket:frame': (data: WebSocketFrameEvent) => void;
  'websocket:close': (data: WebSocketCloseEvent) => void;
  'websocket:error': (data: WebSocketErrorEvent) => void;

  'proxy:started': (config: ProxyConfig) => void;
  'proxy:stopped': () => void;
  'proxy:error': (error: string) => void;

  'certificate:installed': (domain: string) => void;
}

// Breakpoint resume modifications from UI
export interface BreakpointResumeModifications {
  request?: {
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    body?: string | Buffer;
  };
  response?: {
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
    body?: string | Buffer;
  };
  mock?: {
    status: number;
    statusText?: string;
    headers?: Record<string, string>;
    body?: string | Buffer;
  };
}

// Client -> Server events
export interface ClientToServerEvents {
  'breakpoint:resume': (data: { id: string; action: 'continue' | 'abort' | 'mock'; modifications?: BreakpointResumeModifications }) => void;

  'session:subscribe': (sessionId: string) => void;
  'session:unsubscribe': (sessionId: string) => void;

  'traffic:subscribe': (options: { sessionId?: string; filter?: unknown }) => void;
  'traffic:unsubscribe': () => void;

  'proxy:start': (config?: Partial<ProxyConfig>) => void;
  'proxy:stop': () => void;
}

export interface WebSocketConnectionEvent {
  trafficId: string;
  id: string;
  url: string;
  timestamp: number;
  sessionId?: string;
}

export interface WebSocketFrameEvent {
  id: string;
  trafficId: string;
  timestamp: number;
  direction: 'client-to-server' | 'server-to-client';
  opcode: number;
  data: string | null; // base64 encoded for JSON transport
  isBinary: boolean;
  length: number;
  injected?: boolean; // true when the frame was manually injected via the send API
}

export interface WebSocketCloseEvent {
  trafficId: string;
  id: string;
  code: number;
  reason: string;
  timestamp: number;
  frameCount: number;
}

export interface WebSocketErrorEvent {
  trafficId: string;
  id: string;
  error: string;
  timestamp: number;
}

export interface ProxyConfig {
  port: number;
  sslPort?: number;
  uiPort: number;
  autoOpenBrowser: boolean;
  recording: boolean;
}
