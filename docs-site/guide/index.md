# What is NectoProxy?

NectoProxy is a powerful, open-source **man-in-the-middle (MITM) proxy** for intercepting, inspecting, modifying, and replaying HTTP/HTTPS traffic. It ships with a modern **Web UI** built on React, giving you a visual dashboard to debug network requests in real time -- no native app installation required.

Think of it as a **free, cross-platform alternative** to Charles Proxy and Fiddler, purpose-built for the modern development workflow.

## Who is NectoProxy For?

NectoProxy is designed for anyone who needs deep visibility into HTTP traffic:

- **Web Developers** -- Debug API calls, inspect headers, troubleshoot CORS issues, and mock responses during frontend development.
- **Mobile Developers** -- Proxy iOS and Android device traffic through NectoProxy to inspect network requests from native apps.
- **QA Engineers** -- Simulate network conditions, inject failures, and verify application behavior under adverse conditions.
- **Security Researchers** -- Analyze request/response patterns, scan for security vulnerabilities, and inspect TLS handshake details.
- **Backend Engineers** -- Trace requests through microservices, compare API versions, and generate client code from captured traffic.

## Key Features

### Traffic Inspection

Intercept and inspect every HTTP and HTTPS request flowing through the proxy. NectoProxy performs MITM decryption by generating per-domain SSL certificates on the fly, signed by its own root CA. Traffic streams into the Web UI in real time via WebSocket, with a virtualized list capable of handling thousands of entries.

### Rules Engine

The rules engine provides **8 built-in actions** for controlling traffic without writing code:

| Action | Description |
|---|---|
| **Mock** | Return custom responses without hitting the upstream server |
| **Block** | Reject matching requests entirely |
| **Modify Request** | Add, remove, or change headers, query parameters, and body content |
| **Modify Response** | Alter status codes, response headers, or response bodies |
| **Map Local** | Serve files directly from your local filesystem |
| **Map Remote** | Redirect requests to a different URL |
| **Delay** | Introduce artificial latency with configurable variance |
| **Throttle** | Limit bandwidth to simulate slow connections |

### Breakpoints

Pause any request or response mid-flight for **manual inspection and modification** before forwarding. Breakpoints let you edit headers, bodies, and status codes interactively -- ideal for testing edge cases without modifying application code.

### Network Conditioning

Simulate real-world network conditions by applying bandwidth limits, latency, and packet loss. Choose from built-in profiles (3G, slow Wi-Fi, satellite) or define custom profiles to match specific environments.

### Code Generation

Generate equivalent code from any captured request in **8 languages and tools**:

- cURL
- Python (requests)
- Node.js (fetch / axios)
- Go (net/http)
- PHP (cURL)
- Rust (reqwest)
- And more

### Security Scanning

Run automated security scans against captured traffic to identify potential vulnerabilities, insecure headers, mixed content issues, and other common security concerns.

### Additional Capabilities

- **HAR Import/Export** -- Share and analyze traffic using the standard HTTP Archive format.
- **Request Comparison** -- Diff two captured requests side by side to spot differences.
- **Request Replay** -- Re-send any captured request and compare the new response against the original.
- **Dashboard & Analytics** -- Visualize traffic patterns with charts and statistics.
- **Session Management** -- Organize captured traffic into named sessions.
- **Filtering** -- Filter by HTTP method, status code, URL pattern, host, or content type.
- **Command Palette** -- Quick keyboard-driven access to all features.

## Architecture

NectoProxy is structured as a **monorepo** with clearly separated packages:

```
nectoproxy/
├── apps/
│   ├── cli/            # CLI entry point (the published npm package)
│   └── web/            # React Web UI (bundled into the CLI at build time)
├── packages/
│   ├── core/           # MITM proxy engine (net/tls/http)
│   ├── server/         # Express REST API + Socket.IO real-time layer
│   ├── storage/        # SQLite database via better-sqlite3 + Drizzle ORM
│   ├── certs/          # SSL/TLS certificate generation using node-forge
│   └── shared/         # TypeScript type definitions shared across packages
```

### How the Pieces Fit Together

1. The **CLI** (`apps/cli`) is the user-facing entry point. When you run `nectoproxy start`, it orchestrates the proxy engine, API server, and Web UI.
2. The **Core** package (`packages/core`) implements the MITM proxy using native Node.js `http`, `net`, and `tls` modules. It intercepts both HTTP and HTTPS (via CONNECT tunneling).
3. The **Certs** package (`packages/certs`) generates the root CA certificate and dynamically creates per-domain certificates signed by that CA.
4. The **Server** package (`packages/server`) exposes a REST API (Express) and real-time events (Socket.IO) that the Web UI consumes.
5. The **Storage** package (`packages/storage`) persists sessions, captured traffic, rules, and settings to a local SQLite database.
6. The **Web** app (`apps/web`) is a React 18 SPA that provides the dashboard, traffic viewer, rules editor, and all visual tooling.

## Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | Node.js 20+, TypeScript |
| **Monorepo** | pnpm workspaces + Turborepo |
| **Proxy Engine** | Native Node.js `http` / `net` / `tls`, node-forge |
| **Database** | better-sqlite3 + Drizzle ORM |
| **API** | Express + Socket.IO |
| **Web UI** | React 18, Vite, TailwindCSS, Zustand, React Query |

## Open Source

NectoProxy is released under the **MIT License** and is fully open source. It is created and maintained by **Sitharaj Seenivasan**.

- **Repository**: [github.com/sitharaj88/nectoproxy](https://github.com/sitharaj88/nectoproxy)
- **Author**: [sitharaj.in](https://sitharaj.in)
- **License**: MIT

::: tip Community Contributions Welcome
NectoProxy is open to contributions of all kinds -- bug reports, feature requests, documentation improvements, and code contributions. Check the repository for contribution guidelines.
:::
