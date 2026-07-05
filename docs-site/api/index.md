# REST API Overview

NectoProxy provides a comprehensive REST API that exposes all proxy features programmatically. The API is served on the same port as the Web UI, making it easy to integrate with scripts, CI/CD pipelines, and external tooling.

## Base URL

All API endpoints are served under the `/api` prefix on the Web UI port:

```
http://localhost:8889/api
```

::: tip Customizable Port
The default UI port is `8889`. If you have configured a different port via the `uiPort` setting, adjust the base URL accordingly.
:::

## Request Format

- All request bodies must be sent as **JSON** with the `Content-Type: application/json` header.
- Query parameters are used for filtering, pagination, and search operations.
- URL path parameters are used for resource identifiers (e.g., `/api/traffic/:id`).

```bash
# Example: Creating a session with a JSON body
curl -X POST http://localhost:8889/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"name": "My Session"}'
```

::: warning Exception: File Uploads
The HAR import and validate endpoints accept `multipart/form-data` instead of JSON. See the [HAR API](./har) documentation for details.
:::

## Response Format

All successful responses return JSON. List endpoints typically wrap results in an object with a descriptive key:

```json
{
  "sessions": [
    { "id": "abc123", "name": "My Session", "..." : "..." }
  ]
}
```

Single-resource responses return the resource directly or within a wrapper:

```json
{
  "id": "abc123",
  "name": "My Session",
  "isActive": true,
  "isRecording": true,
  "createdAt": 1709136000000,
  "updatedAt": 1709136000000,
  "trafficCount": 42,
  "totalBytes": 102400
}
```

## Authentication

The control-plane API is protected by a **session token**. NectoProxy generates a fresh token each time you run `nectoproxy start` and prints it in the Web UI URL (`http://localhost:8889/?token=<TOKEN>`). Every `/api/*` request must include it, supplied either way:

```bash
# Authorization header
curl -H "Authorization: Bearer <TOKEN>" http://localhost:8889/api/traffic

# Query parameter
curl "http://localhost:8889/api/traffic?token=<TOKEN>"
```

Requests with a missing or invalid token receive `401 Unauthorized`. A few read-only certificate/health endpoints are exempt so device setup still works. The API also binds to `127.0.0.1` by default with CORS locked down and DNS-rebinding protection enabled.

::: tip Full Security Model
The curl examples elsewhere in this reference omit the token for brevity -- add `-H "Authorization: Bearer <TOKEN>"` (or `?token=<TOKEN>`) to each. See [Security & Session Token](/features/security) for the complete model.
:::

## Error Response Format

All errors follow a consistent format with an `error` field containing a human-readable message:

```json
{
  "error": "Traffic entry not found"
}
```

Validation errors also use this format:

```json
{
  "error": "Method and URL are required"
}
```

## HTTP Status Codes

| Status Code | Meaning | Used When |
|---|---|---|
| `200 OK` | Success | GET, PUT, PATCH, DELETE operations succeed |
| `201 Created` | Resource created | POST operations that create new resources |
| `400 Bad Request` | Invalid input | Missing required fields, invalid data format |
| `404 Not Found` | Resource not found | Requested ID does not exist |
| `500 Internal Server Error` | Server error | Unexpected errors during processing |

## Content-Type Headers

| Direction | Header | Value |
|---|---|---|
| Request | `Content-Type` | `application/json` |
| Response | `Content-Type` | `application/json` |
| File download | `Content-Type` | `application/json` or `application/x-pem-file` |
| File upload | `Content-Type` | `multipart/form-data` |

## Common Response Patterns

### Success with Data

```json
{
  "entries": [...],
  "count": 42
}
```

### Success without Data

```json
{
  "success": true
}
```

### Deletion Response

```json
{
  "success": true
}
```

## Real-Time Events

In addition to the REST API, NectoProxy provides real-time event streaming via **Socket.IO**. The Socket.IO server runs on the same host and port as the REST API.

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:8889');

socket.on('traffic:batch', (entries) => {
  console.log('New traffic:', entries);
});
```

See the [Real-Time Events](./realtime-events) documentation for a full list of events.

## API Sections

| Section | Description |
|---|---|
| [Traffic](./traffic) | Inspect, search, delete, and replay HTTP traffic |
| [Sessions](./sessions) | Manage capture sessions |
| [Rules](./rules) | Create and manage request/response modification rules |
| [Breakpoints](./breakpoints) | Set breakpoints to intercept and modify live traffic |
| [Network Conditioning](./network) | Simulate network conditions (3G, latency, packet loss) |
| [SSL Passthrough](./ssl-passthrough) | Bypass SSL interception for specific domains |
| [DNS Mapping](./dns) | Override DNS resolution for custom domain routing |
| [HAR](./har) | Import and export traffic in HAR format |
| [Settings](./settings) | Configure proxy and UI settings |
| [Upstream Proxy](./upstream-proxy) | Chain through an upstream proxy server |
| [Certificates](./certificates) | Manage the CA certificate for HTTPS interception |
| [WebSocket Frames](./websocket) | Inspect captured WebSocket frames |
| [Annotations](./annotations) | Add notes and tags to traffic entries |
| [Real-Time Events](./realtime-events) | Subscribe to live events via Socket.IO |

## Quick Start Example

```bash
# 1. Create a session
curl -X POST http://localhost:8889/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"name": "API Test"}'

# 2. List captured traffic (after browsing through the proxy)
curl http://localhost:8889/api/traffic?limit=10

# 3. Search for specific requests
curl "http://localhost:8889/api/traffic/search?q=api.github.com"

# 4. Export traffic as HAR
curl http://localhost:8889/api/har/export/SESSION_ID -o traffic.har
```
