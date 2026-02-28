---
title: Modify Response Action
description: Alter HTTP responses before they reach the client. Change status codes, inject headers, and replace response bodies for testing and development.
---

# Modify Response Action

The **Modify Response** action lets you intercept the server's response and alter it before NectoProxy delivers it to the client. The request is forwarded to the upstream server normally, but the response is modified on its way back.

This is the counterpart to [Modify Request](./modify-request). While Modify Request alters what the server receives, Modify Response alters what the client receives.

## How It Works

1. A request arrives at the proxy and matches a rule with the `modifyResponse` action.
2. The request is forwarded to the target server **unmodified**.
3. The server returns its response to NectoProxy.
4. NectoProxy applies the configured modifications to the response.
5. The **modified** response is delivered to the client.

```
Client ──► NectoProxy ──► Server
                              │
Client ◄──[modify]◄── NectoProxy ◄──┘
```

::: tip
Unlike the [Mock](./mock) action, Modify Response still contacts the real server. You get the actual server response as a starting point and then selectively override parts of it. This is useful when you only need to change a specific header or status code without fabricating an entire response.
:::

## Configuration Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `setStatus` | number | No | Override the HTTP status code returned to the client |
| `setHeaders` | object | No | Headers to add or overwrite on the response. Keys are header names, values are header values. |
| `removeHeaders` | array | No | Array of header names to remove from the response. |
| `replaceBody` | string | No | Replacement for the entire response body. |

## Practical Examples

### Example 1: Inject Security Headers

Add security headers to responses from a server that does not set them. This lets you test your application's behavior with stricter security policies before deploying server-side changes.

```json
{
  "name": "Add Security Headers",
  "enabled": true,
  "priority": 5,
  "matchPattern": {
    "url": "*",
    "host": "app.example.com"
  },
  "action": "modifyResponse",
  "config": {
    "setHeaders": {
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block",
      "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
    }
  }
}
```

Test it:

```bash
curl -x http://localhost:8888 -I http://app.example.com/
```

The response will include all the security headers regardless of whether the server set them.

### Example 2: Override API Response Data

Replace the response body from an API endpoint to inject test data into your application without modifying the server.

```json
{
  "name": "Override User Profile Response",
  "enabled": true,
  "priority": 2,
  "matchPattern": {
    "url": "*/api/me",
    "method": "GET"
  },
  "action": "modifyResponse",
  "config": {
    "setHeaders": {
      "Content-Type": "application/json"
    },
    "replaceBody": "{\"id\":1,\"name\":\"Test Admin\",\"email\":\"admin@example.com\",\"role\":\"super_admin\",\"permissions\":[\"read\",\"write\",\"delete\",\"admin\"],\"subscription\":\"enterprise\",\"features\":{\"darkMode\":true,\"betaAccess\":true,\"maxUploadSize\":104857600}}"
  }
}
```

```bash
curl -x http://localhost:8888 -s http://api.example.com/api/me | python3 -m json.tool
```

::: tip
This is a practical technique for testing role-based access control. Override the `/api/me` or user profile endpoint to return different user roles and verify that your UI correctly shows or hides features based on the user's permissions.
:::

### Example 3: Force a Different Status Code

Change the status code of a response to test your application's handling of specific HTTP statuses.

```json
{
  "name": "Force 429 Rate Limit",
  "enabled": true,
  "priority": 1,
  "matchPattern": {
    "url": "*/api/search*",
    "method": "GET"
  },
  "action": "modifyResponse",
  "config": {
    "setStatus": 429,
    "setHeaders": {
      "Retry-After": "60",
      "X-RateLimit-Limit": "100",
      "X-RateLimit-Remaining": "0",
      "X-RateLimit-Reset": "1700000060"
    },
    "replaceBody": "{\"error\":\"rate_limit_exceeded\",\"message\":\"You have exceeded the rate limit. Please wait 60 seconds before retrying.\",\"retry_after\":60}"
  }
}
```

::: warning
When overriding status codes, keep in mind that some client libraries interpret status codes automatically (e.g., redirecting on 3xx, throwing on 4xx/5xx). Make sure your test accounts for these behaviors.
:::

### Example 4: Remove Sensitive Headers from Responses

Strip server information headers that could reveal implementation details.

```json
{
  "name": "Remove Server Info Headers",
  "enabled": true,
  "priority": 10,
  "matchPattern": {
    "url": "*"
  },
  "action": "modifyResponse",
  "config": {
    "removeHeaders": [
      "Server",
      "X-Powered-By",
      "X-AspNet-Version",
      "X-AspNetMvc-Version",
      "X-Runtime",
      "X-Version",
      "X-Request-Id"
    ]
  }
}
```

This is useful for security testing -- verify how your application behaves when these headers are absent, or use it as a proxy-level security hardening measure.

### Example 5: Add CORS Headers for Local Development

When developing a frontend application that calls APIs on different domains, you often encounter CORS errors. A Modify Response rule can inject the necessary CORS headers.

```json
{
  "name": "Add CORS Headers",
  "enabled": true,
  "priority": 3,
  "matchPattern": {
    "url": "*/api/*",
    "host": "api.example.com"
  },
  "action": "modifyResponse",
  "config": {
    "setHeaders": {
      "Access-Control-Allow-Origin": "http://localhost:3000",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Max-Age": "86400"
    }
  }
}
```

```bash
# Verify CORS headers are present
curl -x http://localhost:8888 \
  -H "Origin: http://localhost:3000" \
  -I http://api.example.com/api/v1/users
```

::: danger
Be cautious with wildcard CORS configurations (`Access-Control-Allow-Origin: *`) in any environment that handles real user data. This rule is intended for local development only.
:::

## Use Cases

### Injecting Test Data

Override specific response bodies to provide controlled test data to your application. This is especially useful when:
- The server returns randomized data and you need deterministic test inputs
- You want to test edge cases that are hard to produce on the real server
- You need to simulate a specific application state

### Changing API Responses for Testing

Modify response data to test how your application handles variations:
- Change a user's subscription tier to test premium features
- Alter pagination metadata to test empty states
- Modify timestamps to test time-sensitive features

### Adding Security Headers

Test Content Security Policy (CSP), HSTS, and other security headers before deploying them on the server. This lets you catch CSP violations and fix them locally before the changes go live.

### CORS Development

During local frontend development, CORS restrictions often block API calls. Modify Response rules can add the required CORS headers to any API, eliminating the need for server-side CORS configuration during development.

### Debugging and Inspection

Add custom response headers for debugging purposes:

```json
{
  "config": {
    "setHeaders": {
      "X-Proxy-Debug": "true",
      "X-Original-Status": "200",
      "X-Rule-Applied": "modify-response-debug"
    }
  }
}
```

## Modify Response vs. Mock

| Aspect | Modify Response | Mock |
|--------|----------------|------|
| **Contacts server** | Yes | No |
| **Starting point** | Real server response | Empty response |
| **Best for** | Tweaking existing responses | Fabricating entire responses |
| **Server required** | Yes | No |
| **Selective changes** | Yes -- change only what you need | Must define the complete response |

Use **Modify Response** when you want to make surgical changes to real server responses. Use **Mock** when you need to fabricate entire responses or when the server is unavailable.

::: details Order of Operations
When a Modify Response rule is applied, the modifications happen in this order:

1. **setStatus** -- the response status code is overridden
2. **removeHeaders** -- specified headers are removed from the response
3. **setHeaders** -- specified headers are added or overwritten
4. **replaceBody** -- the entire response body is replaced (if specified)

This order ensures that header removals and additions do not conflict, and the body replacement is the final step.
:::
