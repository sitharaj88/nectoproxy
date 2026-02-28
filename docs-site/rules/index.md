---
title: Rules Overview
description: Learn how NectoProxy rules let you intercept, match, and modify HTTP/HTTPS traffic automatically using a powerful pattern-based engine.
---

# Rules Overview

Rules are the core automation engine in NectoProxy. They allow you to intercept HTTP and HTTPS traffic and automatically apply modifications, redirects, mocks, blocks, delays, and more -- all without writing a single line of code.

Instead of manually inspecting every request and response, you define rules that describe **what to match** and **what to do**. NectoProxy evaluates every proxied request against your active rules and applies the appropriate action when a match is found.

## What Are Rules?

A rule is a declarative instruction that tells NectoProxy:

1. **When** a request matches certain criteria (URL pattern, method, host, headers, etc.)
2. **Then** perform a specific action (mock a response, block the request, modify headers, add delay, etc.)

Rules run automatically in the background. Once configured, they apply consistently to every matching request without manual intervention.

::: tip
Rules are persistent across proxy sessions. Once you create a rule, it remains active until you disable or delete it.
:::

## Rule Anatomy

Every rule in NectoProxy consists of the following properties:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | Yes | A human-readable label for the rule |
| `enabled` | boolean | Yes | Whether the rule is currently active |
| `priority` | number | Yes | Evaluation order (lower number = higher priority) |
| `matchPattern` | object | Yes | Criteria that determine which requests this rule applies to |
| `action` | string | Yes | The type of action to perform (`mock`, `block`, `modifyRequest`, `modifyResponse`, `mapLocal`, `mapRemote`, `delay`, `throttle`) |
| `config` | object | Yes | Action-specific configuration |

Here is a complete rule example in JSON:

```json
{
  "name": "Mock User API",
  "enabled": true,
  "priority": 1,
  "matchPattern": {
    "url": "*/api/users*",
    "method": "GET"
  },
  "action": "mock",
  "config": {
    "status": 200,
    "headers": {
      "Content-Type": "application/json"
    },
    "body": "{\"users\": [{\"id\": 1, \"name\": \"Alice\"}]}"
  }
}
```

## Match Patterns

Match patterns determine which requests a rule applies to. NectoProxy supports several matching dimensions, and you can combine them for precise targeting.

### URL Matching

URL matching is the most common way to target requests. NectoProxy supports three URL matching modes:

#### Glob Patterns

Glob patterns use `*` as a wildcard that matches any sequence of characters.

```
*/api/*            # Matches any URL containing /api/
*/api/users*       # Matches URLs with /api/users in the path
*example.com*      # Matches any URL containing example.com
```

#### Simple Wildcard

A single `*` matches all URLs. This is useful when you want a rule to apply globally or when you are matching on other dimensions (method, host, headers).

```
*                  # Matches every URL
```

#### Regular Expressions

For advanced matching, use regex patterns enclosed in forward slashes.

```
/api\/v\d+/        # Matches /api/v1, /api/v2, /api/v34, etc.
/users\/\d+$/      # Matches /users/123, /users/456, etc.
/\.(jpg|png|gif)/  # Matches image file extensions
```

::: warning
Regular expressions are more powerful but also more expensive to evaluate. For simple pattern matching, prefer glob patterns.
:::

### Method Matching

Restrict rules to specific HTTP methods. If omitted, the rule matches all methods.

| Method | Description |
|--------|-------------|
| `GET` | Read requests |
| `POST` | Create requests |
| `PUT` | Full update requests |
| `PATCH` | Partial update requests |
| `DELETE` | Delete requests |
| `HEAD` | Header-only requests |
| `OPTIONS` | Preflight / CORS requests |

You can specify a single method or leave it unset to match all methods:

```json
{
  "matchPattern": {
    "url": "*/api/users*",
    "method": "POST"
  }
}
```

### Host Matching

Target requests by their hostname. Supports exact matches and wildcard patterns.

#### Exact Host Match

```json
{
  "matchPattern": {
    "host": "api.example.com"
  }
}
```

#### Wildcard Host Pattern

```json
{
  "matchPattern": {
    "host": "*.example.com"
  }
}
```

This matches `api.example.com`, `staging.example.com`, `cdn.example.com`, and any other subdomain of `example.com`.

### Path Matching

Match on the URL path component only (excluding the host and query string). Supports both glob and regex patterns.

```json
{
  "matchPattern": {
    "path": "/api/v2/users/*"
  }
}
```

```json
{
  "matchPattern": {
    "path": "/\\/api\\/v[0-9]+\\/users/"
  }
}
```

### Header Matching

Match requests that contain specific header values. This is useful for targeting requests with particular authentication tokens, content types, or custom headers.

```json
{
  "matchPattern": {
    "url": "*",
    "headers": {
      "Content-Type": "application/json",
      "X-Custom-Header": "specific-value"
    }
  }
}
```

::: tip
Header matching is case-insensitive for header names, following the HTTP specification.
:::

### Body Content Matching

Match requests whose body contains a specific string. This is useful for targeting requests with particular payloads.

```json
{
  "matchPattern": {
    "url": "*/api/graphql*",
    "bodyContains": "mutation CreateUser"
  }
}
```

::: warning
Body content matching requires the proxy to buffer and inspect the entire request body, which may have a minor performance impact on large payloads.
:::

### Combining Match Criteria

All match criteria are combined with logical AND. A request must satisfy **every** specified criterion to match the rule.

```json
{
  "matchPattern": {
    "url": "*/api/*",
    "method": "POST",
    "host": "api.example.com",
    "headers": {
      "Content-Type": "application/json"
    }
  }
}
```

This rule only matches `POST` requests to `api.example.com` whose URL contains `/api/` and whose `Content-Type` header is `application/json`.

## Rule Priority

Rules are evaluated in priority order. The `priority` field is a numeric value where **lower numbers indicate higher priority**.

| Priority | Evaluated |
|----------|-----------|
| `1` | First |
| `2` | Second |
| `5` | Fifth |
| `100` | Last (among these) |

When multiple rules could match the same request, NectoProxy evaluates them in priority order. The **first rule that handles the request wins**, and no further rules are evaluated for that request.

::: details How Priority Resolution Works
1. All enabled rules are sorted by their `priority` field (ascending).
2. For each incoming request, NectoProxy iterates through the sorted rules.
3. The first rule whose match pattern satisfies the request is applied.
4. Once a rule handles the request, evaluation stops immediately.
5. If no rule matches, the request passes through to the target server unmodified.
:::

```json
[
  {
    "name": "Block tracking pixels",
    "priority": 1,
    "matchPattern": { "url": "*/tracking/*" },
    "action": "block"
  },
  {
    "name": "Delay all API calls",
    "priority": 10,
    "matchPattern": { "url": "*/api/*" },
    "action": "delay",
    "config": { "delay": 500 }
  },
  {
    "name": "Mock fallback",
    "priority": 100,
    "matchPattern": { "url": "*" },
    "action": "mock",
    "config": { "status": 503, "body": "Service Unavailable" }
  }
]
```

In the example above, a request to `https://example.com/tracking/pixel.gif` would be blocked (priority 1), not delayed or mocked.

::: danger
Be careful with low-priority catch-all rules (e.g., `"url": "*"` at priority 100). They will match every request that no higher-priority rule has already handled. This can cause unexpected behavior if you forget they exist.
:::

## Managing Rules in the Web UI

### Creating Rules

1. Open the NectoProxy Web UI at `http://localhost:8889`.
2. Navigate to the **Rules** tab.
3. Click the **Add Rule** button.
4. Fill in the rule name, match pattern, action type, and action-specific configuration.
5. Click **Save** to create the rule.

The new rule is immediately active (enabled by default) and begins matching incoming traffic.

### Enabling and Disabling Rules

Each rule has a toggle switch in the Rules list. Click the toggle to enable or disable a rule without deleting it. Disabled rules are preserved with their full configuration and can be re-enabled at any time.

::: tip
Disabling a rule is a great way to temporarily stop it from matching without losing your configuration. This is especially useful during debugging sessions when you want to isolate the effect of a specific rule.
:::

### Drag-and-Drop Reordering

You can reorder rules by dragging and dropping them in the Rules list. The visual order directly corresponds to the priority order -- rules at the top of the list are evaluated first.

When you reorder rules via drag-and-drop, NectoProxy automatically recalculates the `priority` values to reflect the new order.

### Editing and Deleting Rules

- Click on a rule in the list to open its configuration panel and make edits.
- Use the delete button (trash icon) to permanently remove a rule.

## Available Rule Actions

NectoProxy provides eight rule actions, each designed for a specific traffic manipulation scenario:

| Action | Description | Documentation |
|--------|-------------|---------------|
| **Mock** | Return a custom response without contacting the server | [Mock Action](./mock) |
| **Block** | Reject the request entirely | [Block Action](./block) |
| **Modify Request** | Alter the request before it reaches the server | [Modify Request](./modify-request) |
| **Modify Response** | Alter the response before it reaches the client | [Modify Response](./modify-response) |
| **Map Local** | Serve a file from the local filesystem | [Map Local](./map-local) |
| **Map Remote** | Redirect the request to a different URL | [Map Remote](./map-remote) |
| **Delay** | Add artificial latency before forwarding | [Delay](./delay) |
| **Throttle** | Limit bandwidth for the matched request | [Throttle](./throttle) |

## Testing Your Rules

You can verify that your rules work correctly using `curl` through the proxy:

```bash
# Send a GET request through the proxy
curl -x http://localhost:8888 http://api.example.com/users

# Send a POST request through the proxy
curl -x http://localhost:8888 \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice"}' \
  http://api.example.com/users

# HTTPS request through the proxy (use -k to skip cert verification)
curl -x http://localhost:8888 -k https://api.example.com/users
```

Check the NectoProxy Web UI to see whether your rule matched the request and what action was applied.

## Best Practices

1. **Use descriptive rule names.** A name like "Mock user list for dashboard testing" is far more useful than "Rule 1".
2. **Start with specific patterns.** Narrow match patterns reduce the risk of unintended matches.
3. **Use priority deliberately.** Keep blocking rules at low priority numbers (high priority) so they run first.
4. **Disable rules you are not using.** This keeps the evaluation fast and avoids confusion.
5. **Test with curl.** Verify each rule with a quick `curl` command before relying on it in your development workflow.
