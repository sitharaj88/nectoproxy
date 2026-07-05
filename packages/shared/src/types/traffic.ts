export interface TrafficEntry {
  id: string;
  sessionId: string;
  timestamp: number;

  // Request
  method: string;
  url: string;
  protocol: 'http' | 'https' | 'ws' | 'wss';
  host: string;
  path: string;
  requestHeaders: Record<string, string | string[]>;
  requestBody: Buffer | null;
  requestBodySize: number;

  // Response (null until received)
  status: number | null;
  statusText: string | null;
  responseHeaders: Record<string, string | string[]> | null;
  responseBody: Buffer | null;
  responseBodySize: number | null;

  // Metadata
  duration: number | null;
  remoteAddress: string | null;
  tlsVersion: string | null;
  error: string | null;

  // Flags
  isComplete: boolean;
  isMocked: boolean;
  isBreakpointed: boolean;
  isTruncated: boolean;
}

export interface TrafficFilter {
  search?: string;
  searchRegex?: boolean; // Enable regex matching for search
  bodySearch?: string; // Search within request/response body content
  bodySearchRegex?: boolean; // Enable regex matching for body search
  methods?: string[];
  statusCodes?: number[];
  protocols?: ('http' | 'https' | 'ws' | 'wss')[];
  hosts?: string[];
  contentTypes?: string[];
  minSize?: number;
  maxSize?: number;
  startTime?: number;
  endTime?: number;
  hasError?: boolean;
  minDuration?: number;
  maxDuration?: number;
}

export interface FilterPreset {
  id: string;
  name: string;
  description?: string;
  filter: TrafficFilter;
  isBuiltIn: boolean;
  createdAt: number;
  updatedAt: number;
}

// Built-in filter presets
export const BUILT_IN_FILTER_PRESETS: Omit<FilterPreset, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'API Calls',
    description: 'Show only API/XHR requests',
    filter: {
      contentTypes: ['application/json', 'application/xml', 'text/xml'],
    },
    isBuiltIn: true,
  },
  {
    name: 'Images',
    description: 'Show only image requests',
    filter: {
      contentTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'],
    },
    isBuiltIn: true,
  },
  {
    name: 'Errors Only',
    description: 'Show only failed requests (4xx, 5xx)',
    filter: {
      statusCodes: [400, 401, 403, 404, 500, 502, 503, 504],
    },
    isBuiltIn: true,
  },
  {
    name: 'Slow Requests',
    description: 'Show requests taking more than 1 second',
    filter: {
      minDuration: 1000,
    },
    isBuiltIn: true,
  },
  {
    name: 'WebSockets',
    description: 'Show only WebSocket connections',
    filter: {
      protocols: ['ws', 'wss'],
    },
    isBuiltIn: true,
  },
];

export interface TrafficStats {
  totalRequests: number;
  completedRequests: number;
  failedRequests: number;
  totalBytes: number;
  avgDuration: number;
}

export type TrafficSortField = 'timestamp' | 'duration' | 'size' | 'status' | 'host' | 'method';
export type SortDirection = 'asc' | 'desc';

export interface TrafficQuery {
  sessionId?: string;
  filter?: TrafficFilter;
  sort?: {
    field: TrafficSortField;
    direction: SortDirection;
  };
  limit?: number;
  offset?: number;
}

// WebSocket message frame
export interface WebSocketFrame {
  id: string;
  trafficId: string;
  timestamp: number;
  direction: 'client-to-server' | 'server-to-client';
  opcode: number; // 1 = text, 2 = binary, 8 = close, 9 = ping, 10 = pong
  data: Buffer | null;
  isBinary: boolean;
  length: number;
  injected?: boolean; // true when the frame was manually injected via the send API
}

// Request body for injecting a WebSocket frame into a live connection
export interface WebSocketSendRequest {
  direction: 'to-client' | 'to-server';
  data: string; // text payload, or base64-encoded bytes when isBinary is true
  isBinary?: boolean;
}

export type WebSocketOpcode = 1 | 2 | 8 | 9 | 10;

export const WEBSOCKET_OPCODE_NAMES: Record<WebSocketOpcode, string> = {
  1: 'Text',
  2: 'Binary',
  8: 'Close',
  9: 'Ping',
  10: 'Pong',
};
