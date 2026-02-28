# Upstream Proxy API

The Upstream Proxy API allows you to chain NectoProxy through another proxy server. This is useful in corporate networks where all internet access must go through a company proxy, or when you need to layer multiple proxy tools.

## Endpoints Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/upstream-proxy` | Get current configuration |
| `PUT` | `/api/upstream-proxy` | Update configuration |
| `POST` | `/api/upstream-proxy/enable` | Enable the upstream proxy |
| `POST` | `/api/upstream-proxy/disable` | Disable the upstream proxy |
| `DELETE` | `/api/upstream-proxy` | Clear configuration |

---

## Get Current Configuration

```
GET /api/upstream-proxy
```

Retrieve the current upstream proxy configuration.

### Example Request

```bash
curl http://localhost:8889/api/upstream-proxy
```

### Response `200 OK` (configured)

```json
{
  "config": {
    "enabled": true,
    "type": "http",
    "host": "corporate-proxy.example.com",
    "port": 3128,
    "auth": {
      "username": "user",
      "password": "pass"
    },
    "bypassRules": [
      "localhost",
      "127.0.0.1",
      "*.local"
    ]
  }
}
```

### Response `200 OK` (not configured)

```json
{
  "config": null
}
```

---

## Update Configuration

```
PUT /api/upstream-proxy
```

Set or update the upstream proxy configuration.

### Request Body

```json
{
  "enabled": true,
  "type": "http",
  "host": "proxy.example.com",
  "port": 8080,
  "auth": {
    "username": "user",
    "password": "password"
  },
  "bypassRules": [
    "localhost",
    "127.0.0.1",
    "*.local",
    "*.internal.company.com"
  ]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `enabled` | `boolean` | No | Whether the upstream proxy is active. Default: `false` |
| `type` | `string` | No | Proxy protocol: `http`, `https`, `socks4`, or `socks5`. Default: `"http"` |
| `host` | `string` | Yes* | Proxy server hostname or IP. *Required when `enabled` is `true` |
| `port` | `number` | Yes* | Proxy server port. *Required when `enabled` is `true` |
| `auth` | `object` | No | Authentication credentials |
| `auth.username` | `string` | - | Username for proxy authentication |
| `auth.password` | `string` | - | Password for proxy authentication |
| `bypassRules` | `string[]` | No | Patterns for hosts that bypass the upstream proxy. Default: `["localhost", "127.0.0.1", "*.local"]` |

### Example Request

```bash
curl -X PUT http://localhost:8889/api/upstream-proxy \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "type": "http",
    "host": "proxy.corp.example.com",
    "port": 3128,
    "bypassRules": ["localhost", "127.0.0.1", "*.local", "10.*"]
  }'
```

### Response `200 OK`

```json
{
  "config": {
    "enabled": true,
    "type": "http",
    "host": "proxy.corp.example.com",
    "port": 3128,
    "bypassRules": ["localhost", "127.0.0.1", "*.local", "10.*"]
  }
}
```

### Error `400 Bad Request`

```json
{
  "error": "Host is required when proxy is enabled"
}
```

```json
{
  "error": "Port is required when proxy is enabled"
}
```

---

## Enable Upstream Proxy

```
POST /api/upstream-proxy/enable
```

Enable a previously configured upstream proxy without needing to resend the full configuration.

### Example Request

```bash
curl -X POST http://localhost:8889/api/upstream-proxy/enable
```

### Response `200 OK`

```json
{
  "config": {
    "enabled": true,
    "type": "http",
    "host": "proxy.corp.example.com",
    "port": 3128,
    "bypassRules": ["localhost", "127.0.0.1", "*.local"]
  }
}
```

### Error `400 Bad Request`

```json
{
  "error": "No proxy configured"
}
```

::: warning Prerequisites
You must configure the upstream proxy via `PUT /api/upstream-proxy` before calling this endpoint. If no proxy has been configured, the request will fail.
:::

---

## Disable Upstream Proxy

```
POST /api/upstream-proxy/disable
```

Disable the upstream proxy while preserving the configuration. The proxy can be re-enabled later without reconfiguration.

### Example Request

```bash
curl -X POST http://localhost:8889/api/upstream-proxy/disable
```

### Response `200 OK`

```json
{
  "config": {
    "enabled": false,
    "type": "http",
    "host": "proxy.corp.example.com",
    "port": 3128,
    "bypassRules": ["localhost", "127.0.0.1", "*.local"]
  }
}
```

---

## Clear Configuration

```
DELETE /api/upstream-proxy
```

Remove the upstream proxy configuration entirely. All traffic will go directly to the target servers.

### Example Request

```bash
curl -X DELETE http://localhost:8889/api/upstream-proxy
```

### Response `200 OK`

```json
{
  "config": null
}
```

---

## Supported Proxy Types

| Type | Description |
|---|---|
| `http` | Standard HTTP proxy (CONNECT method for HTTPS) |
| `https` | HTTP proxy over TLS |
| `socks4` | SOCKS4 proxy |
| `socks5` | SOCKS5 proxy (supports authentication and DNS resolution) |

---

## Bypass Rules

Bypass rules define patterns for hostnames that should not be routed through the upstream proxy. Matching requests go directly to the target server.

| Pattern | Matches |
|---|---|
| `localhost` | Exact match for `localhost` |
| `127.0.0.1` | Exact match for `127.0.0.1` |
| `*.local` | Any hostname ending in `.local` |
| `*.internal.corp.com` | Any subdomain of `internal.corp.com` |
| `10.*` | Any hostname starting with `10.` |

---

## Upstream Proxy Configuration Schema

::: details Full UpstreamProxyConfig Schema
| Field | Type | Description |
|---|---|---|
| `enabled` | `boolean` | Whether the proxy is active |
| `type` | `string` | Protocol type: `http`, `https`, `socks4`, or `socks5` |
| `host` | `string` | Proxy server hostname or IP address |
| `port` | `number` | Proxy server port |
| `auth` | `object\|undefined` | Optional authentication credentials |
| `auth.username` | `string` | Authentication username |
| `auth.password` | `string` | Authentication password |
| `bypassRules` | `string[]` | Hostname patterns that bypass the upstream proxy |
:::

---

## Example: Corporate Proxy with SOCKS5

::: details Configure SOCKS5 proxy with authentication

```bash
curl -X PUT http://localhost:8889/api/upstream-proxy \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "type": "socks5",
    "host": "socks.corp.example.com",
    "port": 1080,
    "auth": {
      "username": "john.doe",
      "password": "secure-password"
    },
    "bypassRules": [
      "localhost",
      "127.0.0.1",
      "*.local",
      "*.corp.example.com",
      "10.*",
      "192.168.*"
    ]
  }'
```
:::
