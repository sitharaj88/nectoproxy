# Breakpoints API

The Breakpoints API lets you define conditions under which live traffic is paused for inspection and modification. When a breakpoint is hit, the request or response is held until you resume it through the Web UI or via the Socket.IO `breakpoint:resume` event.

## Endpoints Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/breakpoints` | List all breakpoints |
| `GET` | `/api/breakpoints/enabled` | List enabled breakpoints only |
| `GET` | `/api/breakpoints/:id` | Get a specific breakpoint |
| `POST` | `/api/breakpoints` | Create a new breakpoint |
| `PUT` | `/api/breakpoints/:id` | Update a breakpoint |
| `PATCH` | `/api/breakpoints/:id/toggle` | Toggle breakpoint enabled/disabled |
| `DELETE` | `/api/breakpoints/:id` | Delete a breakpoint |

---

## List All Breakpoints

```
GET /api/breakpoints
```

### Example Request

```bash
curl http://localhost:8889/api/breakpoints
```

### Response `200 OK`

```json
{
  "breakpoints": [
    {
      "id": "bp-uuid-1",
      "name": "Pause Login Requests",
      "enabled": true,
      "type": "request",
      "match": {
        "url": "*/api/auth/login",
        "method": "POST"
      },
      "conditions": [
        {
          "field": "header",
          "operator": "contains",
          "value": "Bearer",
          "headerName": "Authorization"
        }
      ],
      "conditionLogic": "and",
      "createdAt": 1709136000000
    }
  ]
}
```

---

## List Enabled Breakpoints

```
GET /api/breakpoints/enabled
```

### Example Request

```bash
curl http://localhost:8889/api/breakpoints/enabled
```

### Response `200 OK`

```json
{
  "breakpoints": [
    {
      "id": "bp-uuid-1",
      "name": "Pause Login Requests",
      "enabled": true,
      "..."
    }
  ]
}
```

---

## Get Specific Breakpoint

```
GET /api/breakpoints/:id
```

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `id` | `string` | Breakpoint ID |

### Example Request

```bash
curl http://localhost:8889/api/breakpoints/bp-uuid-1
```

### Response `200 OK`

Returns the full breakpoint object.

### Error `404 Not Found`

```json
{
  "error": "Breakpoint not found"
}
```

---

## Create a Breakpoint

```
POST /api/breakpoints
```

### Request Body

```json
{
  "name": "Pause API Responses",
  "enabled": true,
  "type": "response",
  "match": {
    "host": "api.example.com",
    "method": ["GET", "POST"]
  },
  "conditions": [
    {
      "field": "status",
      "operator": "greaterThan",
      "value": "399"
    }
  ],
  "conditionLogic": "and"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | Yes | Human-readable breakpoint name |
| `enabled` | `boolean` | No | Default: `true` |
| `type` | `string` | Yes | When to pause: `request`, `response`, or `both` |
| `match` | `object` | Yes | URL/method matching criteria (same as [Rules match object](./rules#match-object)) |
| `conditions` | `array` | No | Additional conditions to evaluate (see [Conditions](#conditions)) |
| `conditionLogic` | `string` | No | How to combine conditions: `and` (all must match) or `or` (any must match). Default: `and` |

### Example Request

```bash
curl -X POST http://localhost:8889/api/breakpoints \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Intercept Error Responses",
    "enabled": true,
    "type": "response",
    "match": {
      "host": "api.example.com"
    },
    "conditions": [
      {
        "field": "status",
        "operator": "greaterThan",
        "value": "399"
      }
    ],
    "conditionLogic": "and"
  }'
```

### Response `201 Created`

```json
{
  "id": "bp-uuid-2",
  "name": "Intercept Error Responses",
  "enabled": true,
  "type": "response",
  "match": {
    "host": "api.example.com"
  },
  "conditions": [
    {
      "field": "status",
      "operator": "greaterThan",
      "value": "399"
    }
  ],
  "conditionLogic": "and",
  "createdAt": 1709136000000
}
```

---

## Update a Breakpoint

```
PUT /api/breakpoints/:id
```

Update an existing breakpoint. Only provided fields are updated.

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `id` | `string` | Breakpoint ID |

### Request Body

```json
{
  "name": "Updated Breakpoint Name",
  "type": "both",
  "conditions": []
}
```

### Example Request

```bash
curl -X PUT http://localhost:8889/api/breakpoints/bp-uuid-1 \
  -H "Content-Type: application/json" \
  -d '{"name": "Renamed Breakpoint", "type": "both"}'
```

### Response `200 OK`

Returns the updated breakpoint object.

### Error `404 Not Found`

```json
{
  "error": "Breakpoint not found"
}
```

---

## Toggle Breakpoint

```
PATCH /api/breakpoints/:id/toggle
```

Toggle a breakpoint between enabled and disabled.

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `id` | `string` | Breakpoint ID |

### Example Request

```bash
curl -X PATCH http://localhost:8889/api/breakpoints/bp-uuid-1/toggle
```

### Response `200 OK`

Returns the updated breakpoint object with the toggled `enabled` value.

### Error `404 Not Found`

```json
{
  "error": "Breakpoint not found"
}
```

---

## Delete a Breakpoint

```
DELETE /api/breakpoints/:id
```

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `id` | `string` | Breakpoint ID |

### Example Request

```bash
curl -X DELETE http://localhost:8889/api/breakpoints/bp-uuid-1
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
  "error": "Breakpoint not found"
}
```

---

## Breakpoint Types

| Type | Description |
|---|---|
| `request` | Pauses the outgoing request before it is sent to the server. You can inspect and modify the request method, URL, headers, and body. |
| `response` | Pauses the incoming response before it is returned to the client. You can inspect and modify the status code, headers, and body. |
| `both` | Pauses on both the request and the response phases. |

---

## Conditions {#conditions}

Conditions provide fine-grained control over when a breakpoint triggers. Each condition evaluates a specific field using an operator.

### Condition Object

```json
{
  "field": "status",
  "operator": "greaterThan",
  "value": "499",
  "headerName": "Content-Type"
}
```

| Field | Type | Description |
|---|---|---|
| `field` | `string` | The field to evaluate |
| `operator` | `string` | The comparison operator |
| `value` | `string` | The value to compare against |
| `headerName` | `string` | Header name (only when `field` is `header`) |

### Available Fields

| Field | Description | Example Values |
|---|---|---|
| `status` | HTTP response status code | `"404"`, `"500"` |
| `url` | Full request URL | `"https://api.example.com"` |
| `method` | HTTP method | `"POST"`, `"DELETE"` |
| `header` | Specific header value (requires `headerName`) | `"application/json"` |
| `requestBody` | Request body content | `"password"` |
| `responseBody` | Response body content | `"error"` |
| `duration` | Request duration in milliseconds | `"5000"` |
| `host` | Request hostname | `"api.example.com"` |

### Available Operators

| Operator | Description |
|---|---|
| `equals` | Exact match |
| `contains` | Substring match |
| `startsWith` | Starts with the value |
| `endsWith` | Ends with the value |
| `matches` | Regular expression match |
| `greaterThan` | Numeric greater than |
| `lessThan` | Numeric less than |

### Condition Logic

When multiple conditions are specified, the `conditionLogic` field determines how they are combined:

- **`and`** (default): All conditions must be true for the breakpoint to trigger.
- **`or`**: Any single condition being true triggers the breakpoint.

---

## How Breakpoints Work

::: tip Breakpoint Flow
1. A request/response matches the breakpoint's `match` criteria
2. Additional `conditions` are evaluated (if any)
3. If all criteria are met, a `breakpoint:hit` Socket.IO event is emitted
4. The request/response is held in memory
5. The user inspects and optionally modifies the data in the Web UI
6. The user resumes via the UI or sends a `breakpoint:resume` Socket.IO event
7. The modified request/response continues its journey
:::

::: warning Timeout Behavior
Breakpoints have a configurable timeout (default: 30 seconds). If a breakpoint is not resumed within this period, the request is automatically forwarded without modifications. Configure the timeout via the `breakpointTimeout` setting.
:::

---

## Example: Intercept and Inspect Failed API Calls

```bash
# Create a breakpoint that pauses on any 5xx error response
curl -X POST http://localhost:8889/api/breakpoints \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Server Errors",
    "enabled": true,
    "type": "response",
    "match": {
      "host": "api.example.com"
    },
    "conditions": [
      {
        "field": "status",
        "operator": "greaterThan",
        "value": "499"
      },
      {
        "field": "status",
        "operator": "lessThan",
        "value": "600"
      }
    ],
    "conditionLogic": "and"
  }'
```
