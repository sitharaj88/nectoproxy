# Frequently Asked Questions

## General

### What is NectoProxy?

NectoProxy is a powerful HTTP/HTTPS debugging proxy with a built-in Web UI. It sits between your browser (or any HTTP client) and the internet, capturing, inspecting, and optionally modifying all traffic that flows through it. It is designed for web developers, mobile developers, QA engineers, and security researchers who need to understand and manipulate network traffic.

### Is NectoProxy free?

Yes. NectoProxy is free and open source software released under the [MIT License](https://github.com/sitharaj88/nectoproxy/blob/main/LICENSE).

### What license does NectoProxy use?

NectoProxy uses the **MIT License**, which is one of the most permissive open source licenses. You can use, modify, and distribute NectoProxy freely, including in commercial projects.

### Can I use NectoProxy commercially?

Yes. The MIT License permits commercial use without any restrictions or royalties. You can use NectoProxy in your development workflow, CI/CD pipelines, or any other commercial context.

### What platforms does NectoProxy support?

NectoProxy runs on any platform that supports Node.js 20 or later:

| Platform | Supported |
|----------|:---------:|
| macOS (Intel & Apple Silicon) | Yes |
| Linux (x64, ARM64) | Yes |
| Windows (x64) | Yes |
| WSL (Windows Subsystem for Linux) | Yes |

### Does NectoProxy support HTTP/2?

NectoProxy currently operates as an HTTP/1.1 proxy. It can proxy traffic to and from HTTP/2 servers, but the connection between the client and NectoProxy uses HTTP/1.1. This is sufficient for debugging purposes as the request/response semantics are preserved.

---

## Installation

### Do I need anything besides Node.js?

No. NectoProxy is a self-contained npm package. The only prerequisite is **Node.js 20 or later**. All dependencies (including the Web UI) are bundled in the package.

### Can I run NectoProxy without installing it globally?

Yes. You can use `npx` to run NectoProxy without installing it:

```bash
npx nectoproxy start
```

### How do I update NectoProxy?

```bash
npm update -g nectoproxy
```

Or reinstall the latest version:

```bash
npm install -g nectoproxy@latest
```

### How do I uninstall NectoProxy?

```bash
# Remove the npm package
npm uninstall -g nectoproxy

# Optionally remove the data directory
rm -rf ~/.nectoproxy/
```

::: warning
Removing the `~/.nectoproxy/` directory deletes all captured traffic, rules, settings, and certificates. Back up first if you need to preserve any data.
:::

### What is the minimum Node.js version?

NectoProxy requires **Node.js 20.0.0 or later**. Check your version with:

```bash
node -v
```

---

## Security

### Is installing the CA certificate safe?

Installing the NectoProxy CA certificate tells your system to trust certificates issued by NectoProxy. This is safe **as long as:**

1. You generated the CA yourself by running NectoProxy on your own machine.
2. No one else has access to your `~/.nectoproxy/certs/ca.key` file.
3. You remove the CA certificate when you are done using NectoProxy.

The CA private key never leaves your machine and is not shared over the network.

::: danger
Never install a CA certificate provided by someone else unless you fully trust them. A malicious CA certificate would allow the holder to intercept all your HTTPS traffic.
:::

### Will NectoProxy intercept ALL my traffic?

NectoProxy only intercepts traffic that is explicitly routed through it. It does not change your system's default network configuration. Only applications configured to use `localhost:8888` as their proxy (either manually or via system proxy settings) will have their traffic captured.

If you configure your **system proxy** settings to point to NectoProxy, then all applications that respect system proxy settings will route through it.

### Can others on my network see my traffic?

By default, NectoProxy binds to `127.0.0.1` (localhost only), which means only your local machine can connect. No one else on your network can access the proxy or the Web UI.

If you start NectoProxy with `--host 0.0.0.0`, anyone on your local network can:
- Route their traffic through your proxy
- View the Web UI and see captured traffic

Only bind to `0.0.0.0` on trusted networks.

### How do I remove the CA certificate?

**macOS:** Open Keychain Access, find "NectoProxy CA", right-click, and delete.

**Windows:** Open Certificate Manager (`certmgr.msc`), go to Trusted Root Certification Authorities, find "NectoProxy CA", and delete.

**Linux:** Remove the certificate file and update the store:
```bash
sudo rm /usr/local/share/ca-certificates/nectoproxy-ca.crt
sudo update-ca-certificates --fresh
```

**Firefox:** Settings > Privacy & Security > Certificates > View Certificates > Authorities > find NectoProxy CA > Delete.

### Can I use NectoProxy on a shared network?

Yes, but keep it bound to `127.0.0.1` (the default). If you need to proxy mobile devices, use `--host 0.0.0.0` only temporarily and on networks you trust.

---

## Features

### Can NectoProxy capture mobile traffic?

Yes. Start NectoProxy with `--host 0.0.0.0`, configure your phone's Wi-Fi proxy settings to point to your computer's IP address and port 8888, and install the CA certificate on the phone. See the [Debugging Mobile Apps](./guides/debugging-mobile) tutorial for detailed instructions.

### Does NectoProxy support WebSockets?

Yes. NectoProxy intercepts WebSocket connections (both `ws://` and `wss://`) and captures individual frames, including direction, opcode, data, and timestamps. WebSocket entries appear in the traffic list with protocol WS or WSS. See the [Debugging WebSockets](./guides/debugging-websockets) tutorial.

### Can I mock API responses?

Yes. NectoProxy's Rules engine supports Mock rules that return custom responses without forwarding the request to the real server. You can specify status codes, headers, body content, and even add delays. See the [Mocking APIs](./guides/mocking-apis) tutorial.

### Can I export and import traffic?

Yes. NectoProxy supports exporting traffic as HAR (HTTP Archive) files and importing HAR files from other tools including Chrome DevTools, Firefox, Charles Proxy, and Fiddler. See the [Exporting Traffic](./guides/exporting-traffic) tutorial.

### Does NectoProxy work with gRPC?

NectoProxy can capture gRPC traffic that runs over HTTP/2. The Web UI includes a gRPC viewer that can decode and display gRPC messages. However, since NectoProxy operates as an HTTP/1.1 proxy, some gRPC features that require full HTTP/2 support (like bidirectional streaming) may not work through the proxy.

### Can I use NectoProxy with Docker?

Yes. You can run NectoProxy inside a Docker container or use it to proxy traffic from Docker containers. To proxy traffic from containers, configure the container's HTTP proxy environment variables to point to NectoProxy on the host:

```bash
docker run -e HTTP_PROXY=http://host.docker.internal:8888 \
           -e HTTPS_PROXY=http://host.docker.internal:8888 \
           your-image
```

::: tip
`host.docker.internal` resolves to the host machine's IP from inside a Docker container on Docker Desktop (macOS and Windows). On Linux, use `--network host` or the host's actual IP address.
:::

---

## Troubleshooting

### Why is no traffic appearing?

The most common causes are:
1. Your browser is not configured to use the proxy (check proxy settings).
2. Recording is paused (check the record button in the header).
3. You are viewing a different session.
4. The proxy port is wrong.

See [Common Issues](./troubleshooting/common-issues) for detailed solutions.

### Why is HTTPS showing security errors?

The NectoProxy CA certificate is not installed or not trusted. Install it using:

```bash
nectoproxy cert --install
```

See [Certificate Errors](./troubleshooting/certificate-errors) for platform-specific instructions.

### Where are the logs?

NectoProxy writes logs to the terminal (stdout/stderr) where it was started. There is no separate log file by default. Error messages, proxy events, and startup information are all printed to the console.

### How much disk space does NectoProxy use?

Disk usage depends on how much traffic you capture. The database starts at a few kilobytes and grows as traffic is recorded. A session with a few hundred requests and small payloads typically uses 5-50 MB. Heavy usage with large response bodies can grow to hundreds of megabytes or more. See the [Storage](./configuration/storage) page for management tips.

### Can I run NectoProxy on a server?

Yes. NectoProxy can run on a headless server. Start it with:

```bash
nectoproxy start --host 0.0.0.0 --no-open
```

Access the Web UI from any browser using the server's IP address and UI port (default 8889). Make sure the appropriate ports are open in your server's firewall.

::: warning
Running NectoProxy on a server accessible from the internet is not recommended without additional security measures (VPN, SSH tunnel, reverse proxy with authentication), as anyone who can reach it can view and manipulate traffic.
:::
