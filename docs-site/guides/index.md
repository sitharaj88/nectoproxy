# Tutorials & Guides

Welcome to the NectoProxy tutorials section. These step-by-step guides walk you through real-world debugging scenarios, from mocking APIs to debugging mobile apps to simulating poor network conditions.

## Available Tutorials

### [Mocking APIs](./mocking-apis)

**Difficulty:** Beginner | **Time:** 10 minutes

Build a frontend without a backend. Learn how to create mock rules that return custom JSON responses for any URL pattern, letting you develop and test your application against simulated API endpoints.

**What you will learn:**
- Creating Mock rules in the Rules panel
- Returning custom JSON, status codes, and headers
- Mocking different HTTP methods (GET, POST, PUT, DELETE)
- Simulating error responses and slow APIs

---

### [Debugging Mobile Apps](./debugging-mobile)

**Difficulty:** Intermediate | **Time:** 15 minutes

Capture and inspect HTTP/HTTPS traffic from iOS and Android devices. Learn how to configure your phone to route traffic through NectoProxy and install the CA certificate for HTTPS inspection.

**What you will learn:**
- Binding NectoProxy to all network interfaces
- Configuring Wi-Fi proxy settings on iOS and Android
- Installing the CA certificate on mobile devices
- Using the QR code feature for quick certificate download

---

### [Testing Error Handling](./testing-error-handling)

**Difficulty:** Intermediate | **Time:** 10 minutes

Verify that your application gracefully handles network errors, server failures, rate limiting, and timeouts. Use a combination of Block, Mock, and Delay rules to simulate failure conditions.

**What you will learn:**
- Blocking requests to test connection error handling
- Returning 500 and 503 responses to test server error flows
- Simulating rate limiting with 429 responses and Retry-After headers
- Using delays to trigger client-side timeouts
- Modifying responses on the fly with breakpoints

---

### [Simulating Slow Networks](./simulating-slow-networks)

**Difficulty:** Beginner | **Time:** 10 minutes

Test how your application behaves on slow or unreliable connections. Use NectoProxy's built-in network conditioning presets to simulate everything from 2G mobile to WiFi, or create custom profiles.

**What you will learn:**
- Using the Network Conditioning panel
- Selecting built-in presets (Slow 2G, 3G, 4G, DSL, WiFi, Offline)
- Creating custom network profiles
- Testing progressive loading and lazy-loading behavior
- Combining global conditioning with per-URL throttle rules

---

### [Debugging WebSockets](./debugging-websockets)

**Difficulty:** Intermediate | **Time:** 10 minutes

Inspect WebSocket connections and their individual frames. Learn how to find WebSocket traffic in the NectoProxy UI and analyze frame data, direction, opcodes, and timestamps.

**What you will learn:**
- Identifying WebSocket connections in the traffic list
- Viewing individual WebSocket frames
- Understanding frame direction, opcodes, and data formats
- Filtering for WebSocket traffic
- Troubleshooting common WebSocket issues

---

### [Chaining Proxies](./chaining-proxies)

**Difficulty:** Advanced | **Time:** 10 minutes

Route NectoProxy's outbound traffic through an upstream proxy. Essential for corporate environments with mandatory HTTP proxies, or for routing through SOCKS5 tunnels.

**What you will learn:**
- Configuring HTTP/HTTPS upstream proxies
- Configuring SOCKS4/SOCKS5 upstream proxies
- Setting up proxy authentication
- Creating bypass rules for internal domains
- Common chaining scenarios (corporate proxy, SSH tunnel, Tor)

---

### [Exporting & Importing Traffic](./exporting-traffic)

**Difficulty:** Beginner | **Time:** 5 minutes

Export captured traffic to HAR (HTTP Archive) files for sharing, archiving, or importing into other tools. Import HAR files from Chrome DevTools, Firefox, or other proxy tools.

**What you will learn:**
- Exporting a full session as a HAR file
- Exporting selected entries only
- Importing HAR files from other tools
- Privacy considerations when sharing HAR files
- Working with HAR files across different tools

---

## Prerequisites

Before starting any tutorial, make sure you have:

1. **NectoProxy installed** -- Follow the [installation guide](/guide/) if you have not yet.
2. **NectoProxy running** -- Start it with `nectoproxy start`.
3. **CA certificate installed** -- Required for HTTPS interception. See the [certificate setup](/certificate/) guide.

::: tip
Each tutorial is self-contained. You can jump to any tutorial that matches your current need -- there is no required reading order.
:::
