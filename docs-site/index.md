---
layout: home

hero:
  name: NectoProxy
  text: HTTP/HTTPS Debugging Proxy
  tagline: A powerful, open-source alternative to Charles Proxy and Fiddler. Intercept, inspect, modify, and replay traffic with a modern Web UI.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/quick-start
    - theme: alt
      text: View on GitHub
      link: https://github.com/sitharaj88/nectoproxy

features:
  - icon: "\U0001F50D"
    title: Traffic Inspection
    details: Real-time HTTP/HTTPS interception with auto-generated SSL certificates, syntax-highlighted body viewer, and WebSocket frame capture.
  - icon: "\U0001F6E0\uFE0F"
    title: Rules Engine
    details: 8 powerful rule actions — Mock, Block, Modify Request/Response, Map Local/Remote, Delay, and Throttle — with flexible URL pattern matching.
  - icon: "\u23F8\uFE0F"
    title: Breakpoints
    details: Pause requests and responses mid-flight. Inspect, modify headers and body, then resume or drop — like a debugger for HTTP traffic.
  - icon: "\U0001F4F6"
    title: Network Conditioning
    details: Simulate real-world network conditions with 11 built-in profiles (2G, 3G, 4G, WiFi, Offline) or create custom throttling rules.
  - icon: "\U0001F4CB"
    title: Code Generation
    details: Generate equivalent code in 8 languages — cURL, Python, Node.js, Go, PHP, Rust, HTTPie, and PowerShell — from any captured request.
  - icon: "\U0001F6E1\uFE0F"
    title: Security Scanning
    details: Automatically detect missing security headers, insecure cookies, CORS misconfigurations, and information disclosure issues.
---

## Quick Install

```bash
npm install -g nectoproxy
nectoproxy start
```

The proxy starts on port **8888**, and the Web UI opens automatically at **http://localhost:8889**.

## Why NectoProxy?

| Feature | NectoProxy | Charles Proxy | Fiddler | mitmproxy |
|---------|:----------:|:-------------:|:-------:|:---------:|
| Price | Free | $50 | Free* | Free |
| Web UI | Yes | No | No | Partial |
| Rules Engine | 8 actions | Yes | Yes | Scripts |
| Breakpoints | Yes | Yes | Yes | Yes |
| Code Generation | 8 languages | No | No | No |
| Request Comparison | Yes | No | No | No |
| Network Throttling | Yes | Yes | Yes | No |
| HAR Export | Yes | Yes | Yes | Yes |
| Open Source | Yes | No | No | Yes |

<small>*Fiddler Classic is Windows-only; Fiddler Everywhere is cross-platform but paid.</small>

## Support the Project

If you find NectoProxy useful, consider [buying me a coffee](https://buymeacoffee.com/sitharaj88).

Built with care by [Sitharaj Seenivasan](https://sitharaj.in).
