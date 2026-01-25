# ProxyScope

A powerful HTTP/HTTPS debugging proxy with a Web UI - a modern alternative to Charles Proxy.

## Features

- **HTTP/HTTPS Interception**: Auto-generates SSL certificates for HTTPS MITM
- **Real-time Traffic Monitoring**: Virtualized list handles thousands of requests
- **Web-based UI**: Modern React dashboard with dark theme
- **Traffic Filtering**: Filter by method, status, URL, host
- **Request/Response Inspection**: View headers, body, timing
- **Session Management**: Save and organize traffic sessions
- **Cross-platform**: Works on macOS, Windows, and Linux

## Quick Start

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Start the proxy
pnpm --filter proxyscope start
```

The proxy will start on port 8888 and the Web UI on port 8889.

## Configure Your Browser

1. Set your browser's proxy to `127.0.0.1:8888`
2. Install the CA certificate to inspect HTTPS traffic:
   ```bash
   proxyscope cert --install
   ```

## Project Structure

```
proxyscope/
├── apps/
│   ├── cli/          # Command-line interface
│   └── web/          # React Web UI
├── packages/
│   ├── certs/        # SSL certificate generation
│   ├── core/         # Proxy server engine
│   ├── server/       # Express API + Socket.IO
│   ├── shared/       # Shared types
│   └── storage/      # SQLite database layer
```

## CLI Commands

```bash
# Start the proxy
proxyscope start [options]
  -p, --port <port>     Proxy port (default: 8888)
  -u, --ui-port <port>  Web UI port (default: 8889)
  --no-open             Don't auto-open browser

# Certificate management
proxyscope cert --install    # Show install instructions
proxyscope cert --path       # Show certificate path
proxyscope cert --clear-cache  # Clear domain cert cache

# Session management
proxyscope sessions --list
proxyscope sessions --create <name>
proxyscope sessions --delete <id>
```

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Build all packages
pnpm build

# Run tests
pnpm test
```

## Tech Stack

- **Runtime**: Node.js 20+, TypeScript
- **Monorepo**: pnpm workspaces + Turborepo
- **Proxy**: http-mitm-proxy, node-forge
- **Storage**: better-sqlite3 + Drizzle ORM
- **API**: Express + Socket.IO
- **UI**: React 18 + Vite + TailwindCSS
- **State**: Zustand + React Query

## License

MIT
