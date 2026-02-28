# Port Conflicts

This page covers how to diagnose and resolve port conflicts when starting NectoProxy.

## The EADDRINUSE Error

**Symptom:** NectoProxy fails to start with a message like:

```
✖ Port is already in use

  Try a different port: nectoproxy start -p 8889
```

**Cause:** Another process is already listening on the port NectoProxy wants to use (default: `8888` for the proxy, `8889` for the Web UI).

## Finding What Is Using the Port

### macOS / Linux

```bash
# Find what's using port 8888
lsof -i :8888

# Example output:
# COMMAND   PID   USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
# node    12345  alice   23u  IPv4 0x1234    0t0   TCP *:8888 (LISTEN)

# More detailed: show PID and process name
lsof -i :8888 -P -n | grep LISTEN

# Alternative using ss (Linux)
ss -tlnp | grep 8888
```

### Windows

```powershell
# Find what's using port 8888
netstat -ano | findstr :8888

# Example output:
# TCP    0.0.0.0:8888    0.0.0.0:0    LISTENING    12345

# Find the process name from the PID
tasklist | findstr 12345

# Or in one step using PowerShell
Get-Process -Id (Get-NetTCPConnection -LocalPort 8888).OwningProcess
```

## Resolving Port Conflicts

### Option 1: Change NectoProxy's Ports

The simplest solution is to use different ports:

```bash
# Use custom ports
nectoproxy start -p 9999 -u 9998
```

Remember to update your browser's proxy settings to use the new proxy port.

::: tip
Choose port numbers above 1024 to avoid needing root/administrator privileges. Ports in the range 8000-9999 are commonly used for development tools. Port ranges 49152-65535 are generally available and unlikely to conflict with other software.
:::

### Option 2: Stop the Conflicting Process

If you know what the conflicting process is and can safely stop it:

```bash
# macOS / Linux: Kill by PID
kill 12345

# Force kill if it doesn't respond
kill -9 12345

# Windows: Kill by PID
taskkill /PID 12345

# Windows: Force kill
taskkill /PID 12345 /F
```

::: warning
Be careful when killing processes. Make sure you know what the process is before terminating it. Killing system processes or important services can cause problems.
:::

### Option 3: Stop a Previous NectoProxy Instance

If a previous instance of NectoProxy is still running (e.g., you forgot to stop it):

```bash
# Find NectoProxy processes
ps aux | grep nectoproxy

# Kill all NectoProxy processes
pkill -f nectoproxy

# Then start fresh
nectoproxy start
```

## Running Multiple NectoProxy Instances

You can run multiple instances of NectoProxy simultaneously for different projects or sessions. Each instance needs its own unique port pair:

```bash
# Instance 1: Project A
nectoproxy start -p 8888 -u 8889

# Instance 2 (in a different terminal): Project B
nectoproxy start -p 7777 -u 7778

# Instance 3 (in a different terminal): Project C
nectoproxy start -p 6666 -u 6667
```

::: warning
All instances share the same data directory (`~/.nectoproxy/`) and database. Traffic from all instances is recorded in the same database. Use different sessions to keep traffic separated.
:::

## Common Conflicting Software

These applications commonly use ports that may conflict with NectoProxy:

| Software | Default Port | Conflict With |
|----------|:------------:|:-------------:|
| **Charles Proxy** | 8888 | Proxy port |
| **Fiddler** | 8888 | Proxy port |
| **mitmproxy** | 8080 | -- |
| **Burp Suite** | 8080 | -- |
| **Webpack Dev Server** | 8080-8089 | May conflict |
| **Vite Dev Server** | 5173 | -- |
| **PHP built-in server** | 8000 | -- |
| **Django** | 8000 | -- |
| **Rails** | 3000 | -- |
| **nginx** | 80, 443, 8080 | -- |
| **Apache** | 80, 443, 8080 | -- |

::: tip
If you regularly use other proxy tools alongside NectoProxy, establish a convention for your port assignments. For example: NectoProxy on 8888/8889, Charles on 8890, development servers on 3000-3999.
:::

## Preventing Port Conflicts

### Check Before Starting

You can check if a port is available before starting NectoProxy:

```bash
# macOS / Linux: Check if port 8888 is free
lsof -i :8888 || echo "Port 8888 is available"

# Windows PowerShell
if (!(Get-NetTCPConnection -LocalPort 8888 -ErrorAction SilentlyContinue)) {
  Write-Host "Port 8888 is available"
}
```

### Use a Shell Alias with Custom Ports

If you always use custom ports, create a shell alias:

```bash
# Add to ~/.bashrc or ~/.zshrc
alias nproxy='nectoproxy start -p 9090 -u 9091'
```

Then simply run:

```bash
nproxy
```
