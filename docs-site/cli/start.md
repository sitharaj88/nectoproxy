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
| `--host <host>` | | `0.0.0.0` | Host address to bind to (all interfaces) |
| `--no-open` | | | Do not automatically open the Web UI in the default browser |

## Default Behavior

When you run `nectoproxy start` without any options:

1. The **proxy server** starts on all network interfaces (`0.0.0.0:8888`).
2. The **Web UI** starts on all network interfaces (`0.0.0.0:8889`).
3. Your **default browser** opens automatically to the Web UI URL.

NectoProxy automatically detects your LAN IP address and displays it at startup.

```bash
nectoproxy start
```

Output:

```
  NectoProxy v0.1.0

  Proxy Server: http://192.168.1.42:8888
  Web UI:       http://192.168.1.42:8889
```

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

### Localhost Only (Restrict Network Access)

By default, NectoProxy binds to all network interfaces (`0.0.0.0`), making it accessible from other devices on your local network. If you want to restrict access to only the local machine:

```bash
nectoproxy start --host 127.0.0.1
```

::: tip Security Consideration
Binding to `127.0.0.1` ensures only the local machine can use the proxy and access the Web UI. This is the most secure option when you do not need LAN access.
:::

::: warning Default Network Exposure
By default, NectoProxy listens on all interfaces (`0.0.0.0`), which exposes it to your entire local network. Only use the default on trusted networks. Use `--host 127.0.0.1` on untrusted networks.
:::

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
