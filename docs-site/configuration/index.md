# Configuration Overview

NectoProxy provides a flexible, layered configuration system that lets you control every aspect of the proxy at startup and during runtime. Whether you prefer CLI flags, the REST API, or the graphical Settings panel, you can tune NectoProxy to fit your workflow.

## Configuration Methods

NectoProxy can be configured through three complementary mechanisms:

### 1. CLI Flags (Startup)

When you launch NectoProxy from the terminal, you can pass command-line flags to override default values. These flags take effect immediately when the proxy starts.

```bash
# Start with custom ports
nectoproxy start -p 9999 -u 9998

# Start without auto-opening the browser
nectoproxy start --no-open
```

CLI flags are ideal for one-off configurations or scripted environments where you need deterministic startup behavior.

### 2. Settings API (Runtime)

NectoProxy exposes a RESTful Settings API on the Web UI port. You can read and update settings programmatically while the proxy is running.

```bash
# Read all settings
curl http://localhost:8889/api/settings

# Update a specific setting
curl -X PUT http://localhost:8889/api/settings/proxyPort \
  -H "Content-Type: application/json" \
  -d '{"value": 9999}'

# Update multiple settings at once
curl -X PUT http://localhost:8889/api/settings \
  -H "Content-Type: application/json" \
  -d '{"proxyPort": 9999, "requestTimeout": 60000}'

# Reset all settings to defaults
curl -X POST http://localhost:8889/api/settings/reset
```

### 3. Web UI Settings Panel

The most convenient way to configure NectoProxy is through the Settings panel in the Web UI. Click the **gear icon** in the header toolbar to open the Settings dialog. Changes are saved to the database and persist across restarts.

The Settings panel provides controls for:
- Proxy port and UI port
- Request timeout and max body size
- Auto-record and auto-open browser behavior
- Breakpoint timeout
- Theme selection (Dark / Light / System)
- Upstream proxy configuration
- SSL passthrough domains
- Mobile device configuration with QR codes

## Data Directory

NectoProxy stores all persistent data in a single directory:

```
~/.nectoproxy/
```

This directory is created automatically on first launch and contains:

| Path | Description |
|------|-------------|
| `~/.nectoproxy/data.db` | SQLite database (sessions, traffic, rules, settings, etc.) |
| `~/.nectoproxy/certs/` | Generated CA and domain certificates |

::: tip
The data directory path resolves to your home directory. On Linux and macOS this is typically `/home/username/.nectoproxy/` or `/Users/username/.nectoproxy/`. On Windows it is `C:\Users\username\.nectoproxy\`.
:::

## Configuration Priority

When the same setting is specified through multiple methods, NectoProxy follows this priority order (highest to lowest):

1. **CLI flags** -- Applied at startup, override everything else for that launch session.
2. **Settings API / Web UI changes** -- Persisted to the database, take effect immediately.
3. **Database defaults** -- If no value has been explicitly set, NectoProxy uses built-in defaults.

::: warning
CLI flags such as `--port` and `--host` only affect the current process launch. They do not permanently modify the stored settings. If you want a permanent change, update the setting through the Web UI or the Settings API.
:::

## Configuration Sub-Pages

| Page | What It Covers |
|------|----------------|
| [Proxy Settings](./proxy-settings) | Ports, host binding, timeouts, body size limits, recording, and breakpoint behavior |
| [UI Settings](./ui-settings) | Theme selection, dark/light mode toggle |
| [Storage & Database](./storage) | SQLite database, certificate storage, backups, and migration |
