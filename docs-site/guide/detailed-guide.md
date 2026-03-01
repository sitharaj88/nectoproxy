# Complete Guide to NectoProxy

A comprehensive, step-by-step walkthrough of everything you need to know to get the most out of NectoProxy. By the end of this guide, you will be capturing, inspecting, and manipulating HTTP/HTTPS traffic like a pro.

---

## What You'll Learn

- Install and launch NectoProxy
- Configure your browser or system to route traffic through the proxy
- Install the CA certificate for HTTPS inspection
- Navigate the Web UI and understand the traffic view
- Create rules to mock, block, modify, and redirect requests
- Use breakpoints to pause and edit requests in real time
- Debug mobile apps on iOS and Android
- Export traffic and generate code snippets

---

## Prerequisites

::: tip Before You Begin
Make sure you have the following:
- **Node.js 20 or later** — Check with `node -v`
- A modern browser (Chrome, Firefox, Edge, or Safari)
- Terminal / command-line access
:::

---

## Step 1: Install NectoProxy

Choose your preferred installation method:

::: code-group

```bash [npm (Global)]
npm install -g nectoproxy
```

```bash [npx (No Install)]
npx nectoproxy start
```

```bash [pnpm]
pnpm add -g nectoproxy
```

:::

::: details Build from Source
If you want to build from the repository:

```bash
git clone https://github.com/sitharaj88/nectoproxy.git
cd nectoproxy
pnpm install
pnpm build
node apps/cli/dist/index.js start
```
:::

---

## Step 2: Start NectoProxy

Launch NectoProxy from your terminal:

```bash
nectoproxy start
```

You will see output like this:

```
  NectoProxy - HTTP/HTTPS Debugging Proxy

  Proxy Server: http://192.168.1.42:8888
  Web UI:       http://192.168.1.42:8889
  Session:      Default Session

  CA Certificate: ~/.nectoproxy/certs/ca.pem
  Install the CA certificate to inspect HTTPS traffic.
  Run: nectoproxy cert --install for instructions.

  Opening http://192.168.1.42:8889 in your browser...
  Press Ctrl+C to stop.
```

NectoProxy automatically detects your LAN IP address and displays it. Two services start:

| Service | Port | Purpose |
|---------|------|---------|
| **Proxy Server** | `8888` | The HTTP/HTTPS MITM proxy |
| **Web UI** | `8889` | The browser-based dashboard |

::: tip Custom Ports
Use `-p` and `-u` flags if the default ports are taken:
```bash
nectoproxy start -p 9090 -u 9091
```
:::

::: warning Network Exposure
By default, NectoProxy listens on all interfaces (`0.0.0.0`), so it is accessible from other devices on your LAN. On untrusted networks, restrict to localhost:
```bash
nectoproxy start --host 127.0.0.1
```
:::

---

## Step 3: Configure Your Proxy

Point your browser or system to route HTTP/HTTPS traffic through NectoProxy.

### System-Wide Proxy (Recommended)

::: code-group

```text [macOS]
System Settings > Network > Wi-Fi > Details > Proxies

1. Enable "Web Proxy (HTTP)"
   - Server: localhost
   - Port: 8888

2. Enable "Secure Web Proxy (HTTPS)"
   - Server: localhost
   - Port: 8888

3. Click OK > Apply
```

```text [Windows]
Settings > Network & Internet > Proxy > Manual proxy setup

1. Toggle "Use a proxy server" ON
2. Address: localhost
3. Port: 8888
4. Click Save
```

```text [Linux]
Settings > Network > Network Proxy > Manual

1. HTTP Proxy: localhost : 8888
2. HTTPS Proxy: localhost : 8888
3. Apply system-wide
```

:::

### Browser Extension (Alternative)

Use [FoxyProxy](https://getfoxyproxy.org/) or [Proxy SwitchyOmega](https://github.com/nicehash/nicehash-SwitchyOmega) to route only browser traffic:

| Setting | Value |
|---------|-------|
| Protocol | HTTP |
| Server | `localhost` |
| Port | `8888` |

::: warning
Configure **both** HTTP and HTTPS proxy settings to point to `localhost:8888`. NectoProxy handles HTTPS via the HTTP CONNECT method.
:::

---

## Step 4: Install the CA Certificate

To inspect HTTPS traffic without browser warnings, you must install and trust the NectoProxy CA certificate.

```bash
nectoproxy cert --install
```

This prints platform-specific instructions. Here are quick paths for each OS:

::: code-group

```bash [macOS]
sudo security add-trusted-cert -d -r trustRoot \
  -k /Library/Keychains/System.keychain \
  ~/.nectoproxy/certs/ca.pem
```

```powershell [Windows (Admin)]
Import-Certificate -FilePath "$env:USERPROFILE\.nectoproxy\certs\ca.pem" `
  -CertStoreLocation Cert:\LocalMachine\Root
```

```bash [Linux (Ubuntu/Debian)]
sudo cp ~/.nectoproxy/certs/ca.pem \
  /usr/local/share/ca-certificates/nectoproxy-ca.crt
sudo update-ca-certificates
```

:::

::: details Firefox Users
Firefox uses its own certificate store. You must import the certificate separately:

1. Settings > Privacy & Security > Certificates > View Certificates
2. Authorities tab > Import
3. Select `~/.nectoproxy/certs/ca.pem`
4. Check "Trust this CA to identify websites"
:::

For detailed per-platform guides, see:
- [macOS](/certificate/macos) | [Windows](/certificate/windows) | [Linux](/certificate/linux) | [Firefox](/certificate/firefox) | [Mobile](/certificate/mobile)

---

## Step 5: Your First Traffic Capture

With the proxy configured and the certificate installed, start browsing. Every request flows through NectoProxy and appears in the Web UI in real time.

Open the Web UI at [http://localhost:8889](http://localhost:8889). You will see the main interface:

### Traffic List

The left panel shows a live-updating list of all captured requests:

| Column | Description |
|--------|-------------|
| **Method** | HTTP method (GET, POST, PUT, etc.) — color-coded |
| **Status** | Response status code — green (2xx), blue (3xx), yellow (4xx), red (5xx) |
| **Host** | Target domain |
| **Path** | Request URL path |
| **Type** | Content type (HTML, JSON, image, etc.) |
| **Size** | Response body size |
| **Time** | Total round-trip duration |

### Detail Panel

Click any request in the traffic list to open the detail panel on the right. You can inspect:

- **Request** — Method, URL, headers, query parameters, and body
- **Response** — Status, headers, and body with syntax highlighting
- **Timing** — Connection, TLS handshake, time-to-first-byte, download duration
- **TLS** — Certificate details for HTTPS requests

::: tip Filtering Traffic
Use the filter bar at the top to narrow down traffic by:
- **Method** — GET, POST, PUT, DELETE, etc.
- **Status code** — 2xx, 3xx, 4xx, 5xx
- **Host** — Filter by domain
- **Content type** — HTML, JSON, images, etc.
- **Search** — Free-text search across URLs and headers
:::

::: details No Traffic Appearing?
If requests are not showing up:
1. Verify your browser proxy is set to `localhost:8888`
2. Make sure NectoProxy is still running in the terminal
3. Check that recording is not paused (look for the record button in the header)
4. If only HTTP works but not HTTPS, install the CA certificate (Step 4)
:::

---

## Step 6: Creating Rules

Rules let you automatically modify, mock, block, or redirect matching requests — without changing any server or client code.

### Create a Mock Rule

Let's mock an API response:

1. Open the **Rules** tab in the Web UI sidebar.
2. Click **Add Rule**.
3. Configure the rule:
   - **Name**: `Mock User API`
   - **Match URL**: `*/api/users*`
   - **Action**: Mock
   - **Status Code**: `200`
   - **Response Body**:
     ```json
     {
       "users": [
         { "id": 1, "name": "Test User" }
       ]
     }
     ```
   - **Content-Type**: `application/json`
4. Toggle the rule **ON**.

Now any request matching `*/api/users*` will return your mock response instead of hitting the real server.

### Available Rule Actions

| Action | What It Does |
|--------|-------------|
| **Mock** | Return a custom response without hitting the server |
| **Block** | Reject the request entirely |
| **Modify Request** | Change headers, query params, or body before forwarding |
| **Modify Response** | Change status, headers, or body of the server's response |
| **Map Local** | Serve a file from your local filesystem |
| **Map Remote** | Redirect the request to a different URL |
| **Delay** | Add artificial latency |
| **Throttle** | Limit bandwidth to simulate slow connections |

See the [Rules Engine](/features/rules-engine) documentation for advanced patterns.

---

## Step 7: Using Breakpoints

Breakpoints let you pause a request or response mid-flight, inspect it, modify it, and then forward it.

### Set a Breakpoint

1. Open the **Breakpoints** tab in the sidebar.
2. Click **Add Breakpoint**.
3. Configure:
   - **Match URL**: `*/api/checkout*`
   - **Break on**: Request (before it reaches the server)
4. Enable the breakpoint.

### Intercept and Modify

1. Trigger a matching request (e.g., browse to a checkout page).
2. The request pauses and a notification appears in the Web UI.
3. You can now:
   - **Edit headers** — Add, remove, or modify any header
   - **Edit body** — Change the request payload
   - **Edit URL** — Redirect to a different endpoint
4. Click **Resume** to forward the modified request, or **Abort** to cancel it.

::: tip
Breakpoints are invaluable for debugging API integrations. You can test how your app handles different responses by modifying them on the fly.
:::

---

## Step 8: Mobile Debugging

NectoProxy makes it easy to debug traffic from iOS and Android devices.

### Quick Setup

1. **Start NectoProxy** — it listens on all interfaces by default:
   ```bash
   nectoproxy start
   ```
   Note the LAN IP displayed at startup (e.g., `192.168.1.42`).

2. **Configure your phone's Wi-Fi proxy**:
   - Server: Your computer's LAN IP (e.g., `192.168.1.42`)
   - Port: `8888`

3. **Install the CA certificate on your phone**:
   - Open your phone's browser and navigate to:
     ```
     http://<your-lan-ip>:8889/cert
     ```
   - Or scan the QR code in the NectoProxy Settings panel.

4. **Browse on your phone** — traffic appears in the Web UI.

::: tip
Make sure your phone and computer are on the **same Wi-Fi network**. See the full [Mobile Debugging Tutorial](/guides/debugging-mobile) for platform-specific steps.
:::

---

## Step 9: Advanced Features

### Code Generation

Right-click any captured request and select **Generate Code**. NectoProxy generates equivalent code in:

- cURL
- Python (requests)
- Node.js (fetch)
- Go (net/http)
- PHP (cURL)
- Rust (reqwest)

### HAR Export / Import

Export captured traffic as HAR files for sharing or analysis:

1. Click the **Export** button in the toolbar.
2. Select requests to export (or export all).
3. Save the `.har` file.

Import HAR files from Chrome DevTools, Firefox, Charles Proxy, or Fiddler.

### Request Comparison

Select two requests in the traffic list, right-click, and choose **Compare**. NectoProxy shows a side-by-side diff of:
- Headers
- Query parameters
- Request/response bodies

### Request Replay

Re-send any captured request with a single click:

1. Select a request in the traffic list.
2. Click the **Replay** button.
3. The request is re-sent and the new response appears alongside the original.

### Network Conditioning

Simulate real-world network conditions:

1. Open **Settings** > **Network Profile**.
2. Choose a preset (3G, Slow Wi-Fi, Satellite) or create a custom profile.
3. Configure bandwidth limits, latency, and packet loss.

### Dashboard

The Dashboard tab provides visual analytics:
- Request volume over time
- Status code distribution
- Top domains by request count
- Response time distribution

---

## Next Steps

You are now ready to use NectoProxy for serious debugging work. Explore these resources to go deeper:

| Resource | Description |
|----------|-------------|
| [Rules Engine](/features/rules-engine) | Advanced rule matching and actions |
| [Breakpoints](/features/breakpoints) | Detailed breakpoint configuration |
| [Network Conditioning](/features/network-conditioning) | Simulate network profiles |
| [WebSocket Support](/features/websocket-support) | Inspect WebSocket frames |
| [SSL Passthrough](/features/ssl-passthrough) | Skip HTTPS interception for specific domains |
| [DNS Mapping](/features/dns-mapping) | Redirect domains to custom IPs |
| [API Reference](/api/) | Automate NectoProxy with the REST API |
| [Keyboard Shortcuts](/features/keyboard-shortcuts) | Speed up your workflow |
| [Tutorials](/guides/) | Practical walkthroughs for common tasks |

---

::: tip Need Help?
- Run `nectoproxy --help` for CLI usage
- Check the [Troubleshooting](/troubleshooting/) section
- Report issues on [GitHub](https://github.com/sitharaj88/nectoproxy/issues)
:::
