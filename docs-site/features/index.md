---
title: Features Overview
description: Comprehensive overview of all NectoProxy features for HTTP/HTTPS debugging and traffic analysis.
---

# Features Overview

NectoProxy is a full-featured HTTP/HTTPS debugging proxy with a modern Web UI. It provides everything you need to inspect, intercept, modify, and analyze network traffic flowing through your applications.

This page provides a categorized summary of every feature available in NectoProxy. Click through to the individual feature pages for detailed documentation, configuration options, and practical examples.

---

## Core Features

The foundation of NectoProxy's debugging capabilities. These features give you full control over HTTP traffic flowing through the proxy.

### [Traffic Inspection](./traffic-inspection)

Real-time monitoring of all HTTP and HTTPS traffic. View complete request and response details including headers, bodies with syntax highlighting, timing breakdowns, and TLS certificate information. Supports filtering by method, status code, URL, host, and content type. Handles thousands of entries through a virtualized, high-performance list.

### [Rules Engine](./rules-engine)

A powerful rules system that lets you intercept and transform traffic on the fly. Supports 8 distinct rule actions -- Mock, Block, Modify Request, Modify Response, Map Local, Map Remote, Delay, and Throttle. Define matching conditions using URL patterns (glob, wildcard, regex), HTTP methods, headers, and body content. Rules are evaluated by priority and can be toggled on and off individually.

### [Breakpoints](./breakpoints)

Pause HTTP requests or responses mid-flight so you can inspect and modify them before they continue. Set conditions based on URL patterns, methods, and headers with AND/OR logic. When a breakpoint triggers, NectoProxy presents the intercepted message in the UI for live editing. Configurable timeout with auto-continue ensures breakpoints do not block traffic indefinitely.

### [Network Conditioning](./network-conditioning)

Simulate real-world network conditions to test how your application behaves under constrained environments. Choose from 11 built-in profiles ranging from Slow 2G to WiFi, or create custom profiles with precise control over download bandwidth, upload bandwidth, latency, jitter, and packet loss. Includes an Offline mode for testing disconnected scenarios.

---

## Protocol Support

NectoProxy goes beyond basic HTTP proxying to support additional protocols and advanced networking scenarios.

### [WebSocket Support](./websocket-support)

Full inspection of WebSocket (WS) and secure WebSocket (WSS) connections. Capture and display individual frames including text, binary, ping, pong, and close frames. Track frame direction (client-to-server or server-to-client), view opcode information, and stream frames in real time as they are exchanged.

### [SSL Passthrough](./ssl-passthrough)

Bypass MITM decryption for specific domains. Traffic to passthrough domains flows through the proxy without being intercepted or decrypted. Essential for domains that use certificate pinning, financial services, or situations where compliance requirements prevent traffic inspection. Supports wildcard domain patterns.

### [DNS Mapping](./dns-mapping)

Override DNS resolution for specific domains by mapping them to custom IP addresses. Useful for redirecting traffic to staging servers, testing against local development environments, or performing A/B testing across different backends -- all without modifying system DNS or hosts files.

### [Upstream Proxy](./upstream-proxy)

Chain NectoProxy with another upstream proxy. Supports HTTP, HTTPS, SOCKS4, and SOCKS5 protocols with optional authentication. Configure bypass rules to exclude specific domains from upstream routing. Ideal for corporate proxy environments, routing through Tor, or VPN integration.

---

## Analysis & Export

Tools for deeper analysis, sharing, and automation of captured traffic data.

### [HAR Export & Import](./har-export-import)

Export captured sessions to the industry-standard HTTP Archive (HAR 1.2) format. Import HAR files from other tools such as Chrome DevTools or Charles Proxy. Export entire sessions or selected entries. Share captured traffic with teammates for collaborative debugging.

### [Code Generation](./code-generation)

Generate ready-to-use code snippets from any captured request. Supports 8 languages and tools: cURL, Python (requests), Node.js (fetch), Go (net/http), PHP (cURL), Rust (reqwest), HTTPie, and PowerShell (Invoke-WebRequest). Copy generated code to your clipboard with a single click.

### [Request Replay](./request-replay)

Re-send any captured request with optional modifications. Edit the URL, method, headers, or body before replaying. Compare the replayed response against the original to identify differences. Valuable for regression testing and debugging intermittent issues.

### [Request Comparison](./request-comparison)

Select any two traffic entries and view a side-by-side diff. Compare headers, bodies, and metadata with visual highlighting of additions, removals, and modifications. JSON-aware diffing ensures structured data is compared meaningfully. Useful for before-and-after testing workflows.

### [Security Scanning](./security-scanning)

Automated security analysis of captured traffic. Four built-in scanners check for missing security headers, insecure cookie attributes, overly permissive CORS configurations, and information disclosure. Each finding includes a severity level (Critical, High, Medium, Low, Info) and actionable remediation guidance.

### [Annotations](./annotations)

Add text notes and color-coded tags to any traffic entry. Mark important requests, leave context for teammates, or organize findings during a debugging session. Annotations are searchable and timestamped, making it easy to revisit specific observations later.

---

## UI Features

The NectoProxy Web UI is designed for efficiency. These features help you organize, navigate, and find traffic quickly.

### [Sessions](./sessions)

Organize captured traffic into named sessions. Create separate sessions for different debugging tasks, switch between them without losing data, and view per-session statistics including request count and total bytes transferred. Export individual sessions for archiving or sharing.

### [Dashboard](./dashboard)

A visual analytics panel with real-time charts and statistics. View requests per second, error rates, response time histograms, traffic by domain, status code distribution, and top slowest requests. Statistical summary cards show total requests, average response time, and error rate at a glance.

### [Search & Filtering](./search)

Find traffic quickly with the filter bar supporting method, status code, URL, host, and content type filters. Use global search across all sessions with `Ctrl+Shift+F`. Access the command palette with `Ctrl+K` / `Cmd+K` for quick navigation. Search includes autocomplete suggestions and remembers recent queries.

### [Keyboard Shortcuts](./keyboard-shortcuts)

Navigate and control NectoProxy entirely from the keyboard. Shortcuts cover navigation, traffic control (pause, resume, clear), panel toggles, search, and the command palette. A built-in keyboard shortcuts help panel displays all available bindings.

---

::: tip Getting Started
If you are new to NectoProxy, start with the [Traffic Inspection](./traffic-inspection) feature to understand the basics of capturing and viewing HTTP traffic. Then explore the [Rules Engine](./rules-engine) to learn how to modify traffic on the fly.
:::

::: info Feature Requests
NectoProxy is under active development. If you have feature requests or suggestions, please open an issue on the [GitHub repository](https://github.com/nicktecno/nectoproxy).
:::
