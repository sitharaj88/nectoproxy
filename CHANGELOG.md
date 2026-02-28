# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2024-12-01

### Added
- HTTP/HTTPS MITM proxy with auto-generated per-domain SSL certificates
- Real-time traffic monitoring via Socket.IO with virtualized list
- Request/response inspection (headers, body with syntax highlighting, timing)
- WebSocket frame capture and inspection (WS/WSS)
- Rules engine with 8 actions: mock, block, modify-request, modify-response, map-local, map-remote, delay, throttle
- Breakpoints for pausing and inspecting requests/responses
- Network conditioning (bandwidth throttling, latency, packet loss)
- HAR import/export (HTTP Archive 1.2 format)
- Code generation for cURL, Python, Node.js, Go, PHP, Rust
- Request comparison with side-by-side diff
- Request replay with response comparison
- Dashboard with traffic analytics charts
- Security scanning for captured traffic
- Session management for organizing traffic
- Upstream proxy support (HTTP, HTTPS, SOCKS4, SOCKS5)
- Traffic filtering by method, status, URL, host, content type
- Modern React Web UI with dark and light themes
- Keyboard shortcuts and command palette
- Cross-platform CA certificate installation instructions
- CLI with `start`, `cert`, and `sessions` commands
- SQLite database for persistent storage
