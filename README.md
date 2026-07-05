# NectoProxy

[![CI](https://github.com/sitharaj88/nectoproxy/actions/workflows/ci.yml/badge.svg)](https://github.com/sitharaj88/nectoproxy/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/nectoproxy.svg)](https://www.npmjs.com/package/nectoproxy)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A powerful HTTP/HTTPS debugging proxy with a modern Web UI. A free, open-source alternative to Charles Proxy and Fiddler.

**Intercept, inspect, modify, and replay HTTP/HTTPS traffic** with real-time monitoring, traffic rules, breakpoints, and more.

**Documentation:** [https://sitharaj88.github.io/nectoproxy/](https://sitharaj88.github.io/nectoproxy/)

## Installation

```bash
npm install -g nectoproxy
```

Or run directly with npx:

```bash
npx nectoproxy start
```

### Install via Homebrew

```bash
brew install sitharaj88/tap/nectoproxy
```

> The Homebrew formula lives in [`Formula/nectoproxy.rb`](Formula/nectoproxy.rb) and installs the published npm package. Requires `node`.

**Requirements:** Node.js 20 or later.

## Quick Start

```bash
# Start the proxy server and Web UI
nectoproxy start

# The proxy starts on port 8888, Web UI on port 8889
# Your browser will open automatically
```

### Configure Your Browser/System

1. Set your HTTP proxy to `localhost:8888`
2. Install the CA certificate to inspect HTTPS traffic:
   ```bash
   nectoproxy cert --install
   ```

## Features

### Traffic Inspection
- **HTTP/HTTPS Interception** — MITM proxy with auto-generated per-domain SSL certificates
- **Real-time Monitoring** — Watch requests/responses stream in via WebSocket with virtualized list for thousands of entries
- **Request/Response Details** — Inspect headers, body (with syntax highlighting), timing, and TLS info
- **WebSocket Support** — Capture and inspect WebSocket frames (WS/WSS)

### Traffic Control
- **Rules Engine** — 8 built-in actions:
  - **Mock** — Return custom responses without hitting the server
  - **Block** — Reject requests entirely
  - **Modify Request** — Add/remove headers, change query params, replace body
  - **Modify Response** — Change status, headers, or response body
  - **Map Local** — Serve files from your local filesystem
  - **Map Remote** — Redirect requests to a different URL
  - **Delay** — Add artificial latency with optional variance
  - **Throttle** — Limit bandwidth to simulate slow connections
- **Breakpoints** — Pause requests/responses for manual inspection and modification before forwarding
- **Network Conditioning** — Simulate various network profiles (3G, slow Wi-Fi, etc.) with bandwidth, latency, and packet loss controls

### Analysis & Export
- **HAR Import/Export** — Standard HTTP Archive format for sharing and analysis
- **Code Generation** — Generate equivalent code in 7 languages: cURL, Python, Node.js, Go, PHP, Rust, and more
- **Request Comparison** — Diff two requests side-by-side
- **Request Replay** — Re-send captured requests and compare responses
- **Dashboard** — Visual analytics with traffic charts and statistics
- **Security Scanning** — Identify potential security issues in captured traffic

### Developer Experience
- **Modern Web UI** — React dashboard with dark and light themes
- **Keyboard Shortcuts** — Navigate and control the proxy efficiently
- **Command Palette** — Quick access to all features
- **Session Management** — Organize traffic into named sessions
- **Upstream Proxy** — Chain through HTTP, HTTPS, SOCKS4, or SOCKS5 proxies
- **Filtering** — Filter traffic by method, status code, URL, host, and content type

## CLI Reference

```bash
# Start the proxy
nectoproxy start [options]
  -p, --port <port>       Proxy port (default: 8888)
  -u, --ui-port <port>    Web UI port (default: 8889)
  --host <host>           Host to bind to (default: 0.0.0.0)
  --no-open               Don't auto-open browser

# Certificate management
nectoproxy cert --install       Show CA certificate installation instructions
nectoproxy cert --path          Print CA certificate file path
nectoproxy cert --clear-cache   Clear cached domain certificates

# Session management
nectoproxy sessions --list            List all sessions
nectoproxy sessions --create <name>   Create a new session
nectoproxy sessions --delete <id>     Delete a session

# Version
nectoproxy --version
```

## Certificate Setup

To inspect HTTPS traffic, install the NectoProxy CA certificate in your browser/system:

### macOS
```bash
sudo security add-trusted-cert -d -r trustRoot \
  -k /Library/Keychains/System.keychain \
  ~/.nectoproxy/certs/ca.pem
```

### Windows (PowerShell as Administrator)
```powershell
Import-Certificate -FilePath "$env:USERPROFILE\.nectoproxy\certs\ca.pem" `
  -CertStoreLocation Cert:\LocalMachine\Root
```

### Linux (Ubuntu/Debian)
```bash
sudo cp ~/.nectoproxy/certs/ca.pem /usr/local/share/ca-certificates/nectoproxy-ca.crt
sudo update-ca-certificates
```

### Firefox (all platforms)
1. Settings > Privacy & Security > Certificates > View Certificates
2. Authorities tab > Import > Select `~/.nectoproxy/certs/ca.pem`
3. Check "Trust this CA to identify websites"

## Comparison

| Feature | NectoProxy | Charles Proxy | Fiddler | mitmproxy |
|---------|-----------|---------------|---------|-----------|
| Price | Free & Open Source | $50 | Free* | Free & Open Source |
| Web UI | Yes | No (native) | No (native) | Yes (mitmweb) |
| HTTPS Interception | Yes | Yes | Yes | Yes |
| WebSocket Inspection | Yes | Yes | Yes | Yes |
| Rules/Rewriting | Yes (8 actions) | Yes | Yes | Yes (scripts) |
| Breakpoints | Yes | Yes | Yes | Yes |
| Network Throttling | Yes | Yes | Yes | No |
| HAR Export | Yes | Yes | Yes | Yes |
| Code Generation | Yes (7 languages) | No | No | No |
| Request Comparison | Yes | No | No | No |
| Cross-platform | Yes | Yes | Windows* | Yes |

*Fiddler Classic is Windows-only; Fiddler Everywhere is cross-platform but paid.

## Architecture

```
nectoproxy/
├── apps/
│   ├── cli/          # CLI entry point (npm package)
│   └── web/          # React Web UI (bundled with CLI)
├── packages/
│   ├── certs/        # SSL/TLS certificate generation (node-forge)
│   ├── core/         # MITM proxy engine (net/tls/http)
│   ├── server/       # Express REST API + Socket.IO
│   ├── shared/       # TypeScript type definitions
│   └── storage/      # SQLite database (better-sqlite3 + Drizzle ORM)
```

## Tech Stack

- **Runtime**: Node.js 20+, TypeScript
- **Monorepo**: pnpm workspaces + Turborepo
- **Proxy**: Native Node.js `http`/`net`/`tls` modules, node-forge for certificates
- **Storage**: better-sqlite3 + Drizzle ORM
- **API**: Express + Socket.IO
- **UI**: React 18 + Vite + TailwindCSS + Zustand + React Query

## Development

```bash
# Clone the repository
git clone https://github.com/sitharaj88/nectoproxy.git
cd nectoproxy

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run in development mode (watch mode)
pnpm dev

# Run tests
pnpm test
```

## Security

NectoProxy separates its **control plane** (the Web UI and REST/WebSocket API you use to inspect traffic) from its **proxy port** (the port your clients connect through).

- **Control plane binds to localhost by default.** The Web UI and API listen on `127.0.0.1` so they are not exposed to your local network. Only processes on your own machine can reach the dashboard and management API.
- **Token-gated access.** The control plane requires a per-run session token. The UI is opened with the token and API/WebSocket requests must present it, so another user on your machine cannot drive your proxy or read captured traffic without the token.
- **Proxy port stays LAN-reachable.** The actual proxy listener is intentionally still bindable on your network (e.g. `0.0.0.0:8888`) so you can point phones, tablets, and other devices at it for capture. Locking down the management surface does not prevent device debugging.

Treat captured traffic as sensitive: it can contain credentials, tokens, and personal data. Only bind the proxy to networks you trust, and clear sessions (`nectoproxy sessions --delete`) when you're done.

## Continuous Integration

Every push to `main` and every pull request runs the [CI workflow](.github/workflows/ci.yml), which installs with a frozen lockfile and runs `pnpm build`, `pnpm lint`, and `pnpm test` on Node 20 and 22.

Pushing a `v*` tag triggers the [release workflow](.github/workflows/release.yml), which builds, tests, and publishes the `nectoproxy` package to npm with [provenance](https://docs.npmjs.com/generating-provenance-statements) and creates a GitHub Release.

## Data Storage

All data is stored locally in `~/.nectoproxy/`:
- `~/.nectoproxy/certs/` — CA and domain certificates
- `~/.nectoproxy/nectoproxy.db` — SQLite database (sessions, traffic, rules, settings)

## Author

**Sitharaj Seenivasan**

- Website: [sitharaj.in](https://sitharaj.in)
- LinkedIn: [sitharaj08](https://linkedin.com/in/sitharaj08)
- Buy Me a Coffee: [sitharaj88](https://buymeacoffee.com/sitharaj88)

If you find NectoProxy useful, consider supporting the project:

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-sitharaj88-yellow?style=flat-square&logo=buy-me-a-coffee)](https://buymeacoffee.com/sitharaj88)

## License

[MIT](LICENSE) - Copyright (c) 2026 Sitharaj Seenivasan
