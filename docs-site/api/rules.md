# Rules API

The Rules API allows you to create and manage request/response modification rules. Rules can mock responses, redirect requests, modify headers, add delays, throttle bandwidth, or block requests entirely.

## Endpoints Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/rules` | List all rules |
| `GET` | `/api/rules/enabled` | List enabled rules only |
| `GET` | `/api/rules/:id` | Get a specific rule |
| `POST` | `/api/rules` | Create a new rule |
| `PUT` | `/api/rules/:id` | Update a rule |
| `PATCH` | `/api/rules/:id/toggle` | Toggle rule enabled/disabled |
| `POST` | `/api/rules/reorder` | Reorder rule priorities |
| `DELETE` | `/api/rules/:id` | Delete a rule |

---

## List All Rules

```
GET /api/rules
```

Retrieve all rules ordered by priority.

### Example Request

```bash
curl http://localhost:8889/api/rules
```

### Response `200 OK`

```json
{
  "rules": [
    {
      "id": "rule-uuid-1",
      "name": "Mock Users API",
      "enabled": true,
      "priority": 1,
      "match": {
        "url": "*/api/users*",
        "method": "GET"
      },
      "action": "mock",
      "config": {
        "status": 200,
        "headers": { "content-type": "application/json" },
        "body": "{\"users\": []}"
      },
      "createdAt": 1709136000000,
      "updatedAt": 1709136000000
    }
  ]
}
```

---

## List Enabled Rules

```
GET /api/rules/enabled
```

Retrieve only rules that are currently enabled.

### Example Request

```bash
curl http://localhost:8889/api/rules/enabled
```

### Response `200 OK`

```json
{
  "rules": [
    {
      "id": "rule-uuid-1",
      "name": "Mock Users API",
      "enabled": true,
      "..."
    }
  ]
}
```

---

## Get Specific Rule

```
GET /api/rules/:id
```

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `id` | `string` | Rule ID |

### Example Request

```bash
curl http://localhost:8889/api/rules/rule-uuid-1
```

### Response `200 OK`

Returns the full rule object.

### Error `404 Not Found`

```json
{
  "error": "Rule not found"
}
```

---

## Create a Rule

```
POST /api/rules
```

Create a new request/response modification rule.

### Request Body

```json
{
  "name": "Block Analytics",
  "enabled": true,
  "priority": 10,
  "match": {
    "host": "*.google-analytics.com"
  },
  "action": "block",
  "config": null
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | Yes | Human-readable rule name |
| `enabled` | `boolean` | No | Default: `true` |
| `priority` | `number` | No | Execution priority (lower = higher priority) |
| `match` | `object` | Yes | Matching criteria (see [Match Object](#match-object)) |
| `action` | `string` | Yes | Action type (see [Action Types](#action-types)) |
| `config` | `object\|null` | No | Action-specific configuration |

### Example Request

```bash
curl -X POST http://localhost:8889/api/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mock Login Endpoint",
    "enabled": true,
    "priority": 1,
    "match": {
      "url": "*/api/auth/login",
      "method": "POST"
    },
    "action": "mock",
    "config": {
      "status": 200,
      "headers": { "content-type": "application/json" },
      "body": "{\"token\": \"mock-jwt-token\", \"user\": {\"id\": 1}}",
      "delay": 500
    }
  }'
```

### Response `201 Created`

Returns the created rule object with generated `id`, `createdAt`, and `updatedAt` fields.

---

## Update a Rule

```
PUT /api/rules/:id
```

Update an existing rule. Only provided fields are updated; omitted fields remain unchanged.

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `id` | `string` | Rule ID |

### Request Body

```json
{
  "name": "Updated Rule Name",
  "enabled": false,
  "match": {
    "url": "*/api/v2/users*"
  }
}
```

### Example Request

```bash
curl -X PUT http://localhost:8889/api/rules/rule-uuid-1 \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```

### Response `200 OK`

Returns the updated rule object.

### Error `404 Not Found`

```json
{
  "error": "Rule not found"
}
```

---

## Toggle Rule

```
PATCH /api/rules/:id/toggle
```

Toggle a rule between enabled and disabled states.

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `id` | `string` | Rule ID |

### Example Request

```bash
curl -X PATCH http://localhost:8889/api/rules/rule-uuid-1/toggle
```

### Response `200 OK`

Returns the updated rule object with the toggled `enabled` value.

### Error `404 Not Found`

```json
{
  "error": "Rule not found"
}
```

---

## Reorder Rules

```
POST /api/rules/reorder
```

Update the priority order of all rules. Rules are applied in priority order (lower number = higher priority).

### Request Body

```json
{
  "orderedIds": [
    "rule-uuid-3",
    "rule-uuid-1",
    "rule-uuid-2"
  ]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `orderedIds` | `string[]` | Yes | Array of rule IDs in desired priority order |

### Example Request

```bash
curl -X POST http://localhost:8889/api/rules/reorder \
  -H "Content-Type: application/json" \
  -d '{"orderedIds": ["rule-uuid-3", "rule-uuid-1", "rule-uuid-2"]}'
```

### Response `200 OK`

```json
{
  "rules": [
    { "id": "rule-uuid-3", "priority": 0, "..." },
    { "id": "rule-uuid-1", "priority": 1, "..." },
    { "id": "rule-uuid-2", "priority": 2, "..." }
  ]
}
```

### Error `400 Bad Request`

```json
{
  "error": "orderedIds must be an array"
}
```

---

## Delete a Rule

```
DELETE /api/rules/:id
```

Permanently delete a rule.

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `id` | `string` | Rule ID |

### Example Request

```bash
curl -X DELETE http://localhost:8889/api/rules/rule-uuid-1
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
  "error": "Rule not found"
}
```

---

## Match Object {#match-object}

The `match` object defines which requests a rule applies to. All specified fields must match for the rule to trigger (AND logic).

```json
{
  "url": "*/api/users*",
  "method": "GET",
  "host": "api.example.com",
  "path": "/api/users/*",
  "headers": {
    "content-type": "application/json"
  },
  "bodyContains": "username"
}
```

| Field | Type | Description |
|---|---|---|
| `url` | `string` | URL pattern to match (supports `*` wildcards and regex) |
| `method` | `string \| string[]` | HTTP method(s) to match (e.g., `"GET"` or `["GET", "POST"]`) |
| `host` | `string` | Hostname to match (supports `*` wildcards, e.g., `*.example.com`) |
| `path` | `string` | Path pattern to match (supports `*` wildcards and regex) |
| `headers` | `object` | Header key-value pairs to match (values support regex) |
| `bodyContains` | `string` | String that must appear in the request body |

::: tip Wildcard and Regex Matching
- Use `*` for simple wildcard matching: `*/api/users*` matches any URL containing `/api/users`
- URL and path fields support regular expressions for complex patterns
- Header values also support regular expressions
:::

---

## Action Types {#action-types}

### `mock` - Return a Mock Response

Returns a predefined response without forwarding the request to the server.

```json
{
  "action": "mock",
  "config": {
    "status": 200,
    "statusText": "OK",
    "headers": {
      "content-type": "application/json",
      "x-mocked": "true"
    },
    "body": "{\"data\": \"mocked\"}",
    "bodyFile": "/path/to/response.json",
    "delay": 200
  }
}
```

| Field | Type | Description |
|---|---|---|
| `status` | `number` | HTTP status code |
| `statusText` | `string` | HTTP status text |
| `headers` | `object` | Response headers |
| `body` | `string` | Response body content |
| `bodyFile` | `string` | Path to file to serve as body (alternative to `body`) |
| `delay` | `number` | Delay in milliseconds before sending response |

### `map-local` - Serve from Local File

Maps the request to a local file on disk.

```json
{
  "action": "map-local",
  "config": {
    "localPath": "/home/user/mocks/api-response.json",
    "preserveHost": true
  }
}
```

| Field | Type | Description |
|---|---|---|
| `localPath` | `string` | Absolute path to the local file |
| `preserveHost` | `boolean` | Keep the original Host header |

### `map-remote` - Redirect to Different URL

Forwards the request to a different server.

```json
{
  "action": "map-remote",
  "config": {
    "targetUrl": "https://staging-api.example.com",
    "preservePath": true,
    "preserveQuery": true
  }
}
```

| Field | Type | Description |
|---|---|---|
| `targetUrl` | `string` | Target base URL |
| `preservePath` | `boolean` | Append original path to target URL |
| `preserveQuery` | `boolean` | Include original query parameters |

### `modify-request` - Modify Outgoing Request

Alters the request before it is sent to the server.

```json
{
  "action": "modify-request",
  "config": {
    "setHeaders": {
      "X-Custom-Header": "injected-value",
      "Authorization": "Bearer override-token"
    },
    "removeHeaders": ["cookie", "x-tracking-id"],
    "setQueryParams": {
      "debug": "true"
    },
    "removeQueryParams": ["tracking_id"],
    "replaceBody": "{\"overridden\": true}",
    "transformBody": "function(body) { body.timestamp = Date.now(); return body; }"
  }
}
```

| Field | Type | Description |
|---|---|---|
| `setHeaders` | `object` | Headers to add or override |
| `removeHeaders` | `string[]` | Header names to remove |
| `setQueryParams` | `object` | Query parameters to add or override |
| `removeQueryParams` | `string[]` | Query parameter names to remove |
| `replaceBody` | `string` | Replace the entire request body |
| `transformBody` | `string` | JavaScript function to transform the body |

### `modify-response` - Modify Server Response

Alters the response before it is returned to the client.

```json
{
  "action": "modify-response",
  "config": {
    "setStatus": 200,
    "setHeaders": {
      "Access-Control-Allow-Origin": "*"
    },
    "removeHeaders": ["x-powered-by", "server"],
    "replaceBody": "{\"modified\": true}",
    "transformBody": "function(body) { body.injected = true; return body; }"
  }
}
```

| Field | Type | Description |
|---|---|---|
| `setStatus` | `number` | Override the response status code |
| `setHeaders` | `object` | Headers to add or override |
| `removeHeaders` | `string[]` | Header names to remove |
| `replaceBody` | `string` | Replace the entire response body |
| `transformBody` | `string` | JavaScript function to transform the body |

### `delay` - Add Latency

Adds an artificial delay before the response is returned.

```json
{
  "action": "delay",
  "config": {
    "delay": 2000,
    "variance": 500
  }
}
```

| Field | Type | Description |
|---|---|---|
| `delay` | `number` | Delay in milliseconds |
| `variance` | `number` | Random variance +/- in milliseconds |

### `throttle` - Limit Bandwidth

Slows down data transfer to simulate a constrained connection.

```json
{
  "action": "throttle",
  "config": {
    "bytesPerSecond": 51200,
    "latency": 100
  }
}
```

| Field | Type | Description |
|---|---|---|
| `bytesPerSecond` | `number` | Maximum transfer rate in bytes per second |
| `latency` | `number` | Additional latency in milliseconds |

### `block` - Block Request

Prevents the request from reaching the server. No config is needed.

```json
{
  "action": "block",
  "config": null
}
```

---

## Complete Rule Example

::: details Full example: CORS headers + API mock

```bash
# Add CORS headers to all API responses
curl -X POST http://localhost:8889/api/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Add CORS Headers",
    "enabled": true,
    "priority": 1,
    "match": {
      "host": "api.example.com"
    },
    "action": "modify-response",
    "config": {
      "setHeaders": {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    }
  }'

# Mock the login endpoint
curl -X POST http://localhost:8889/api/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mock Login",
    "enabled": true,
    "priority": 2,
    "match": {
      "url": "*/auth/login",
      "method": "POST"
    },
    "action": "mock",
    "config": {
      "status": 200,
      "headers": { "content-type": "application/json" },
      "body": "{\"token\": \"mock-jwt\", \"expiresIn\": 3600}"
    }
  }'
```
:::

::: tip Real-Time Updates
When rules are created, updated, toggled, or deleted via the API, corresponding Socket.IO events are emitted (`rule:created`, `rule:updated`, `rule:toggled`, `rule:deleted`). The Web UI listens to these events to stay in sync.
:::
