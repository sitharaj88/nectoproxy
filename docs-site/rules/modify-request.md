---
title: Modify Request Action
description: Alter outgoing HTTP requests before they reach the upstream server. Add headers, change query parameters, and replace request bodies.
---

# Modify Request Action

The **Modify Request** action intercepts a matched request, applies your specified modifications, and then forwards the altered request to the upstream server. The server receives the modified version of the request -- it has no way of knowing the original values were different.

This is invaluable for injecting authentication headers, rewriting API versions, removing tracking parameters, and adjusting payloads on the fly.

## How It Works

1. A request arrives at the proxy and matches a rule with the `modifyRequest` action.
2. NectoProxy applies the configured modifications to the request.
3. The **modified** request is forwarded to the target server.
4. The server's response is returned to the client unmodified (unless a separate Modify Response rule also matches).

```
Client ──► NectoProxy ──[modify]──► Server
                                       │
Client ◄────────────────────────────◄──┘
```

::: tip
Modify Request rules are transparent to both the client and the server. The client sends its original request, and the server receives the modified version. Neither side is aware that the proxy altered anything.
:::

## Configuration Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `setHeaders` | object | No | Headers to add or overwrite on the request. Keys are header names, values are header values. |
| `removeHeaders` | array | No | Array of header names to remove from the request. |
| `setQueryParams` | object | No | Query string parameters to add or overwrite. Keys are parameter names, values are parameter values. |
| `removeQueryParams` | array | No | Array of query parameter names to remove from the URL. |
| `replaceBody` | string | No | Replacement for the entire request body. |

::: warning
When using `replaceBody`, the entire original request body is discarded and replaced with the provided string. There is no merge or partial replacement -- it is a full substitution. Make sure to include all necessary data in the replacement body.
:::

## Practical Examples

### Example 1: Inject Authorization Headers

Automatically add authentication headers to every API request so you do not have to configure them in your application during development.

```json
{
  "name": "Add Auth Header to API",
  "enabled": true,
  "priority": 5,
  "matchPattern": {
    "url": "*/api/*",
    "host": "api.example.com"
  },
  "action": "modifyRequest",
  "config": {
    "setHeaders": {
      "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
      "X-API-Key": "dev-api-key-12345"
    }
  }
}
```

Test it:

```bash
# Your request goes out without auth headers, but the server receives them
curl -x http://localhost:8888 http://api.example.com/api/v1/users
```

::: tip
This is especially useful when testing multiple user roles. Create separate rules with different `Authorization` values, each targeting different URL patterns. Enable only the rule for the role you want to test.
:::

### Example 2: Switch API Versions

Redirect requests from one API version to another by rewriting headers and query parameters.

```json
{
  "name": "Force API v2",
  "enabled": true,
  "priority": 3,
  "matchPattern": {
    "url": "*/api/*",
    "host": "api.example.com"
  },
  "action": "modifyRequest",
  "config": {
    "setHeaders": {
      "Accept-Version": "v2",
      "X-API-Version": "2.0"
    },
    "setQueryParams": {
      "api_version": "2"
    }
  }
}
```

```bash
# Original request: /api/users
# Server receives: /api/users?api_version=2 with version headers
curl -x http://localhost:8888 http://api.example.com/api/users
```

### Example 3: Remove Tracking and Privacy-Sensitive Headers

Strip headers that leak information about your development environment or contain tracking data.

```json
{
  "name": "Remove Tracking Headers",
  "enabled": true,
  "priority": 2,
  "matchPattern": {
    "url": "*"
  },
  "action": "modifyRequest",
  "config": {
    "removeHeaders": [
      "X-Forwarded-For",
      "X-Real-IP",
      "X-Request-ID",
      "X-Correlation-ID",
      "DNT",
      "Sec-CH-UA",
      "Sec-CH-UA-Mobile",
      "Sec-CH-UA-Platform"
    ]
  }
}
```

::: warning
Removing some headers (like `X-Forwarded-For` or `X-Real-IP`) may cause issues with servers that rely on them for rate limiting, geolocation, or access control. Test thoroughly before applying broad header removal rules.
:::

### Example 4: Modify Request Payload

Replace the request body to inject test data or alter the payload for a specific endpoint.

```json
{
  "name": "Override User Creation Payload",
  "enabled": true,
  "priority": 1,
  "matchPattern": {
    "url": "*/api/users",
    "method": "POST"
  },
  "action": "modifyRequest",
  "config": {
    "setHeaders": {
      "Content-Type": "application/json"
    },
    "replaceBody": "{\"name\":\"Test User\",\"email\":\"test@example.com\",\"role\":\"admin\",\"permissions\":[\"read\",\"write\",\"delete\"]}"
  }
}
```

```bash
# Whatever body you send gets replaced with the configured payload
curl -x http://localhost:8888 \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"name": "ignored"}' \
  http://api.example.com/api/users
```

### Example 5: Clean Up Query Parameters

Remove unnecessary or debug query parameters before requests reach the production API.

```json
{
  "name": "Remove Debug Query Params",
  "enabled": true,
  "priority": 10,
  "matchPattern": {
    "url": "*/api/*"
  },
  "action": "modifyRequest",
  "config": {
    "removeQueryParams": [
      "debug",
      "verbose",
      "trace",
      "_timestamp",
      "cache_bust"
    ],
    "setQueryParams": {
      "source": "nectoproxy"
    }
  }
}
```

This rule removes debug-related query parameters while adding a `source` parameter so the server can identify traffic that came through the proxy.

## Use Cases

### Adding Authentication Headers

During development, managing authentication tokens across multiple tools and browser contexts is tedious. A Modify Request rule can inject the correct `Authorization` header into every API request automatically, eliminating the need to configure tokens in each tool or application.

### Changing API Versions

When migrating between API versions, use Modify Request rules to force all requests to target the new version. This lets you test the migration without modifying your application code.

### Modifying Request Payloads

Override request bodies to test how the server handles specific input. This is useful for:
- Testing validation edge cases
- Sending payloads with specific data shapes
- Replacing user-generated content with controlled test data

### Removing Tracking Headers

Strip privacy-sensitive headers during testing and development to prevent your development traffic from contaminating production analytics.

### A/B Testing and Feature Flags

Add custom headers that your backend uses for feature flag evaluation:

```json
{
  "config": {
    "setHeaders": {
      "X-Feature-Flags": "new-checkout,dark-mode,v2-search",
      "X-AB-Test-Group": "treatment-b"
    }
  }
}
```

## Combining Set and Remove Operations

You can use `setHeaders` and `removeHeaders` together in the same rule. Removals are applied first, followed by additions. This allows you to replace a header by removing it and setting a new value in a single rule.

```json
{
  "config": {
    "removeHeaders": ["Authorization"],
    "setHeaders": {
      "Authorization": "Bearer new-token-value"
    }
  }
}
```

::: details Order of Operations
When a Modify Request rule is applied, the modifications happen in this order:

1. **removeHeaders** -- specified headers are removed from the request
2. **setHeaders** -- specified headers are added or overwritten
3. **removeQueryParams** -- specified query parameters are removed from the URL
4. **setQueryParams** -- specified query parameters are added or overwritten
5. **replaceBody** -- the entire request body is replaced (if specified)

This order ensures that you can remove and set the same header or query parameter in one rule without conflicts.
:::
