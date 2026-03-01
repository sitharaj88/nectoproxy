# Quick Start

Get NectoProxy up and running in under five minutes. This guide walks you through the essential steps to start capturing and inspecting HTTP/HTTPS traffic.

## Step 1: Install NectoProxy

Install NectoProxy globally via npm:

```bash
npm install -g nectoproxy
```

::: tip Alternative: Use npx
If you prefer not to install globally, run NectoProxy directly:
```bash
npx nectoproxy start
```
:::

## Step 2: Start the Proxy

Launch NectoProxy from your terminal:

```bash
nectoproxy start
```

You should see output similar to:

```
  NectoProxy v0.1.0

  Proxy Server: http://192.168.1.42:8888
  Web UI:       http://192.168.1.42:8889
```

NectoProxy automatically detects your LAN IP address and displays it at startup. It starts two services:

| Service | Default Address | Purpose |
|---|---|---|
| **Proxy Server** | `localhost:8888` | The HTTP/HTTPS proxy that intercepts traffic |
| **Web UI** | `localhost:8889` | The browser-based dashboard for viewing traffic |

The Web UI opens automatically in your default browser.

## Step 3: Configure Your Browser Proxy

Point your browser (or system) HTTP proxy to NectoProxy so that traffic flows through it.

### Browser Configuration

**Option A: System-wide proxy (recommended for quick testing)**

Configure your operating system's network proxy settings to use `localhost` on port `8888` for both HTTP and HTTPS traffic.

- **macOS**: System Settings > Network > Wi-Fi > Details > Proxies > Enable Web Proxy (HTTP) and Secure Web Proxy (HTTPS), set server to `localhost` and port to `8888`.
- **Windows**: Settings > Network & Internet > Proxy > Manual proxy setup > Use a proxy server > Address `localhost`, Port `8888`.
- **Linux**: Network Settings > Network Proxy > Manual > HTTP/HTTPS Proxy `localhost:8888`.

**Option B: Browser-only proxy extension**

Use a browser extension like [FoxyProxy](https://getfoxyproxy.org/) or [Proxy SwitchyOmega](https://github.com/nicehash/nicehash-SwitchyOmega) to route only browser traffic through NectoProxy without affecting other system traffic.

Set the proxy to:
- **Protocol**: HTTP
- **Server**: `localhost`
- **Port**: `8888`

::: warning HTTPS Proxy Setting
Make sure you configure **both** HTTP and HTTPS proxy settings to point to `localhost:8888`. NectoProxy handles HTTPS interception via the HTTP CONNECT method, so the HTTPS proxy address is the same as the HTTP proxy address.
:::

## Step 4: Install the CA Certificate

To inspect HTTPS traffic, NectoProxy needs its root CA certificate trusted by your system or browser. Without it, you will see SSL certificate warnings for every HTTPS site.

Run the certificate installation helper:

```bash
nectoproxy cert --install
```

This prints platform-specific instructions for installing the CA certificate. Follow the instructions for your operating system:

- [macOS Certificate Setup](/certificate/macos)
- [Windows Certificate Setup](/certificate/windows)
- [Linux Certificate Setup](/certificate/linux)
- [Firefox Certificate Setup](/certificate/firefox)
- [Mobile Devices](/certificate/mobile)

::: tip Quick macOS Install
On macOS, you can install the certificate in one command:
```bash
sudo security add-trusted-cert -d -r trustRoot \
  -k /Library/Keychains/System.keychain \
  ~/.nectoproxy/certs/ca.pem
```
:::

## Step 5: Browse and Inspect Traffic

With the proxy configured and the CA certificate installed, start browsing. Every HTTP and HTTPS request will appear in the NectoProxy Web UI in real time.

Open the Web UI at [http://localhost:8889](http://localhost:8889) and you will see:

1. **Traffic List** -- A live-updating list of all intercepted requests showing method, URL, status code, size, and timing.
2. **Request Details** -- Click any request to inspect its full headers, body (with syntax highlighting), timing breakdown, and TLS information.
3. **Response Details** -- View the complete server response including headers and decoded body content.

::: details What If I Don't See Any Traffic?
If requests are not appearing in the Web UI:

1. **Verify proxy settings** -- Confirm your browser is actually routing through `localhost:8888`. Visit `http://httpbin.org/ip` and check if requests appear.
2. **Check NectoProxy is running** -- Ensure the terminal window running `nectoproxy start` is still active.
3. **Firewall issues** -- Some firewalls or security software may block local proxy connections. Temporarily disable them to test.
4. **HTTPS without certificate** -- If HTTP requests appear but HTTPS do not, you need to install the CA certificate (Step 4).
:::

## Next Steps

Now that you have NectoProxy running and capturing traffic, explore these powerful features:

### Traffic Rules

Create rules to automatically modify, mock, block, delay, or redirect matching requests. Rules let you test your application against different scenarios without changing any code.

### Breakpoints

Set breakpoints on specific requests or responses to pause them mid-flight. You can manually inspect and modify headers, bodies, and status codes before forwarding -- perfect for debugging tricky API interactions.

### Network Conditioning

Simulate slow or unreliable network conditions to test how your application handles real-world scenarios. Apply bandwidth limits, latency, and packet loss using built-in profiles like 3G, slow Wi-Fi, or create custom profiles.

### Code Generation

Capture a request and instantly generate equivalent code in cURL, Python, Node.js, Go, PHP, Rust, and more. Useful for reproducing issues or building API client code.

### HAR Export

Export your captured traffic as a HAR (HTTP Archive) file to share with colleagues, attach to bug reports, or import into other analysis tools.

### Request Comparison

Select two captured requests and diff them side by side to identify differences in headers, query parameters, or request bodies.
