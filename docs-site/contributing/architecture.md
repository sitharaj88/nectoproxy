# Architecture

NectoProxy is organized as a monorepo with seven packages, managed by pnpm workspaces and Turborepo. This page provides a detailed overview of each package, their responsibilities, and how data flows through the system.

## Monorepo Structure

```
nectoproxy/
  apps/
    cli/                  # nectoproxy (CLI) -- the npm package users install
    web/                  # @nectoproxy/web -- React SPA
  packages/
    shared/               # @nectoproxy/shared -- TypeScript types
    certs/                # @nectoproxy/certs -- Certificate generation
    storage/              # @nectoproxy/storage -- SQLite + Drizzle ORM
    core/                 # @nectoproxy/core -- MITM proxy engine
    server/               # @nectoproxy/server -- REST API + Socket.IO
```

The monorepo uses:
- **pnpm workspaces** for dependency management across packages
- **Turborepo** for orchestrating builds, tests, and dev tasks with caching and parallelism
- **TypeScript** throughout, with a shared `tsconfig.base.json`
- **Vitest** as the test runner

## Package Dependency Graph

```
                    @nectoproxy/shared
                   /        |         \
                  /         |          \
    @nectoproxy/certs  @nectoproxy/storage  @nectoproxy/web
                  \         |
                   \        |
                @nectoproxy/core
                        |
                @nectoproxy/server
                        |
                   nectoproxy (CLI)
```

Build order follows this dependency graph. Turborepo resolves it automatically via the `dependsOn: ["^build"]` configuration.

## Package Details

### @nectoproxy/shared

**Path:** `packages/shared/`

**Purpose:** Central repository of TypeScript type definitions shared across all packages. This package ensures type consistency across the entire codebase.

**Key files:**
- `types/traffic.ts` -- `TrafficEntry` type for HTTP request/response pairs
- `types/rules.ts` -- `Rule`, `RuleAction`, `RuleMatcher`, and action config types (Mock, Block, Delay, Throttle, MapRemote, MapLocal, ModifyRequest, ModifyResponse)
- `types/session.ts` -- `Session` type for capture sessions
- `types/settings.ts` -- `Settings`, `ProxySettings`, `UISettings`, `StorageSettings`, `CertificateSettings`, `UpstreamProxyConfig` types with `DEFAULT_SETTINGS`
- `types/network.ts` -- `NetworkProfile` type and `NETWORK_PRESETS` array (Slow 2G through Offline)
- `types/breakpoints.ts` -- `Breakpoint`, `BreakpointHit`, `BreakpointResume` types
- `types/events.ts` -- Socket.IO event type definitions
- `types/har.ts` -- HAR (HTTP Archive) format types
- `types/sslPassthrough.ts` -- SSL passthrough domain types
- `types/dns.ts` -- DNS mapping types
- `types/annotations.ts` -- Traffic annotation types

**Dependencies:** None (leaf package).

---

### @nectoproxy/certs

**Path:** `packages/certs/`

**Purpose:** Handles all certificate operations -- generating the root CA, creating per-domain certificates on-the-fly, and managing the certificate cache.

**Key components:**

| Class | Responsibility |
|-------|---------------|
| `CertificateManager` | High-level certificate management. Initializes the CA, generates and caches domain certificates, provides installation instructions. |
| `CAGenerator` | Generates the root CA key pair and self-signed certificate using node-forge. CA is valid for 10 years with 2048-bit RSA keys. |
| `DomainCertGenerator` | Generates per-domain certificates signed by the CA. Certificates are valid for 365 days. Supports SAN (Subject Alternative Name) for proper domain validation. |

**How it works:**
1. On first launch, `CAGenerator` creates a CA key pair and certificate, saved to `~/.nectoproxy/certs/`.
2. When the proxy intercepts an HTTPS connection to `example.com`, `CertificateManager.getCertificateForDomain('example.com')` is called.
3. If a cached certificate exists and is valid, it is returned. Otherwise, `DomainCertGenerator` creates a new one, signs it with the CA, caches it, and returns it.
4. The generated certificate is used to establish a TLS connection with the client, allowing NectoProxy to decrypt and inspect the traffic.

**Dependencies:** `@nectoproxy/shared`, `node-forge`

---

### @nectoproxy/storage

**Path:** `packages/storage/`

**Purpose:** Manages all persistent data storage using SQLite with the Drizzle ORM.

**Key components:**

| File | Responsibility |
|------|---------------|
| `db/connection.ts` | Creates and manages the SQLite database connection. Initializes tables, enables WAL mode, and manages migrations. |
| `db/schema.ts` | Drizzle ORM schema definitions for all 9 tables. |
| `repositories/*.ts` | Repository classes providing CRUD operations for each entity. |

**Database tables:**

| Table | Repository | Description |
|-------|-----------|-------------|
| `sessions` | `SessionRepository` | Capture sessions with metadata (name, active flag, traffic count, total bytes) |
| `traffic` | `TrafficRepository` | HTTP request-response pairs with full headers, bodies, timing, and flags |
| `rules` | `RuleRepository` | Traffic manipulation rules (match, action, config, priority) |
| `breakpoints` | `BreakpointRepository` | Breakpoint definitions for intercepting requests/responses |
| `ssl_passthrough` | `SSLPassthroughRepository` | Domains that bypass MITM interception |
| `dns_mappings` | `DnsMappingRepository` | Custom DNS hostname-to-IP mappings |
| `settings` | `SettingsRepository` | Key-value settings store |
| `ws_frames` | `WebSocketFrameRepository` | Individual WebSocket frames linked to traffic entries |
| `annotations` | `AnnotationRepository` | User notes and tags on traffic entries |

**Database features:**
- WAL (Write-Ahead Logging) mode for concurrent reads and writes
- Foreign key cascading deletes (e.g., deleting a session deletes all its traffic)
- Indexed columns for fast querying (session ID, timestamp, host, method, status)

**Dependencies:** `@nectoproxy/shared`, `better-sqlite3`, `drizzle-orm`

---

### @nectoproxy/core

**Path:** `packages/core/`

**Purpose:** The MITM (man-in-the-middle) proxy engine. This is the heart of NectoProxy -- it intercepts, inspects, and optionally modifies HTTP/HTTPS/WebSocket traffic.

**Key components:**

| Class | Responsibility |
|-------|---------------|
| `ProxyServer` | Main proxy server. Creates an HTTP server, handles CONNECT tunnels for HTTPS, manages TLS termination, and coordinates all subsystems. |
| `RuleEngine` | Evaluates traffic against configured rules and returns actions (mock, block, delay, throttle, map-remote, map-local, modify). |
| `RuleMatcher` | Pattern matching engine for URL, method, host, path, headers, and body content. |
| `BreakpointManager` | Manages breakpoints. Pauses request/response flow, emits events, waits for user interaction, and implements auto-continue timeout. |
| `WebSocketHandler` | Intercepts WebSocket upgrade requests, establishes proxy connections, and captures individual frames in both directions. |
| `ThrottleService` | Applies network conditioning (bandwidth limits, latency, jitter, packet loss) based on the active network profile. |
| `UpstreamProxyAgent` | Manages connections through upstream proxies (HTTP, HTTPS, SOCKS4, SOCKS5) with authentication and bypass rules. |

**Rule actions (in `rules/actions/`):**

| Action | Class | Description |
|--------|-------|-------------|
| `mock` | `MockAction` | Returns a custom response without contacting the server |
| `block` | `BlockAction` | Blocks the request entirely |
| `delay` | `DelayAction` | Adds a time delay before forwarding |
| `throttle` | `ThrottleAction` | Limits bandwidth for the matched request |
| `map-remote` | `MapRemoteAction` | Redirects the request to a different URL |
| `map-local` | `MapLocalAction` | Serves a response from a local file |
| `modify-request` | `ModifyRequestAction` | Modifies request headers, body, or query params |
| `modify-response` | `ModifyResponseAction` | Modifies response status, headers, or body |

**HTTPS interception flow:**
1. Client sends `CONNECT example.com:443` to the proxy.
2. `ProxyServer.handleConnect()` checks SSL passthrough. If the domain is in the passthrough list, it tunnels directly.
3. Otherwise, it fetches a certificate for `example.com` from `CertificateManager`.
4. Acknowledges the CONNECT with `200 Connection Established`.
5. Wraps the socket in a `TLSSocket` using the generated certificate.
6. Creates an HTTP parser on the TLS socket to handle decrypted requests.
7. Processes the HTTP request through rules, breakpoints, and throttling.
8. Forwards to the target server (or upstream proxy) and returns the response.

**Dependencies:** `@nectoproxy/shared`, `@nectoproxy/certs`, `uuid`

---

### @nectoproxy/server

**Path:** `packages/server/`

**Purpose:** Provides the REST API and real-time event system that bridges the proxy engine with the Web UI.

**Key components:**

| Component | Responsibility |
|-----------|---------------|
| `app.ts` | Express application factory. Registers routes, serves static Web UI files, configures middleware. |
| `SocketServer` | Socket.IO server for real-time events. Emits traffic updates, breakpoint hits, WebSocket frames, and proxy status to connected Web UI clients. |
| `HarConverter` | Converts between NectoProxy's internal `TrafficEntry` format and the HAR (HTTP Archive) standard. |
| `ReplayService` | Replays captured requests against the real server. |

**API routes (`routes/`):**

| Route | Path | Description |
|-------|------|-------------|
| `sessions.ts` | `/api/sessions` | CRUD for capture sessions |
| `traffic.ts` | `/api/traffic` | Query and manage traffic entries |
| `rules.ts` | `/api/rules` | CRUD for traffic manipulation rules |
| `breakpoints.ts` | `/api/breakpoints` | CRUD for breakpoint definitions |
| `settings.ts` | `/api/settings` | Read/write application settings |
| `certificates.ts` | `/api/certificates` | Certificate info and download |
| `har.ts` | `/api/har` | HAR export/import |
| `ssl-passthrough.ts` | `/api/ssl-passthrough` | CRUD for SSL passthrough domains |
| `dns.ts` | `/api/dns` | CRUD for DNS mappings |
| `annotations.ts` | `/api/annotations` | CRUD for traffic annotations |
| `websocket.ts` | `/api/websocket` | WebSocket frame queries |
| `network.ts` | `/api/network` | Network conditioning profiles |
| `upstream-proxy.ts` | `/api/upstream-proxy` | Upstream proxy configuration |
| `snapshot.ts` | `/api/snapshot` | Traffic snapshot operations |

**Real-time events (Socket.IO):**

| Event | Direction | Description |
|-------|-----------|-------------|
| `traffic:new` | Server -> Client | New traffic entry captured |
| `traffic:update` | Server -> Client | Traffic entry updated (response received) |
| `breakpoint:hit` | Server -> Client | A breakpoint was triggered |
| `breakpoint:resumed` | Server -> Client | A breakpoint was resumed |
| `breakpoint:timeout` | Server -> Client | A breakpoint timed out |
| `breakpoint:resume` | Client -> Server | User resumes a breakpoint |
| `websocket:open` | Server -> Client | WebSocket connection opened |
| `websocket:frame` | Server -> Client | WebSocket frame captured |
| `websocket:close` | Server -> Client | WebSocket connection closed |
| `proxy:started` | Server -> Client | Proxy server started |
| `proxy:stopped` | Server -> Client | Proxy server stopped |
| `proxy:error` | Server -> Client | Proxy error occurred |

**Dependencies:** `@nectoproxy/shared`, `@nectoproxy/storage`, `@nectoproxy/core`, `express`, `socket.io`, `multer`

---

### @nectoproxy/web

**Path:** `apps/web/`

**Purpose:** The React single-page application that provides the NectoProxy Web UI.

**Technology stack:**
- **React 18** -- UI framework
- **Vite** -- Build tool and dev server with HMR
- **TailwindCSS** -- Utility-first CSS framework
- **Zustand** -- Lightweight state management
- **React Query** -- Server state and API call management
- **Socket.IO Client** -- Real-time event handling
- **Lucide React** -- Icon library
- **qrcode.react** -- QR code generation for mobile certificate download

**Key components:**

| Component | Description |
|-----------|-------------|
| `Header` | Top toolbar with recording controls, view toggles, theme switch, filters |
| `TrafficList` | Virtualized list of traffic entries with sorting and selection |
| `DetailPanel` | Detailed view of a selected traffic entry (request/response headers, body, timing) |
| `FilterBar` | Search and filter controls for the traffic list |
| `RulesPanel` / `RuleEditor` | Create and manage traffic manipulation rules |
| `BreakpointsPanel` / `BreakpointEditor` | Create and manage breakpoints |
| `InterceptedPanel` | Shows breakpoint-hit requests/responses for modification |
| `SettingsPanel` | Application settings with mobile configuration and QR code |
| `NetworkConditionPanel` | Network conditioning presets and custom profiles |
| `UpstreamProxyConfig` | Upstream proxy configuration dialog |
| `SSLPassthroughPanel` | SSL passthrough domain management |
| `DnsMappingPanel` | Custom DNS mapping configuration |
| `WebSocketMessagesViewer` | View individual WebSocket frames |
| `HarExportImport` | Export/import traffic as HAR files |
| `SessionTabs` | Switch between capture sessions |
| `CodeGeneratorModal` | Generate code snippets (curl, Python, Go, etc.) from traffic entries |
| `DashboardView` | Visual dashboard with charts (requests/sec, error rate, response times) |
| `SecurityTab` | Security analysis of captured traffic |
| `WaterfallChart` | Request timing waterfall visualization |
| `TimingBreakdown` | Detailed timing breakdown for individual requests |
| `CommandPalette` | Keyboard-driven command palette |
| `ReplayEditor` | Edit and replay captured requests |
| `CodeViewer` | Syntax-highlighted code viewer for various languages |
| `GraphQLViewer` | GraphQL query/response viewer |
| `GRPCViewer` | gRPC message viewer |

**State management (Zustand stores):**

| Store | State |
|-------|-------|
| `trafficStore` | Traffic entries, selected entry, filters, pause state |
| `rulesStore` | Active rules |
| `breakpointStore` | Breakpoints and pending breakpoint hits |
| `sessionStore` | Sessions and active session |
| `settingsStore` | Application settings |
| `viewStore` | UI view state (panels, layouts) |
| `compareStore` | Traffic comparison state |

**Dependencies:** `@nectoproxy/shared`, `react`, `vite`, `tailwindcss`, `zustand`, `socket.io-client`

---

### nectoproxy (CLI)

**Path:** `apps/cli/`

**Purpose:** The command-line interface and the npm package that end users install. It bundles the compiled Web UI and orchestrates all other packages.

**Commands:**

| Command | Description |
|---------|-------------|
| `nectoproxy start` | Start the proxy server and Web UI |
| `nectoproxy cert` | Certificate management (install, path, clear-cache) |
| `nectoproxy sessions` | Session management (list, create, delete) |

**How `start` works:**
1. Initializes the SQLite database via `@nectoproxy/storage`.
2. Initializes the certificate manager via `@nectoproxy/certs`.
3. Creates or resumes an active session.
4. Creates the `ProxyServer` from `@nectoproxy/core`.
5. Creates the Express app and Socket.IO server from `@nectoproxy/server`, serving the bundled Web UI from `apps/cli/dist/web-ui/`.
6. Connects proxy events (traffic, breakpoints, WebSocket, errors) to the Socket.IO server and database.
7. Starts both servers and optionally opens the browser.

**Dependencies:** All packages. `commander`, `chalk`, `ora`, `open`

---

## Data Flow

The following diagram shows how data flows through the system when a browser makes an HTTPS request through NectoProxy:

```
 Browser                NectoProxy                           Internet
    |                       |                                    |
    |  CONNECT example.com  |                                    |
    |---------------------->|                                    |
    |  200 Connection Est.  |                                    |
    |<----------------------|                                    |
    |                       |                                    |
    |  TLS Handshake        |  (uses generated cert)             |
    |<--------------------->|                                    |
    |                       |                                    |
    |  GET /api/data        |                                    |
    |  (encrypted)          |                                    |
    |---------------------->|                                    |
    |                       |                                    |
    |                       |  1. Decrypt request                |
    |                       |  2. Evaluate Rules                 |
    |                       |  3. Check Breakpoints              |
    |                       |  4. Apply Network Conditioning     |
    |                       |  5. Emit traffic:new via Socket.IO |
    |                       |                                    |
    |                       |  GET /api/data (new TLS)           |
    |                       |----------------------------------->|
    |                       |                                    |
    |                       |  200 OK + JSON body                |
    |                       |<-----------------------------------|
    |                       |                                    |
    |                       |  6. Decompress response            |
    |                       |  7. Evaluate response rules        |
    |                       |  8. Check response breakpoints     |
    |                       |  9. Apply response throttling      |
    |                       | 10. Save to SQLite (async)         |
    |                       | 11. Emit traffic:update via        |
    |                       |     Socket.IO                      |
    |                       |                                    |
    |  200 OK + JSON body   |                                    |
    |  (re-encrypted)       |                                    |
    |<----------------------|                                    |
    |                       |                                    |


 Web UI (React SPA)
    |
    |  Receives traffic:new via Socket.IO
    |  Updates trafficStore (Zustand)
    |  React re-renders TrafficList
    |
    |  Receives traffic:update via Socket.IO
    |  Updates entry with response data
    |  React re-renders DetailPanel
    |
```

## Build Pipeline

Turborepo manages the build pipeline with the following task configuration:

```json
{
  "build": {
    "dependsOn": ["^build"],
    "outputs": ["dist/**"]
  },
  "dev": {
    "cache": false,
    "persistent": true
  },
  "test": {
    "dependsOn": ["build"]
  }
}
```

- **`^build`** means "build all dependencies first". This ensures `@nectoproxy/shared` is built before `@nectoproxy/core`, which depends on it.
- **`outputs: ["dist/**"]`** tells Turborepo to cache the `dist/` directories. If source files have not changed, the cached output is reused.
- **`test`** depends on `build`, ensuring tests run against compiled code.
