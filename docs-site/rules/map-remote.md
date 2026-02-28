---
title: Map Remote Action
description: Redirect HTTP requests to a different URL. Point traffic to staging servers, switch API versions, and reroute microservice calls.
---

# Map Remote Action

The **Map Remote** action intercepts a matched request and redirects it to a completely different URL. Instead of forwarding the request to the original target server, NectoProxy sends it to the URL you specify. The response from the new target is then returned to the client.

This is the network-level equivalent of changing a DNS entry or updating a base URL in your application configuration -- but without modifying any code or infrastructure.

## How It Works

1. A request arrives at the proxy and matches a rule with the `mapRemote` action.
2. NectoProxy rewrites the request URL to the configured `targetUrl`.
3. The request is forwarded to the **new** target server.
4. The response from the new target is returned to the client as if it came from the original server.

```
Client ──► NectoProxy ──► New Target Server (instead of original)
                                  │
Client ◄──────────────────────◄──┘
```

The client is unaware that the request was rerouted. It believes it is communicating with the original server.

::: tip
Map Remote is transparent to the client. The client's request URL, `Host` header, and cookies remain unchanged from its perspective. Only NectoProxy knows that the traffic was rerouted.
:::

## Configuration Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `targetUrl` | string | Yes | -- | The new base URL to redirect requests to |
| `preservePath` | boolean | No | `true` | Append the original request path to the target URL |
| `preserveQuery` | boolean | No | `true` | Append the original query string to the target URL |

### URL Rewriting Behavior

The `preservePath` and `preserveQuery` options control how the original request URL components are handled:

**With `preservePath: true` (default):**
- Original: `https://api.example.com/v1/users/123?fields=name`
- Target URL: `https://staging.example.com`
- Result: `https://staging.example.com/v1/users/123?fields=name`

**With `preservePath: false`:**
- Original: `https://api.example.com/v1/users/123?fields=name`
- Target URL: `https://staging.example.com/v2/accounts`
- Result: `https://staging.example.com/v2/accounts?fields=name`

**With `preserveQuery: false`:**
- Original: `https://api.example.com/v1/users?page=2&limit=10`
- Target URL: `https://staging.example.com`
- Result: `https://staging.example.com/v1/users`

## Practical Examples

### Example 1: Point API Traffic to a Staging Server

Redirect all API requests from production to your staging environment.

```json
{
  "name": "Redirect API to Staging",
  "enabled": true,
  "priority": 5,
  "matchPattern": {
    "url": "*/api/*",
    "host": "api.example.com"
  },
  "action": "mapRemote",
  "config": {
    "targetUrl": "https://staging-api.example.com",
    "preservePath": true,
    "preserveQuery": true
  }
}
```

With this rule:
- `https://api.example.com/api/v1/users` becomes `https://staging-api.example.com/api/v1/users`
- `https://api.example.com/api/v1/orders?status=pending` becomes `https://staging-api.example.com/api/v1/orders?status=pending`

Test it:

```bash
curl -x http://localhost:8888 -k https://api.example.com/api/v1/users
# Request is forwarded to https://staging-api.example.com/api/v1/users
```

### Example 2: Switch API Versions

Redirect requests from one API version to another without changing your client code.

```json
{
  "name": "Redirect v1 to v2 API",
  "enabled": true,
  "priority": 3,
  "matchPattern": {
    "url": "*/api/v1/*"
  },
  "action": "mapRemote",
  "config": {
    "targetUrl": "https://api.example.com/api/v2",
    "preservePath": false,
    "preserveQuery": true
  }
}
```

::: warning
When redirecting between API versions with `preservePath: false`, the path from the `targetUrl` replaces the original path entirely. Make sure the target URL includes the correct path prefix.
:::

### Example 3: Route to a Local Development Server

Redirect production API calls to your locally running development server.

```json
{
  "name": "Map API to Local Dev Server",
  "enabled": true,
  "priority": 1,
  "matchPattern": {
    "host": "api.example.com"
  },
  "action": "mapRemote",
  "config": {
    "targetUrl": "http://localhost:3001",
    "preservePath": true,
    "preserveQuery": true
  }
}
```

This lets you browse the production website normally while all API calls are routed to your local server. The frontend loads from the real production servers, but data comes from your local backend.

```bash
curl -x http://localhost:8888 http://api.example.com/api/users
# Forwarded to http://localhost:3001/api/users
```

::: tip
This is an extremely productive development pattern. You can run the production frontend and replace only the specific microservice you are working on with your local instance.
:::

### Example 4: Microservice Routing

In a microservices architecture, redirect traffic for a specific service to a different instance for testing.

```json
{
  "name": "Reroute Auth Service",
  "enabled": true,
  "priority": 2,
  "matchPattern": {
    "host": "auth.internal.example.com"
  },
  "action": "mapRemote",
  "config": {
    "targetUrl": "https://auth-canary.internal.example.com",
    "preservePath": true,
    "preserveQuery": true
  }
}
```

### Example 5: Load Balancing Testing

Test how your application behaves when requests are sent to a specific server instance instead of going through the load balancer.

```json
{
  "name": "Pin to Server Instance 3",
  "enabled": true,
  "priority": 1,
  "matchPattern": {
    "host": "api.example.com"
  },
  "action": "mapRemote",
  "config": {
    "targetUrl": "https://api-server-03.internal.example.com",
    "preservePath": true,
    "preserveQuery": true
  }
}
```

This bypasses the load balancer and sends all traffic to a specific server instance, which is useful for reproducing bugs that only occur on specific nodes.

::: danger
When using Map Remote to redirect to internal servers, be aware of TLS certificate mismatches. The internal server's certificate may not match the original hostname. NectoProxy handles the upstream TLS connection, so this usually works, but verify that the internal server accepts the connection.
:::

## Use Cases

### Pointing to Staging Environments

The most common use case for Map Remote. Redirect production API calls to staging to test new backend features with the production frontend.

### API Version Switching

Test your application against a new API version without modifying configuration files or environment variables. Switch back by disabling the rule.

### Local Development with Production Frontend

Run a production or staging frontend in your browser while routing specific API calls to your local server. This gives you the best of both worlds -- a realistic frontend environment with a locally debuggable backend.

### Microservice Routing

In a microservices architecture, redirect traffic for specific services to different instances. This is useful for:
- Testing a new version of a single service
- Debugging an issue on a specific server instance
- Routing to a canary deployment

### Load Balancing Testing

Bypass load balancers to send all traffic to a specific server instance. This helps reproduce issues that are tied to a particular node and verifies that individual instances handle traffic correctly.

::: details Map Remote vs. Map Local
Both Map Remote and [Map Local](./map-local) redirect requests away from the original target, but in different directions:

| Aspect | Map Remote | Map Local |
|--------|-----------|-----------|
| **Response source** | A different remote server | A file on the local filesystem |
| **Network required** | Yes (to reach the new target) | No |
| **Use case** | Swap servers/environments | Swap with local files |
| **Dynamic responses** | Yes (real server responses) | No (static files) |
| **Path preservation** | Configurable | Directory-based |

Use **Map Remote** when you want to redirect to another running server. Use **Map Local** when you want to serve responses from files on disk.
:::
