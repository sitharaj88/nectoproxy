# DNS Mapping API

The DNS Mapping API allows you to override DNS resolution for specific domains. This lets you redirect traffic from one hostname to a different IP address without modifying the system's hosts file or DNS configuration.

::: tip Use Cases
- Route production hostnames to local development servers
- Test with staging backends using production URLs
- Simulate DNS-level failover scenarios
- Redirect API traffic to mock servers
:::

## Endpoints Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/dns` | List all DNS mappings |
| `POST` | `/api/dns` | Create a DNS mapping |
| `PUT` | `/api/dns/:id` | Update a DNS mapping |
| `PATCH` | `/api/dns/:id/toggle` | Toggle mapping enabled/disabled |
| `DELETE` | `/api/dns/:id` | Delete a DNS mapping |
| `POST` | `/api/dns/resolve` | Resolve a hostname |

---

## List All Mappings

```
GET /api/dns
```

### Example Request

```bash
curl http://localhost:8889/api/dns
```

### Response `200 OK`

```json
{
  "mappings": [
    {
      "id": "dns-uuid-1",
      "domain": "api.example.com",
      "targetIp": "127.0.0.1",
      "enabled": true,
      "description": "Route API to local dev server",
      "createdAt": 1709136000000,
      "updatedAt": 1709136000000
    },
    {
      "id": "dns-uuid-2",
      "domain": "*.staging.example.com",
      "targetIp": "10.0.1.50",
      "enabled": false,
      "description": "Staging environment",
      "createdAt": 1709136100000,
      "updatedAt": 1709136100000
    }
  ]
}
```

---

## Create a DNS Mapping

```
POST /api/dns
```

### Request Body

```json
{
  "domain": "api.example.com",
  "targetIp": "127.0.0.1",
  "enabled": true,
  "description": "Route to local development server"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `domain` | `string` | Yes | Domain name or wildcard pattern (e.g., `*.example.com`) |
| `targetIp` | `string` | Yes | Target IP address to resolve to |
| `enabled` | `boolean` | No | Whether the mapping is active. Default: `true` |
| `description` | `string` | No | Human-readable description of the mapping |

### Example Request

```bash
curl -X POST http://localhost:8889/api/dns \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "api.production.com",
    "targetIp": "127.0.0.1",
    "enabled": true,
    "description": "Redirect production API to localhost"
  }'
```

### Response `201 Created`

```json
{
  "id": "dns-uuid-3",
  "domain": "api.production.com",
  "targetIp": "127.0.0.1",
  "enabled": true,
  "description": "Redirect production API to localhost",
  "createdAt": 1709136200000,
  "updatedAt": 1709136200000
}
```

### Error `400 Bad Request`

```json
{
  "error": "Domain is required"
}
```

```json
{
  "error": "Target IP is required"
}
```

---

## Update a DNS Mapping

```
PUT /api/dns/:id
```

Update an existing DNS mapping. Only provided fields are changed.

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `id` | `string` | DNS mapping ID |

### Request Body

```json
{
  "targetIp": "192.168.1.100",
  "description": "Updated target server"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `domain` | `string` | No | Updated domain pattern |
| `targetIp` | `string` | No | Updated target IP address |
| `enabled` | `boolean` | No | Updated enabled state |
| `description` | `string` | No | Updated description |

### Example Request

```bash
curl -X PUT http://localhost:8889/api/dns/dns-uuid-1 \
  -H "Content-Type: application/json" \
  -d '{"targetIp": "192.168.1.100"}'
```

### Response `200 OK`

Returns the updated mapping object.

### Error `404 Not Found`

```json
{
  "error": "DNS mapping not found"
}
```

---

## Toggle Mapping

```
PATCH /api/dns/:id/toggle
```

Toggle a DNS mapping between enabled and disabled states.

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `id` | `string` | DNS mapping ID |

### Example Request

```bash
curl -X PATCH http://localhost:8889/api/dns/dns-uuid-1/toggle
```

### Response `200 OK`

```json
{
  "id": "dns-uuid-1",
  "domain": "api.example.com",
  "targetIp": "127.0.0.1",
  "enabled": false,
  "description": "Route API to local dev server",
  "createdAt": 1709136000000,
  "updatedAt": 1709136300000
}
```

### Error `404 Not Found`

```json
{
  "error": "DNS mapping not found"
}
```

---

## Delete a DNS Mapping

```
DELETE /api/dns/:id
```

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `id` | `string` | DNS mapping ID |

### Example Request

```bash
curl -X DELETE http://localhost:8889/api/dns/dns-uuid-1
```

### Response `200 OK`

```json
{
  "success": true
}
```

### Error `404 Not Found`

```json
{
  "error": "DNS mapping not found"
}
```

---

## Resolve Hostname

```
POST /api/dns/resolve
```

Test hostname resolution against the configured DNS mappings. Returns the target IP if a matching enabled mapping exists, or `null` if no mapping matches (in which case normal DNS resolution is used).

### Request Body

```json
{
  "hostname": "api.example.com"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `hostname` | `string` | Yes | Hostname to resolve |

### Example Request

```bash
curl -X POST http://localhost:8889/api/dns/resolve \
  -H "Content-Type: application/json" \
  -d '{"hostname": "api.example.com"}'
```

### Response `200 OK` (matched)

```json
{
  "hostname": "api.example.com",
  "resolvedIp": "127.0.0.1",
  "matched": true
}
```

### Response `200 OK` (no match)

```json
{
  "hostname": "other.example.com",
  "resolvedIp": null,
  "matched": false
}
```

### Error `400 Bad Request`

```json
{
  "error": "Hostname is required"
}
```

---

## DNS Mapping Schema

::: details Full DnsMapping Schema
| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique identifier |
| `domain` | `string` | Domain name or wildcard pattern (e.g., `api.example.com` or `*.example.com`) |
| `targetIp` | `string` | Target IP address (e.g., `127.0.0.1` or `192.168.1.100`) |
| `enabled` | `boolean` | Whether the mapping is currently active |
| `description` | `string` | Optional human-readable description |
| `createdAt` | `number` | Unix timestamp in milliseconds |
| `updatedAt` | `number` | Unix timestamp in milliseconds |
:::

---

## Example: Local Development Setup

::: details Redirect multiple services to localhost

```bash
# Route frontend to local dev server
curl -X POST http://localhost:8889/api/dns \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "app.example.com",
    "targetIp": "127.0.0.1",
    "description": "Frontend dev server on port 3000"
  }'

# Route API to local backend
curl -X POST http://localhost:8889/api/dns \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "api.example.com",
    "targetIp": "127.0.0.1",
    "description": "Backend dev server on port 4000"
  }'

# Route all staging subdomains to staging server
curl -X POST http://localhost:8889/api/dns \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "*.staging.example.com",
    "targetIp": "10.0.1.50",
    "description": "All staging services"
  }'

# Verify resolution
curl -X POST http://localhost:8889/api/dns/resolve \
  -H "Content-Type: application/json" \
  -d '{"hostname": "api.example.com"}'
```
:::
