---
title: Mock Action
description: Return custom HTTP responses without hitting the actual server. Ideal for API prototyping, testing error scenarios, and offline development.
---

# Mock Action

The **Mock** action intercepts a matched request and returns a fully custom HTTP response directly from NectoProxy, without ever forwarding the request to the upstream server.

This is one of the most powerful rule actions available. It effectively turns NectoProxy into a lightweight API server for any matched request pattern, allowing you to simulate backends, prototype interfaces, and test edge cases with zero server-side changes.

## How It Works

1. A request arrives at the proxy and matches a rule with the `mock` action.
2. NectoProxy short-circuits the request -- it is **not** forwarded to the target server.
3. NectoProxy constructs an HTTP response using the values in your `config` object.
4. The constructed response is returned to the client as if it came from the real server.

```
Client ──► NectoProxy ──✕ (request NOT forwarded)
                │
                └──► Returns mock response to client
```

::: tip
Since the request never leaves the proxy, mock rules work even when the target server is unreachable, down, or does not yet exist. This makes mocking ideal for offline development and frontend prototyping.
:::

## Configuration Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `status` | number | No | `200` | HTTP status code of the mock response |
| `statusText` | string | No | Auto (based on status) | Custom status text (e.g., "OK", "Not Found") |
| `headers` | object | No | `{}` | Response headers as key-value pairs |
| `body` | string | No | `""` | Response body content |
| `delay` | number | No | `0` | Delay in milliseconds before sending the response |

## Practical Examples

### Example 1: Mock a JSON API Endpoint

Return a list of users from a REST API that does not exist yet.

```json
{
  "name": "Mock Users API",
  "enabled": true,
  "priority": 1,
  "matchPattern": {
    "url": "*/api/v1/users",
    "method": "GET"
  },
  "action": "mock",
  "config": {
    "status": 200,
    "headers": {
      "Content-Type": "application/json",
      "X-Request-Id": "mock-12345",
      "Cache-Control": "no-cache"
    },
    "body": "{\"users\":[{\"id\":1,\"name\":\"Alice Johnson\",\"email\":\"alice@example.com\",\"role\":\"admin\"},{\"id\":2,\"name\":\"Bob Smith\",\"email\":\"bob@example.com\",\"role\":\"user\"},{\"id\":3,\"name\":\"Carol White\",\"email\":\"carol@example.com\",\"role\":\"user\"}],\"total\":3,\"page\":1}"
  }
}
```

Test it with curl:

```bash
curl -x http://localhost:8888 http://api.example.com/api/v1/users
```

Expected output:

```json
{
  "users": [
    { "id": 1, "name": "Alice Johnson", "email": "alice@example.com", "role": "admin" },
    { "id": 2, "name": "Bob Smith", "email": "bob@example.com", "role": "user" },
    { "id": 3, "name": "Carol White", "email": "carol@example.com", "role": "user" }
  ],
  "total": 3,
  "page": 1
}
```

### Example 2: Mock an HTML Page

Return a simple HTML page for a route that is still under development.

```json
{
  "name": "Mock Dashboard Page",
  "enabled": true,
  "priority": 2,
  "matchPattern": {
    "url": "*/dashboard",
    "method": "GET"
  },
  "action": "mock",
  "config": {
    "status": 200,
    "headers": {
      "Content-Type": "text/html; charset=utf-8"
    },
    "body": "<!DOCTYPE html><html><head><title>Dashboard</title></head><body><h1>Dashboard</h1><p>This page is under construction. Mock data is being served by NectoProxy.</p><ul><li>Active Users: 142</li><li>Revenue: $12,450</li><li>Uptime: 99.97%</li></ul></body></html>"
  }
}
```

### Example 3: Mock an Error Response

Simulate a server error to test your application's error handling logic.

```json
{
  "name": "Simulate 500 on Payment API",
  "enabled": true,
  "priority": 1,
  "matchPattern": {
    "url": "*/api/payments*",
    "method": "POST"
  },
  "action": "mock",
  "config": {
    "status": 500,
    "statusText": "Internal Server Error",
    "headers": {
      "Content-Type": "application/json",
      "Retry-After": "30"
    },
    "body": "{\"error\":\"internal_server_error\",\"message\":\"An unexpected error occurred while processing your payment. Please try again later.\",\"request_id\":\"req_mock_err_001\"}"
  }
}
```

Test it:

```bash
curl -x http://localhost:8888 \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"amount": 99.99, "currency": "USD"}' \
  http://api.example.com/api/payments
```

::: danger
When testing error scenarios in production-like environments, always use specific match patterns to avoid accidentally returning errors for unrelated requests.
:::

### Example 4: Mock with Simulated Latency

Add a realistic delay to your mock response to simulate a slow API. This is useful for testing loading states, spinners, and timeout handling in your frontend.

```json
{
  "name": "Slow Search API Mock",
  "enabled": true,
  "priority": 5,
  "matchPattern": {
    "url": "*/api/search*",
    "method": "GET"
  },
  "action": "mock",
  "config": {
    "status": 200,
    "headers": {
      "Content-Type": "application/json"
    },
    "body": "{\"results\":[{\"id\":101,\"title\":\"Introduction to Proxy Debugging\",\"score\":0.95},{\"id\":102,\"title\":\"Advanced Network Analysis\",\"score\":0.87}],\"query\":\"proxy\",\"took_ms\":1823}",
    "delay": 2000
  }
}
```

This rule waits 2000 milliseconds before returning the response, giving you time to observe loading indicators in your UI.

::: tip
Combining `delay` with error status codes is an effective way to test timeout logic. For example, set `delay` to 31000 ms and `status` to 504 to simulate a gateway timeout that occurs after your client's 30-second timeout threshold.
:::

## Use Cases

### API Development Without a Backend

When building a frontend application, you often need API endpoints that do not exist yet. Mock rules let you define the expected API contract and develop against it immediately.

1. Define the API schema with your backend team.
2. Create mock rules that return the agreed-upon response shapes.
3. Build your frontend against the mocked endpoints.
4. When the real backend is ready, disable the mock rules.

### Testing Error Scenarios

Real servers rarely fail on demand. Mock rules let you simulate any HTTP error scenario:

- **400 Bad Request** -- Malformed input handling
- **401 Unauthorized** -- Expired token / session flows
- **403 Forbidden** -- Permission denied screens
- **404 Not Found** -- Missing resource pages
- **429 Too Many Requests** -- Rate limiting behavior
- **500 Internal Server Error** -- Generic server failure
- **502 Bad Gateway** -- Upstream failure
- **503 Service Unavailable** -- Maintenance mode

### Offline Development

Mock rules work without any network connectivity. You can develop and test your entire application on an airplane, in a coffee shop without WiFi, or in any disconnected environment.

### Prototyping and Demos

When preparing a demo or prototype, mock rules let you show realistic data without depending on a live environment. You control every aspect of the response, so your demo never breaks because of a flaky staging server.

::: details When to Use Mock vs. Map Local
Both Mock and [Map Local](./map-local) can serve responses without hitting a remote server. Choose based on your needs:

- **Mock**: Best for small, inline responses like JSON payloads or simple HTML. The response body is defined directly in the rule configuration.
- **Map Local**: Best for larger files, binary assets, or responses you want to edit with your regular code editor. The response is served from a file on disk.
:::

## Verifying Mock Rules

After creating a mock rule, verify it by sending a request through the proxy and checking the response:

```bash
# Verify status code and headers
curl -x http://localhost:8888 -v http://api.example.com/api/v1/users 2>&1 | head -20

# Verify response body
curl -x http://localhost:8888 -s http://api.example.com/api/v1/users | python3 -m json.tool
```

You can also inspect the matched rule in the NectoProxy Web UI. The traffic log will indicate which rule was applied to each request.
