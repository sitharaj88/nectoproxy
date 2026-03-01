# Proxy Settings

This page covers every proxy-related setting in NectoProxy, including how to configure each one through CLI flags and the Settings API.

## Port Configuration

### proxyPort

The TCP port on which the NectoProxy proxy server listens for HTTP and HTTPS (CONNECT) requests.

| Property | Value |
|----------|-------|
| **Default** | `8888` |
| **CLI flag** | `-p, --port <port>` |
| **Settings API key** | `proxyPort` |

```bash
# CLI
nectoproxy start -p 9999

# Settings API
curl -X PUT http://localhost:8889/api/settings/proxyPort \
  -H "Content-Type: application/json" \
  -d '{"value": 9999}'
```

::: warning
Changing the proxy port requires restarting NectoProxy. After updating via the API, stop and re-start the proxy for the new port to take effect.
:::

### uiPort

The TCP port for the Web UI and REST API server.

| Property | Value |
|----------|-------|
| **Default** | `8889` |
| **CLI flag** | `-u, --ui-port <port>` |
| **Settings API key** | `uiPort` |

```bash
# CLI
nectoproxy start -u 3000

# Settings API
curl -X PUT http://localhost:8889/api/settings/uiPort \
  -H "Content-Type: application/json" \
  -d '{"value": 3000}'
```

::: tip
The Web UI is served on this same port. After starting, open `http://localhost:<uiPort>` in your browser to access the NectoProxy dashboard.
:::

## Host Binding

### host

Controls which network interface the proxy binds to.

| Property | Value |
|----------|-------|
| **Default** | `0.0.0.0` |
| **CLI flag** | `--host <host>` |

| Value | Behavior |
|-------|----------|
| `0.0.0.0` | Listen on all network interfaces (default). Other devices on the LAN can connect. NectoProxy displays the detected LAN IP address at startup. |
| `127.0.0.1` | Listen on localhost only. Only the local machine can use the proxy. This is the most secure option. |

```bash
# Default: bind to all interfaces (LAN access enabled)
nectoproxy start

# Bind to localhost only (more secure, no LAN access)
nectoproxy start --host 127.0.0.1
```

::: warning Default Network Exposure
By default, NectoProxy binds to `0.0.0.0`, which exposes the proxy to your entire local network. If you are on an untrusted network, use `--host 127.0.0.1` to restrict access to the local machine only.
:::

## Body and Timeout Limits

### maxBodySize

The maximum size (in bytes) of request and response bodies that NectoProxy will capture and store. Bodies larger than this limit are truncated -- the request/response still flows through to the client, but only the first `maxBodySize` bytes are recorded in the database.

| Property | Value |
|----------|-------|
| **Default** | `10485760` (10 MB) |
| **Settings API key** | `maxBodySize` |

```bash
# Increase to 50 MB via Settings API
curl -X PUT http://localhost:8889/api/settings/maxBodySize \
  -H "Content-Type: application/json" \
  -d '{"value": 52428800}'
```

Truncated entries are flagged with `isTruncated: true` in the traffic data, so you can easily identify them in the UI.

::: tip
If you are debugging large file uploads or API responses with big payloads, increase this value. Be aware that larger values will increase memory usage and database size.
:::

### requestTimeout

The maximum time (in milliseconds) NectoProxy will wait for a response from the upstream server before aborting the request.

| Property | Value |
|----------|-------|
| **Default** | `30000` (30 seconds) |
| **Settings API key** | `requestTimeout` |

```bash
# Increase timeout to 60 seconds
curl -X PUT http://localhost:8889/api/settings/requestTimeout \
  -H "Content-Type: application/json" \
  -d '{"value": 60000}'
```

::: details When Does a Timeout Occur?
A timeout fires when the upstream server does not begin sending a response within the configured number of milliseconds. Once the response headers start arriving, the timeout is cleared. This means large downloads that take a long time are not affected as long as the server starts responding promptly.
:::

## Recording Behavior

### recording

Controls whether NectoProxy automatically begins recording traffic when it starts.

| Property | Value |
|----------|-------|
| **Default** | `true` |
| **Settings API key** | `recording` |

When `recording` is `true`, every request flowing through the proxy is captured and stored in the active session. You can pause recording at any time using the **pause button** in the Web UI header without stopping the proxy itself.

```bash
# Disable auto-recording
curl -X PUT http://localhost:8889/api/settings/recording \
  -H "Content-Type: application/json" \
  -d '{"value": false}'
```

::: tip
Pausing recording is useful when you want the proxy to remain active (so your browser continues to work) but you do not need to capture routine traffic. Resume recording when you are ready to capture the specific requests you want to debug.
:::

### autoOpenBrowser

Controls whether NectoProxy automatically opens the Web UI in your default browser when it starts.

| Property | Value |
|----------|-------|
| **Default** | `true` |
| **CLI flag** | `--no-open` (disables auto-open) |
| **Settings API key** | `autoOpenBrowser` |

```bash
# Start without opening the browser
nectoproxy start --no-open

# Disable via Settings API
curl -X PUT http://localhost:8889/api/settings/autoOpenBrowser \
  -H "Content-Type: application/json" \
  -d '{"value": false}'
```

## Breakpoint Behavior

### breakpointTimeout

The maximum time (in milliseconds) NectoProxy will hold a breakpointed request or response before automatically resuming it. This prevents indefinitely stalled connections if you forget about a paused breakpoint.

| Property | Value |
|----------|-------|
| **Default** | `30000` (30 seconds) |
| **Settings API key** | `breakpointTimeout` |

```bash
# Increase breakpoint timeout to 2 minutes
curl -X PUT http://localhost:8889/api/settings/breakpointTimeout \
  -H "Content-Type: application/json" \
  -d '{"value": 120000}'
```

::: warning
If the breakpoint timeout is too short, you may not have enough time to inspect and modify the intercepted request or response before it automatically continues. If the timeout is too long, forgotten breakpoints may cause other requests to stall.
:::

## Quick Reference

| Setting | Default | CLI Flag | API Key | Restart Required |
|---------|---------|----------|---------|:----------------:|
| Proxy port | `8888` | `-p, --port` | `proxyPort` | Yes |
| UI port | `8889` | `-u, --ui-port` | `uiPort` | Yes |
| Host binding | `0.0.0.0` | `--host` | -- | Yes |
| Max body size | 10 MB | -- | `maxBodySize` | No |
| Request timeout | 30,000 ms | -- | `requestTimeout` | No |
| Auto-record | `true` | -- | `recording` | No |
| Auto-open browser | `true` | `--no-open` | `autoOpenBrowser` | No |
| Breakpoint timeout | 30,000 ms | -- | `breakpointTimeout` | No |
