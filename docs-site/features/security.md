---
title: Security & Session Token
description: How NectoProxy protects its control-plane Web UI and API with a session token, localhost binding, CORS lockdown, and DNS-rebinding protection.
---

# Security & Session Token

NectoProxy separates two very different network surfaces and secures them differently:

- **The proxy port** (default `8888`) is meant to be reachable by other devices on your LAN so you can capture traffic from phones, tablets, and other machines.
- **The control-plane** -- the Web UI and its REST/Socket.IO API (default `8889`) -- can start, stop, and reconfigure the proxy, read every captured request, and modify live traffic. This surface is **locked down by default**.

## The Security Model

By default, `nectoproxy start`:

1. Binds the **control-plane** (`--ui-host`) to `127.0.0.1`, so it is reachable only from the local machine.
2. Binds the **proxy** (`--host`) to `0.0.0.0`, so LAN devices can still route traffic through it.
3. Generates a cryptographically-random **session token** (32 random bytes, unique per run) that protects every `/api/*` route and the Socket.IO connection.
4. Enforces strict **CORS** and **DNS-rebinding protection** on the control plane.

This means a malicious website in your browser -- or another device on your network -- cannot reach the control plane and quietly control the proxy.

## The Session Token

The session token is printed at startup as part of the Web UI URL:

```
  Web UI:       http://localhost:8889/?token=3f9c1a...e7
```

When the browser opens this URL, the SPA reads the token and attaches it to every request. There is no separate login step -- possession of the token URL **is** the credential.

### Where the token is required

Every `/api/*` route and the Socket.IO handshake require the token, supplied either way:

- `Authorization: Bearer <token>` header, or
- `?token=<token>` query parameter.

```bash
# Authenticated API request
curl -H "Authorization: Bearer <TOKEN>" http://localhost:8889/api/traffic

# Same request using a query parameter
curl "http://localhost:8889/api/traffic?token=<TOKEN>"
```

Requests with a missing or invalid token receive `401 Unauthorized`.

### Endpoints exempt from the token

A small set of read-only `GET` endpoints stay unauthenticated so that device setup and health checks work even before you have the token in hand:

| Endpoint | Purpose |
|---|---|
| `/api/health` | Liveness/health check |
| `/api/certificates/ca` | Download the CA certificate (PEM) |
| `/api/certificates/download` | Download the CA certificate |
| `/api/certificates/mobileconfig` | Download the iOS `.mobileconfig` profile |

::: tip Token rotation
A fresh token is generated every time you run `nectoproxy start`. Restarting the proxy invalidates any previously copied token URL, so update integrations (such as the [MCP server](./mcp)) with the new token after a restart.
:::

## CORS Lockdown

The Web UI is served from the same origin as the API, so no cross-origin access is required. NectoProxy therefore disables permissive CORS entirely -- other web origins cannot read API responses even if they somehow obtain the token.

## DNS-Rebinding Protection

Every `/api` request must carry a `Host` header whose hostname is one of NectoProxy's known-local names (for example `localhost`, `127.0.0.1`, `::1`, and this machine's own interface addresses). Requests with an unexpected `Host` header are rejected with `403 Forbidden`. This blocks DNS-rebinding attacks, where a malicious site tricks the browser into resolving an attacker-controlled hostname to `127.0.0.1` in order to reach the local control plane.

## Proxy vs. Control-Plane Hosts

Two independent flags control where each surface binds:

| Flag | Default | Controls |
|---|---|---|
| `--host <host>` | `0.0.0.0` | The proxy port -- kept LAN-reachable for device capture |
| `--ui-host <host>` | `127.0.0.1` | The Web UI / control-plane API -- localhost only by default |

See the [`nectoproxy start`](/cli/start) reference for the full flag list.

## Intentionally Exposing the UI on a LAN

Sometimes you want to open the Web UI from another machine (for example, viewing the dashboard from a laptop while the proxy runs on a headless box). Bind the control plane to a reachable interface:

```bash
# Expose the UI on all interfaces
nectoproxy start --ui-host 0.0.0.0

# Or bind it to a specific LAN IP
nectoproxy start --ui-host 192.168.1.42
```

When the control plane is not localhost-bound, NectoProxy prints a loud warning at startup and still requires the session token. NectoProxy also adds the machine's own interface addresses to the allowed `Host` list so legitimate LAN clients continue to work.

::: danger Exposing the control plane is risky
Anyone who obtains the token URL can control the proxy, read every captured request (including credentials and cookies), and modify live traffic. Only expose the UI on **trusted networks**, prefer `--ui-host 127.0.0.1`, and consider an SSH tunnel instead:

```bash
# Reach a remote UI over SSH without exposing it on the LAN
ssh -L 8889:127.0.0.1:8889 user@remote-host
```
:::

## See Also

- [`nectoproxy start`](/cli/start) -- all CLI flags, including `--host` and `--ui-host`
- [Mobile Device Capture](./mobile-devices) -- capture device traffic while keeping the UI on localhost
- [MCP / AI Integration](./mcp) -- how the session token is shared with an AI assistant
