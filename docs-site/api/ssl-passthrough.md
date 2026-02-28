# SSL Passthrough API

The SSL Passthrough API manages domains that should bypass HTTPS interception. Traffic to passthrough domains is forwarded directly without decryption, which means it will not appear in captured traffic but the connection will not be disrupted.

::: tip When to Use SSL Passthrough
Some services use certificate pinning or mutual TLS, which prevents proxy interception. Adding these domains to the passthrough list ensures they continue to work normally while you inspect other traffic.
:::

## Endpoints Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/ssl-passthrough` | List all passthrough domains |
| `POST` | `/api/ssl-passthrough` | Add a domain |
| `DELETE` | `/api/ssl-passthrough/:id` | Remove a domain |
| `PATCH` | `/api/ssl-passthrough/:id/toggle` | Toggle domain enabled/disabled |
| `POST` | `/api/ssl-passthrough/check` | Check if a domain matches |

---

## List All Passthrough Domains

```
GET /api/ssl-passthrough
```

### Example Request

```bash
curl http://localhost:8889/api/ssl-passthrough
```

### Response `200 OK`

```json
{
  "domains": [
    {
      "id": "domain-uuid-1",
      "domain": "*.apple.com",
      "enabled": true,
      "reason": "Certificate pinning prevents interception",
      "createdAt": 1709136000000
    },
    {
      "id": "domain-uuid-2",
      "domain": "banking.example.com",
      "enabled": true,
      "reason": "Mutual TLS required",
      "createdAt": 1709136100000
    }
  ]
}
```

---

## Add a Domain

```
POST /api/ssl-passthrough
```

Add a domain to the SSL passthrough list.

### Request Body

```json
{
  "domain": "*.google.com",
  "enabled": true,
  "reason": "Certificate pinning on Google services"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `domain` | `string` | Yes | Domain name or wildcard pattern (e.g., `*.example.com`) |
| `enabled` | `boolean` | No | Whether the passthrough is active. Default: `true` |
| `reason` | `string` | No | Human-readable reason for the passthrough |

### Example Request

```bash
curl -X POST http://localhost:8889/api/ssl-passthrough \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "*.googleapis.com",
    "enabled": true,
    "reason": "Google API certificate pinning"
  }'
```

### Response `201 Created`

```json
{
  "id": "domain-uuid-3",
  "domain": "*.googleapis.com",
  "enabled": true,
  "reason": "Google API certificate pinning",
  "createdAt": 1709136200000
}
```

### Error `400 Bad Request`

```json
{
  "error": "Domain is required"
}
```

::: tip Wildcard Domains
Use `*.` prefix for wildcard matching. For example, `*.google.com` matches `maps.google.com`, `mail.google.com`, etc., but does not match `google.com` itself. Add both `google.com` and `*.google.com` to cover all subdomains.
:::

---

## Remove a Domain

```
DELETE /api/ssl-passthrough/:id
```

Remove a domain from the SSL passthrough list.

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `id` | `string` | Passthrough domain ID |

### Example Request

```bash
curl -X DELETE http://localhost:8889/api/ssl-passthrough/domain-uuid-1
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
  "error": "SSL passthrough domain not found"
}
```

---

## Toggle Domain

```
PATCH /api/ssl-passthrough/:id/toggle
```

Toggle a passthrough domain between enabled and disabled. Disabled domains remain in the list but do not affect traffic.

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `id` | `string` | Passthrough domain ID |

### Example Request

```bash
curl -X PATCH http://localhost:8889/api/ssl-passthrough/domain-uuid-1/toggle
```

### Response `200 OK`

```json
{
  "id": "domain-uuid-1",
  "domain": "*.apple.com",
  "enabled": false,
  "reason": "Certificate pinning prevents interception",
  "createdAt": 1709136000000
}
```

### Error `404 Not Found`

```json
{
  "error": "SSL passthrough domain not found"
}
```

---

## Check Domain Match

```
POST /api/ssl-passthrough/check
```

Test whether a given hostname matches any enabled passthrough rule. Useful for debugging why a domain's traffic is not being captured.

### Request Body

```json
{
  "domain": "maps.google.com"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `domain` | `string` | Yes | Hostname to check |

### Example Request

```bash
curl -X POST http://localhost:8889/api/ssl-passthrough/check \
  -H "Content-Type: application/json" \
  -d '{"domain": "maps.google.com"}'
```

### Response `200 OK`

```json
{
  "domain": "maps.google.com",
  "matches": true
}
```

When no passthrough rule matches:

```json
{
  "domain": "api.example.com",
  "matches": false
}
```

### Error `400 Bad Request`

```json
{
  "error": "Domain is required"
}
```

---

## SSL Passthrough Domain Schema

::: details Full SSLPassthroughDomain Schema
| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique identifier |
| `domain` | `string` | Domain pattern (e.g., `*.google.com` or `example.com`) |
| `enabled` | `boolean` | Whether the passthrough is currently active |
| `reason` | `string` | Optional explanation for why this domain bypasses interception |
| `createdAt` | `number` | Unix timestamp in milliseconds |
:::

---

## Common Passthrough Domains

::: details Recommended domains to add for common scenarios

```bash
# Apple services (certificate pinning)
curl -X POST http://localhost:8889/api/ssl-passthrough \
  -H "Content-Type: application/json" \
  -d '{"domain": "*.apple.com", "reason": "Apple certificate pinning"}'

# Google Play services
curl -X POST http://localhost:8889/api/ssl-passthrough \
  -H "Content-Type: application/json" \
  -d '{"domain": "*.googleapis.com", "reason": "Google certificate pinning"}'

# Banking applications
curl -X POST http://localhost:8889/api/ssl-passthrough \
  -H "Content-Type: application/json" \
  -d '{"domain": "online.bank.com", "reason": "Mutual TLS authentication"}'
```
:::
