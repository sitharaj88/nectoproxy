# Real-Time Events

NectoProxy provides real-time event streaming via [Socket.IO](https://socket.io/), enabling live monitoring of traffic, breakpoints, rule changes, WebSocket frames, and proxy status. The Socket.IO server runs on the same host and port as the REST API.

## Connection

Connect to the Socket.IO server at the same URL as the Web UI:

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:8889', {
  transports: ['websocket', 'polling'],
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

socket.on('disconnect', () => {
  console.log('Disconnected');
});
```

::: tip CORS
The Socket.IO server accepts connections from any origin (`*`), so you can connect from any client application without CORS issues.
:::

---

## Server to Client Events

These events are emitted by the server and can be subscribed to by any connected client.

### Traffic Events

#### `traffic:batch`

Emitted when new traffic entries are captured. Entries are batched for efficiency (flushed every 100ms or when the buffer reaches 50 entries).

```typescript
socket.on('traffic:batch', (entries: TrafficEntry[]) => {
  for (const entry of entries) {
    console.log(`${entry.method} ${entry.url} -> ${entry.status}`);
  }
});
```

::: tip Room-Based Subscription
Traffic events are sent to Socket.IO rooms. Subscribe to a specific session's traffic or all traffic using client-to-server events (see below).
:::

#### `traffic:update`

Emitted when an existing traffic entry is updated (e.g., when the response is received for a pending request).

```typescript
socket.on('traffic:update', (update: Partial<TrafficEntry> & { id: string }) => {
  console.log(`Entry ${update.id} updated:`, update.status);
});
```

#### `traffic:clear`

Emitted when all traffic in a session is cleared.

```typescript
socket.on('traffic:clear', (sessionId: string) => {
  console.log(`Traffic cleared for session: ${sessionId}`);
});
```

---

### Breakpoint Events

#### `breakpoint:hit`

Emitted when a breakpoint is triggered by matching traffic. Contains the full request (and response, for response breakpoints) data for inspection.

```typescript
interface BreakpointHit {
  id: string;              // Hit ID (used to resume)
  breakpointId: string;    // Which breakpoint was triggered
  trafficId: string;       // Associated traffic entry ID
  type: 'request' | 'response';
  timestamp: number;

  // Request data (always present)
  method: string;
  url: string;
  requestHeaders: Record<string, string | string[]>;
  requestBody: Buffer | null;

  // Response data (only for response breakpoints)
  status?: number;
  statusText?: string;
  responseHeaders?: Record<string, string | string[]>;
  responseBody?: Buffer | null;
}

socket.on('breakpoint:hit', (hit: BreakpointHit) => {
  console.log(`Breakpoint hit: ${hit.method} ${hit.url}`);
  console.log(`Type: ${hit.type}, Hit ID: ${hit.id}`);
});
```

#### `breakpoint:resumed`

Emitted when a paused breakpoint is released (either by user action or programmatically).

```typescript
socket.on('breakpoint:resumed', (hitId: string) => {
  console.log(`Breakpoint resumed: ${hitId}`);
});
```

#### `breakpoint:timeout`

Emitted when a breakpoint times out without being resumed.

```typescript
socket.on('breakpoint:timeout', (hitId: string) => {
  console.log(`Breakpoint timed out: ${hitId}`);
});
```

---

### WebSocket Events

#### `websocket:open`

Emitted when a new WebSocket connection is established through the proxy.

```typescript
interface WebSocketConnectionEvent {
  trafficId: string;
  id: string;
  url: string;
  timestamp: number;
  sessionId?: string;
}

socket.on('websocket:open', (event: WebSocketConnectionEvent) => {
  console.log(`WebSocket opened: ${event.url}`);
});
```

#### `websocket:frame`

Emitted when a WebSocket frame (message) is captured.

```typescript
interface WebSocketFrameEvent {
  id: string;
  trafficId: string;
  timestamp: number;
  direction: 'client-to-server' | 'server-to-client';
  opcode: number;        // 1=text, 2=binary, 8=close, 9=ping, 10=pong
  data: string | null;   // base64 encoded
  isBinary: boolean;
  length: number;
}

socket.on('websocket:frame', (frame: WebSocketFrameEvent) => {
  const arrow = frame.direction === 'client-to-server' ? '->' : '<-';
  console.log(`WS ${arrow} opcode:${frame.opcode} length:${frame.length}`);
});
```

#### `websocket:close`

Emitted when a WebSocket connection is closed.

```typescript
interface WebSocketCloseEvent {
  trafficId: string;
  id: string;
  code: number;
  reason: string;
  timestamp: number;
  frameCount: number;
}

socket.on('websocket:close', (event: WebSocketCloseEvent) => {
  console.log(`WebSocket closed: code=${event.code}, frames=${event.frameCount}`);
});
```

#### `websocket:error`

Emitted when a WebSocket connection encounters an error.

```typescript
interface WebSocketErrorEvent {
  trafficId: string;
  id: string;
  error: string;
  timestamp: number;
}

socket.on('websocket:error', (event: WebSocketErrorEvent) => {
  console.error(`WebSocket error: ${event.error}`);
});
```

---

### Rule Events

#### `rule:created`

Emitted when a new rule is created.

```typescript
socket.on('rule:created', (rule: Rule) => {
  console.log(`Rule created: ${rule.name} (${rule.action})`);
});
```

#### `rule:updated`

Emitted when a rule is updated.

```typescript
socket.on('rule:updated', (rule: Rule) => {
  console.log(`Rule updated: ${rule.name}`);
});
```

#### `rule:toggled`

Emitted when a rule is toggled between enabled and disabled.

```typescript
socket.on('rule:toggled', (rule: Rule) => {
  console.log(`Rule ${rule.name}: ${rule.enabled ? 'enabled' : 'disabled'}`);
});
```

#### `rule:deleted`

Emitted when a rule is deleted.

```typescript
socket.on('rule:deleted', (ruleId: string) => {
  console.log(`Rule deleted: ${ruleId}`);
});
```

#### `rules:reordered`

Emitted when rules are reordered.

```typescript
socket.on('rules:reordered', (rules: Rule[]) => {
  console.log(`Rules reordered: ${rules.map(r => r.name).join(', ')}`);
});
```

---

### Session Events

#### `session:created`

Emitted when a new session is created.

```typescript
socket.on('session:created', (session: Session) => {
  console.log(`Session created: ${session.name}`);
});
```

#### `session:updated`

Emitted when a session is updated.

```typescript
socket.on('session:updated', (session: Session) => {
  console.log(`Session updated: ${session.name}`);
});
```

#### `session:deleted`

Emitted when a session is deleted.

```typescript
socket.on('session:deleted', (sessionId: string) => {
  console.log(`Session deleted: ${sessionId}`);
});
```

---

### Proxy Events

#### `proxy:started`

Emitted when the proxy server starts.

```typescript
interface ProxyConfig {
  port: number;
  sslPort?: number;
  uiPort: number;
  autoOpenBrowser: boolean;
  recording: boolean;
}

socket.on('proxy:started', (config: ProxyConfig) => {
  console.log(`Proxy started on port ${config.port}`);
});
```

#### `proxy:stopped`

Emitted when the proxy server stops.

```typescript
socket.on('proxy:stopped', () => {
  console.log('Proxy stopped');
});
```

#### `proxy:error`

Emitted when the proxy encounters an error.

```typescript
socket.on('proxy:error', (error: string) => {
  console.error(`Proxy error: ${error}`);
});
```

---

### Certificate Events

#### `certificate:installed`

Emitted when a new domain certificate is generated and installed.

```typescript
socket.on('certificate:installed', (domain: string) => {
  console.log(`Certificate installed for: ${domain}`);
});
```

---

## Client to Server Events

These events are sent from the client to the server to subscribe to data or perform actions.

### `session:subscribe`

Subscribe to events for a specific session.

```typescript
socket.emit('session:subscribe', 'session-uuid');
```

### `session:unsubscribe`

Unsubscribe from a session's events.

```typescript
socket.emit('session:unsubscribe', 'session-uuid');
```

### `traffic:subscribe`

Subscribe to traffic events. Optionally filter by session.

```typescript
// Subscribe to all traffic
socket.emit('traffic:subscribe', {});

// Subscribe to a specific session's traffic
socket.emit('traffic:subscribe', { sessionId: 'session-uuid' });
```

### `traffic:unsubscribe`

Unsubscribe from all traffic events.

```typescript
socket.emit('traffic:unsubscribe');
```

### `breakpoint:resume`

Resume a paused breakpoint, optionally with modifications to the request or response.

```typescript
// Continue without modifications
socket.emit('breakpoint:resume', {
  id: 'hit-uuid',
  action: 'continue'
});

// Abort the request
socket.emit('breakpoint:resume', {
  id: 'hit-uuid',
  action: 'abort'
});

// Continue with modified request
socket.emit('breakpoint:resume', {
  id: 'hit-uuid',
  action: 'continue',
  modifications: {
    request: {
      method: 'POST',
      url: 'https://api.example.com/modified-path',
      headers: { 'Authorization': 'Bearer new-token' },
      body: '{"modified": true}'
    }
  }
});

// Continue with modified response
socket.emit('breakpoint:resume', {
  id: 'hit-uuid',
  action: 'continue',
  modifications: {
    response: {
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      body: '{"overridden": true}'
    }
  }
});

// Return a mock response instead of forwarding
socket.emit('breakpoint:resume', {
  id: 'hit-uuid',
  action: 'mock',
  modifications: {
    mock: {
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      body: '{"mocked": true}'
    }
  }
});
```

#### Resume Actions

| Action | Description |
|---|---|
| `continue` | Forward the request/response, optionally with modifications |
| `abort` | Drop the request entirely |
| `mock` | Return a mock response instead of forwarding to the server |

#### Modifications Object

```typescript
interface BreakpointResumeModifications {
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
```

### `proxy:start`

Request the proxy to start (optional configuration overrides).

```typescript
socket.emit('proxy:start', { port: 8888 });
```

### `proxy:stop`

Request the proxy to stop.

```typescript
socket.emit('proxy:stop');
```

---

## Complete Example

::: details Full TypeScript client that monitors traffic and handles breakpoints

```typescript
import { io, Socket } from 'socket.io-client';

// Connect to NectoProxy
const socket: Socket = io('http://localhost:8889', {
  transports: ['websocket', 'polling'],
});

// Connection lifecycle
socket.on('connect', () => {
  console.log('Connected to NectoProxy');

  // Subscribe to all traffic
  socket.emit('traffic:subscribe', {});
});

socket.on('disconnect', () => {
  console.log('Disconnected from NectoProxy');
});

// Monitor new traffic
socket.on('traffic:batch', (entries) => {
  for (const entry of entries) {
    const status = entry.status ?? 'pending';
    const duration = entry.duration ? `${entry.duration}ms` : '...';
    console.log(`[${status}] ${entry.method} ${entry.url} (${duration})`);
  }
});

// Monitor traffic updates (response received)
socket.on('traffic:update', (update) => {
  if (update.status) {
    console.log(`Updated ${update.id}: status=${update.status}`);
  }
});

// Handle breakpoints
socket.on('breakpoint:hit', (hit) => {
  console.log(`\nBreakpoint hit: ${hit.method} ${hit.url}`);
  console.log(`Type: ${hit.type}, ID: ${hit.id}`);

  // Auto-resume after inspection (in production, you would
  // present this to the user via a UI)
  setTimeout(() => {
    socket.emit('breakpoint:resume', {
      id: hit.id,
      action: 'continue',
    });
    console.log('Breakpoint resumed');
  }, 1000);
});

socket.on('breakpoint:resumed', (id) => {
  console.log(`Breakpoint ${id} resumed`);
});

socket.on('breakpoint:timeout', (id) => {
  console.log(`Breakpoint ${id} timed out`);
});

// Monitor WebSocket connections
socket.on('websocket:open', (event) => {
  console.log(`WebSocket opened: ${event.url}`);
});

socket.on('websocket:frame', (frame) => {
  const dir = frame.direction === 'client-to-server' ? 'SEND' : 'RECV';
  console.log(`WS [${dir}] opcode=${frame.opcode} len=${frame.length}`);
});

socket.on('websocket:close', (event) => {
  console.log(`WebSocket closed: code=${event.code} (${event.frameCount} frames)`);
});

// Monitor rule changes
socket.on('rule:created', (rule) => {
  console.log(`Rule created: ${rule.name}`);
});

socket.on('rule:toggled', (rule) => {
  console.log(`Rule ${rule.name}: ${rule.enabled ? 'ON' : 'OFF'}`);
});

// Monitor proxy status
socket.on('proxy:started', (config) => {
  console.log(`Proxy started on port ${config.port}`);
});

socket.on('proxy:error', (error) => {
  console.error(`Proxy error: ${error}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  socket.emit('traffic:unsubscribe');
  socket.disconnect();
  process.exit(0);
});
```
:::

::: warning Batched Traffic Events
Traffic events use a `traffic:batch` event instead of individual `traffic:new` events. This batching improves performance when many requests are captured simultaneously. The batch is flushed every 100ms or when 50 entries accumulate, whichever comes first.
:::
