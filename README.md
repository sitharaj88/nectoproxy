# ProxyScope

A powerful HTTP/HTTPS debugging proxy with a modern Web UI. A free, open-source alternative to Charles Proxy and Fiddler.

**Intercept, inspect, modify, and replay HTTP/HTTPS traffic** with real-time monitoring, traffic rules, breakpoints, and more.

## Installation

```bash
npm install -g proxyscope
```

Or run directly with npx:

```bash
npx proxyscope start
```

**Requirements:** Node.js 20 or later.

## Quick Start

```bash
# Start the proxy server and Web UI
proxyscope start

# The proxy starts on port 8888, Web UI on port 8889
# Your browser will open automatically
```

### Configure Your Browser/System

1. Set your HTTP proxy to `127.0.0.1:8888`
2. Install the CA certificate to inspect HTTPS traffic:
   ```bash
   proxyscope cert --install
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
proxyscope start [options]
  -p, --port <port>       Proxy port (default: 8888)
  -u, --ui-port <port>    Web UI port (default: 8889)
  --host <host>           Host to bind to (default: 127.0.0.1)
  --no-open               Don't auto-open browser

# Certificate management
proxyscope cert --install       Show CA certificate installation instructions
proxyscope cert --path          Print CA certificate file path
proxyscope cert --clear-cache   Clear cached domain certificates

# Session management
proxyscope sessions --list            List all sessions
proxyscope sessions --create <name>   Create a new session
proxyscope sessions --delete <id>     Delete a session

# Version
proxyscope --version
```

## Certificate Setup

To inspect HTTPS traffic, install the ProxyScope CA certificate in your browser/system:

### macOS
```bash
sudo security add-trusted-cert -d -r trustRoot \
  -k /Library/Keychains/System.keychain \
  ~/.proxyscope/certs/ca.pem
```

### Windows (PowerShell as Administrator)
```powershell
Import-Certificate -FilePath "$env:USERPROFILE\.proxyscope\certs\ca.pem" `
  -CertStoreLocation Cert:\LocalMachine\Root
```

### Linux (Ubuntu/Debian)
```bash
sudo cp ~/.proxyscope/certs/ca.pem /usr/local/share/ca-certificates/proxyscope-ca.crt
sudo update-ca-certificates
```

### Firefox (all platforms)
1. Settings > Privacy & Security > Certificates > View Certificates
2. Authorities tab > Import > Select `~/.proxyscope/certs/ca.pem`
3. Check "Trust this CA to identify websites"

## Comparison

| Feature | ProxyScope | Charles Proxy | Fiddler | mitmproxy |
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
proxyscope/
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
git clone https://github.com/user/proxyscope.git
cd proxyscope

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run in development mode (watch mode)
pnpm dev

# Run tests
pnpm test
```

## Data Storage

All data is stored locally in `~/.proxyscope/`:
- `~/.proxyscope/certs/` — CA and domain certificates
- `~/.proxyscope/proxyscope.db` — SQLite database (sessions, traffic, rules, settings)

## License

[MIT](LICENSE)
