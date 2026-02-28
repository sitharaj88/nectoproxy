---
title: Rules Engine
description: Intercept and transform HTTP traffic with NectoProxy's powerful rules engine.
---

# Rules Engine

The Rules Engine is NectoProxy's system for automatically intercepting and transforming HTTP traffic based on conditions you define. Rules let you mock responses, block requests, modify headers, simulate latency, and much more -- all without changing a single line of application code.

## Overview

A rule consists of two parts:

1. **Matching conditions** -- Determine which requests the rule applies to
2. **Action** -- What happens when a matching request is intercepted

When a request passes through NectoProxy, it is evaluated against all enabled rules in priority order. The first matching rule's action is applied. If no rules match, the request proceeds normally to the target server.

## Rule Actions

NectoProxy supports 8 distinct rule actions. Each action is designed for a specific debugging or testing scenario.

### Mock Response

Return a custom response without forwarding the request to the server. You define the status code, headers, and body.

**Use cases:**
- Test UI behavior against specific API responses before the backend is ready
- Simulate error responses (500, 503, 429) to verify error handling
- Provide deterministic responses for automated testing

::: tip
Mock responses are served directly by NectoProxy, so they are extremely fast -- typically under 1ms. This makes them ideal for development workflows where you need to iterate quickly on UI code.
:::

### Block Request

Reject the request entirely. The client receives a connection reset or a configurable error response.

**Use cases:**
- Block analytics and tracking scripts during development
- Prevent specific API calls from reaching the server
- Simulate network-level failures

### Modify Request

Alter the outgoing request before it reaches the server. You can modify headers, query parameters, or the request body.

**Use cases:**
- Inject authentication headers for testing
- Modify API request payloads to test edge cases
- Override `User-Agent` or `Accept-Language` headers

### Modify Response

Alter the response received from the server before it reaches the client. You can modify response headers, status codes, or the body.

**Use cases:**
- Inject CORS headers to bypass cross-origin restrictions during development
- Modify API response payloads to test UI edge cases
- Override caching headers

### Map Local

Serve a response from a local file instead of forwarding the request to the server. Point the rule to a file on your filesystem, and its contents are returned as the response body.

**Use cases:**
- Replace a remote JavaScript bundle with a local development build
- Serve modified CSS for quick visual debugging
- Return a local JSON file as an API response

### Map Remote

Redirect the request to a different URL. The request is forwarded to the mapped URL instead of the original destination.

**Use cases:**
- Redirect API calls from production to a staging server
- Test against a different backend version without changing client configuration
- Route specific paths to a local development server

### Delay

Add a fixed delay (in milliseconds) before forwarding the request. The request is held for the specified duration and then sent to the server normally.

**Use cases:**
- Test loading states and skeleton screens in the UI
- Verify timeout handling in client code
- Simulate slow API responses for performance testing

### Throttle

Limit the bandwidth for matching requests. You specify a maximum throughput in kilobytes per second.

**Use cases:**
- Simulate slow file downloads
- Test progressive image loading behavior
- Verify chunked response handling in the client

---

## Matching Conditions

Rules are triggered based on matching conditions. You can combine multiple conditions for precise targeting.

### URL Pattern Matching

URL patterns determine which requests a rule applies to. NectoProxy supports three pattern syntaxes:

#### Glob Patterns

Use `*` to match any sequence of characters within a path segment, and `**` to match across path segments.

```
https://api.example.com/v1/users/*
https://cdn.example.com/assets/**/*.js
*://example.com/api/*
```

#### Wildcard Patterns

A simplified syntax where `*` matches any sequence of characters.

```
*example.com*
*api/v2*
*.js
```

#### Regular Expressions

For advanced matching, use full regular expressions. Prefix the pattern with `regex:` to enable regex mode.

```
regex:https?://api\\.example\\.com/v[12]/users/\\d+
regex:.*\\.(jpg|png|gif|webp)$
regex:https://.*\\.example\\.com/api/.*
```

::: warning
Regular expressions are powerful but can impact performance if overly complex. Use simpler glob or wildcard patterns when they are sufficient for your needs.
:::

### Method Matching

Restrict a rule to specific HTTP methods. You can select one or more methods:

- `GET`
- `POST`
- `PUT`
- `DELETE`
- `PATCH`
- `HEAD`
- `OPTIONS`

If no method is specified, the rule matches all methods.

### Header Matching

Match requests based on the presence or value of specific headers. Examples:

| Header | Operator | Value | Matches |
|---|---|---|---|
| `Content-Type` | equals | `application/json` | Only JSON requests |
| `Authorization` | exists | -- | Any request with an auth header |
| `X-Custom-Header` | contains | `debug` | Requests with debug in custom header |

### Body Content Matching

Match requests based on their body content. This is useful for targeting specific API calls that share the same URL but differ in payload.

```json
{
  "action": "createUser"
}
```

Body matching supports partial string matching -- the rule triggers if the request body contains the specified string.

---

## Rule Priority

When multiple rules could match a request, NectoProxy uses the **priority** value to determine which rule takes effect. The rule with the **lowest priority number** wins.

| Priority | Rule Name | Action |
|---|---|---|
| 1 | Block Analytics | Block |
| 2 | Mock User API | Mock |
| 3 | Add CORS Headers | Modify Response |
| 10 | Slow API | Delay |

In this example, if a request matches both "Block Analytics" and "Mock User API," the Block rule is applied because it has a lower priority number (1 < 2).

::: tip Managing Priorities
You can reorder rules using **drag-and-drop** in the Web UI. Dragging a rule above or below other rules automatically updates the priority values. This is the easiest way to adjust rule evaluation order.
:::

## Enabling and Disabling Rules

Each rule has an **enable/disable toggle** in the UI. Disabled rules are not evaluated during request processing, but their configuration is preserved. This lets you keep rules configured for occasional use without them affecting normal traffic.

::: details Bulk Operations
You can enable or disable multiple rules at once by selecting them in the rules list and using the bulk action buttons. This is useful when switching between different testing scenarios that require different rule sets.
:::

## Organizing Rules

### Drag-and-Drop Reordering

The rules list supports drag-and-drop reordering. Grab a rule by its handle and drag it to a new position. The priority values are automatically recalculated based on the new order. This visual approach to priority management is more intuitive than manually editing priority numbers.

---

## Rule Configuration Examples

### Example 1: Mock a REST API Endpoint

```
URL Pattern:   https://api.example.com/v1/users/123
Method:        GET
Action:        Mock Response
Status Code:   200
Headers:       Content-Type: application/json
Body:
{
  "id": 123,
  "name": "Jane Doe",
  "email": "jane@example.com",
  "role": "admin"
}
```

### Example 2: Block Third-Party Scripts

```
URL Pattern:   *://analytics.tracking.com/**
Method:        (any)
Action:        Block
```

### Example 3: Add CORS Headers to API Responses

```
URL Pattern:   https://api.example.com/**
Method:        (any)
Action:        Modify Response
Add Headers:
  Access-Control-Allow-Origin: http://localhost:3000
  Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
  Access-Control-Allow-Headers: Content-Type, Authorization
```

### Example 4: Simulate Slow API

```
URL Pattern:   https://api.example.com/v1/search*
Method:        (any)
Action:        Delay
Delay:         3000ms
```

---

## Detailed Rule Documentation

For in-depth documentation on each rule action type, see the individual rule pages:

- [Mock Response](/rules/mock)
- [Block Request](/rules/block)
- [Modify Request](/rules/modify-request)
- [Modify Response](/rules/modify-response)
- [Map Local](/rules/map-local)
- [Map Remote](/rules/map-remote)
- [Delay](/rules/delay)
- [Throttle](/rules/throttle)

::: info
Rules are persisted across NectoProxy sessions. Any rules you create are saved and automatically loaded the next time you start the proxy.
:::
