# nectoproxy start

The `start` command launches the NectoProxy proxy server and Web UI. This is the primary command you will use.

## Usage

```bash
nectoproxy start [options]
```

## Options

| Option | Alias | Default | Description |
|---|---|---|---|
| `--port <port>` | `-p` | `8888` | Port for the HTTP/HTTPS proxy server |
| `--ui-port <port>` | `-u` | `8889` | Port for the Web UI dashboard |
| `--host <host>` | | `0.0.0.0` | Host to bind the **proxy** port to (all interfaces, so LAN devices can capture) |
| `--ui-host <host>` | | `127.0.0.1` | Host to bind the **Web UI / control-plane API** to (localhost only by default) |
| `--http2` | | `false` | Enable experimental HTTP/2 interception (see [HTTP/2 & gRPC](/features/http2-grpc)) |
| `--no-open` | | | Do not automatically open the Web UI in the default browser |

## Default Behavior

When you run `nectoproxy start` without any options:

1. The **proxy server** starts on all network interfaces (`0.0.0.0:8888`), so phones and other LAN devices can route traffic through it.
2. The **Web UI / control-plane API** starts on **localhost only** (`127.0.0.1:8889`) and is protected by a randomly generated **session token**.
3. Your **default browser** opens automatically to the tokenized Web UI URL.

NectoProxy automatically detects your LAN IP address and displays it at startup.

```bash
nectoproxy start
```

Output:

```
  NectoProxy - HTTP/HTTPS Debugging Proxy

  Proxy Server: http://192.168.1.42:8888
  Web UI:       http://localhost:8889/?token=3f9c1a...e7
  Session:      Session 7/5/2026

  Mobile Setup: http://necto.setup
```

::: tip Session Token
The Web UI URL includes a `?token=...` query parameter. This token authenticates every control-plane request and is regenerated on each start. See [Security & Session Token](/features/security) for the full security model.
:::

## Examples

### Basic Start

Start NectoProxy with all defaults:

```bash
nectoproxy start
```

### Custom Ports

Use different ports for the proxy and Web UI:

```bash
nectoproxy start -p 9090 -u 9091
```

This starts:
- Proxy on port `9090`
- Web UI on port `9091`

::: tip When to Change Ports
Change the default ports when:
- Port 8888 or 8889 is already in use by another application.
- You need to run multiple NectoProxy instances simultaneously.
- Your organization has port allocation policies.
:::

### Proxy Host vs. UI Host

NectoProxy binds two independent surfaces with two separate flags:

| Flag | Default | Controls |
|---|---|---|
| `--host` | `0.0.0.0` | The **proxy** port -- kept LAN-reachable so devices can capture traffic |
| `--ui-host` | `127.0.0.1` | The **Web UI / control-plane API** -- localhost only by default |

This split lets phones and other devices use the proxy while the powerful control plane stays private to your machine.

### Restrict the Proxy to Localhost

If you do not need LAN devices to capture and want the proxy reachable only from the local machine:

```bash
nectoproxy start --host 127.0.0.1
```

::: warning Proxy Network Exposure
By default the proxy listens on all interfaces (`0.0.0.0`), which exposes it to your entire local network. This is intentional so mobile devices can capture, but only rely on it on trusted networks. Use `--host 127.0.0.1` on untrusted networks.
:::

### Expose the Web UI on a LAN

The control plane is localhost-only by default. To view the Web UI from another machine, bind it to a reachable interface:

```bash
# Expose the UI on all interfaces
nectoproxy start --ui-host 0.0.0.0

# Or bind it to a specific LAN IP
nectoproxy start --ui-host 192.168.1.42
```

::: danger Exposing the Control Plane
The Web UI can control the proxy and read every captured request. When it is not localhost-bound, NectoProxy prints a loud warning and still requires the session token, but anyone with the token URL gains full control. Prefer `--ui-host 127.0.0.1` and an SSH tunnel for remote access. See [Security & Session Token](/features/security).
:::

### Enable HTTP/2 Interception

Turn on experimental HTTP/2 (and unary gRPC) interception:

```bash
nectoproxy start --http2
```

HTTP/2 is off by default. HTTP/1.1 clients continue to work when it is enabled. See [HTTP/2 & gRPC](/features/http2-grpc) for what works and the known limitations.

### Without Auto-Opening Browser

If you do not want the browser to open automatically when starting NectoProxy:

```bash
nectoproxy start --no-open
```

This is useful when:
- Running NectoProxy on a headless server or remote machine.
- You prefer to open the Web UI manually.
- You are running NectoProxy in a script or automated workflow.

### Combined Options

You can combine all options:

```bash
nectoproxy start -p 9090 -u 9091 --host 127.0.0.1 --no-open
```

This starts the proxy on port 9090, the Web UI on port 9091, restricts access to localhost only, and does not open the browser.

## Stopping NectoProxy

NectoProxy runs in the foreground in your terminal. To stop it:

- Press `Ctrl+C` in the terminal where NectoProxy is running.

NectoProxy performs a graceful shutdown, closing active connections and saving any pending data to the database.

::: details Running in the Background
If you want NectoProxy to run in the background, you can use standard process management tools:

```bash
# Using nohup
nohup nectoproxy start --no-open > /dev/null 2>&1 &

# Using screen
screen -dmS nectoproxy nectoproxy start --no-open

# Using tmux
tmux new-session -d -s nectoproxy 'nectoproxy start --no-open'
```

Use `Ctrl+C` or `kill` the process to stop it when running in the background.
:::

## Troubleshooting

### Port Already in Use

If you see an error like `EADDRINUSE: address already in use`:

1. Check what is using the port:

    ```bash
    # macOS / Linux
    lsof -i :8888

    # Windows
    netstat -ano | findstr :8888
    ```

2. Either stop the conflicting application or use a different port:

    ```bash
    nectoproxy start -p 9090
    ```

### Permission Denied on Port

On macOS and Linux, ports below 1024 require root privileges. NectoProxy's default ports (8888 and 8889) do not require elevated permissions. If you attempt to use a low port number, you will need `sudo`:

```bash
sudo nectoproxy start -p 443
```

::: warning Avoid Running as Root
Running NectoProxy as root is generally not recommended. Use the default ports or any port above 1024 instead.
:::
