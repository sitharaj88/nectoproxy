---
title: Block Action
description: Reject requests entirely using NectoProxy block rules. Prevent unwanted traffic from reaching upstream servers.
---

# Block Action

The **Block** action rejects a matched request outright, preventing it from being forwarded to the upstream server. By default, the client receives a `403 Forbidden` response.

Blocking is the simplest and most definitive rule action. When a request matches a block rule, NectoProxy immediately terminates the request and returns an error response to the client. No data is sent to the target server.

## How It Works

1. A request arrives at the proxy and matches a rule with the `block` action.
2. NectoProxy does **not** forward the request to the target server.
3. A `403 Forbidden` response is returned to the client immediately.

```
Client ──► NectoProxy ──✕ (request blocked)
                │
                └──► Returns 403 Forbidden
```

::: tip
Blocked requests still appear in the NectoProxy traffic log, marked with a distinctive blocked indicator. This lets you confirm that unwanted requests are being caught by your rules.
:::

## Configuration Options

The Block action requires minimal configuration. In many cases, no `config` object is needed at all.

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `status` | number | No | `403` | HTTP status code to return |
| `body` | string | No | `"Blocked by NectoProxy"` | Response body to return |

## Practical Examples

### Example 1: Block Tracking and Analytics Requests

Prevent analytics and tracking scripts from sending data while you are developing or testing.

```json
{
  "name": "Block Analytics",
  "enabled": true,
  "priority": 1,
  "matchPattern": {
    "url": "*google-analytics.com*"
  },
  "action": "block",
  "config": {}
}
```

You can create multiple block rules for different trackers:

```json
{
  "name": "Block Facebook Pixel",
  "enabled": true,
  "priority": 1,
  "matchPattern": {
    "url": "*connect.facebook.net*"
  },
  "action": "block",
  "config": {}
}
```

```json
{
  "name": "Block Mixpanel",
  "enabled": true,
  "priority": 1,
  "matchPattern": {
    "url": "*api.mixpanel.com*"
  },
  "action": "block",
  "config": {}
}
```

Test with curl:

```bash
curl -x http://localhost:8888 -v https://www.google-analytics.com/collect?v=1
```

Expected: `403 Forbidden` response instead of the analytics pixel.

### Example 2: Block Specific API Calls During Testing

When testing a feature, you may want to prevent certain API calls from succeeding to verify that your application handles the failure gracefully.

```json
{
  "name": "Block Notifications API",
  "enabled": true,
  "priority": 2,
  "matchPattern": {
    "url": "*/api/notifications*",
    "method": "POST"
  },
  "action": "block",
  "config": {
    "status": 403,
    "body": "{\"error\": \"forbidden\", \"message\": \"Notifications are disabled during testing\"}"
  }
}
```

```bash
curl -x http://localhost:8888 \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"title": "Test", "message": "Hello"}' \
  http://api.example.com/api/notifications
```

### Example 3: Block Ad Domains

Block requests to known advertising networks to create a cleaner development experience without distracting ad content.

```json
{
  "name": "Block Ad Networks",
  "enabled": true,
  "priority": 1,
  "matchPattern": {
    "host": "*.doubleclick.net"
  },
  "action": "block",
  "config": {}
}
```

### Example 4: Block External Resource Loading

Prevent your application from loading external resources during local development, forcing it to use only local assets.

```json
{
  "name": "Block External CDN",
  "enabled": true,
  "priority": 3,
  "matchPattern": {
    "url": "*cdn.jsdelivr.net*"
  },
  "action": "block",
  "config": {
    "status": 404,
    "body": "CDN resource blocked by NectoProxy for local development"
  }
}
```

::: warning
When blocking CDN resources, make sure your application has local fallbacks for the blocked assets. Otherwise, your UI may break in unexpected ways.
:::

### Example 5: Simulate Offline Behavior for a Specific API

Test how your application behaves when a specific microservice is unreachable.

```json
{
  "name": "Simulate Payment Service Outage",
  "enabled": true,
  "priority": 1,
  "matchPattern": {
    "host": "payments.internal.example.com"
  },
  "action": "block",
  "config": {
    "status": 503,
    "body": "{\"error\": \"service_unavailable\", \"message\": \"Payment service is currently unavailable\"}"
  }
}
```

::: danger
Before enabling block rules that target broad patterns (e.g., `*api*`), review the match pattern carefully. Overly broad block rules can silently prevent legitimate requests from reaching the server, leading to confusing debugging sessions.
:::

## Use Cases

### Blocking Ads and Trackers

During development and testing, third-party tracking scripts can:
- Slow down page loads
- Send development data to production analytics
- Interfere with network debugging by cluttering the traffic log

Block rules eliminate these distractions without requiring browser extensions or hosts file modifications.

### Testing Offline Behavior for Specific APIs

Instead of disconnecting your entire network, use block rules to selectively make individual services "unavailable." This allows you to test partial failure scenarios:

- What happens when the authentication service is down?
- How does the UI respond when the image CDN is unreachable?
- Does the checkout flow degrade gracefully when the inventory API is offline?

### Preventing Specific API Calls During Testing

Block rules are useful when you want to ensure that a particular API endpoint is **never** called during a test scenario. For example:

- Block `DELETE` endpoints during read-only testing
- Block payment processing endpoints during UI testing
- Block email-sending endpoints to prevent test emails

### Security Testing

Block rules can simulate security restrictions to verify that your application handles access denials correctly:

- Block API endpoints to test `403 Forbidden` handling
- Verify that retry logic does not overwhelm blocked endpoints
- Test fallback behavior when specific resources are denied

## Block vs. Mock

Both Block and [Mock](./mock) prevent the request from reaching the server. The key difference is intent and response content:

| Aspect | Block | Mock |
|--------|-------|------|
| **Intent** | Reject the request | Simulate a successful (or error) response |
| **Default status** | `403 Forbidden` | `200 OK` |
| **Response body** | Minimal or none | Fully customizable |
| **Use case** | Prevent traffic | Provide test data |

If you need to return a realistic response body, use Mock. If you simply want to stop the request, use Block.

::: details When to Use Custom Status Codes with Block
While the default `403 Forbidden` is appropriate for most blocking scenarios, there are cases where a different status code communicates intent more clearly:

- **404 Not Found** -- Pretend the resource does not exist
- **503 Service Unavailable** -- Simulate a service outage
- **451 Unavailable for Legal Reasons** -- Testing geo-restriction handling
- **408 Request Timeout** -- Simulate a connection timeout (pair with Mock + delay for more realism)
:::
