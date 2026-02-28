---
title: Breakpoints
description: Pause and modify HTTP traffic in real time with NectoProxy breakpoints.
---

# Breakpoints

Breakpoints let you **pause HTTP traffic mid-flight** so you can inspect and modify requests or responses before they continue to their destination. Think of them as debugger breakpoints, but for network traffic instead of code execution.

When a breakpoint is triggered, the intercepted message is displayed in the NectoProxy UI where you can edit headers, body content, status codes, and more. Once you are satisfied with your changes, you resume the request and it continues on its way.

## Breakpoint Types

NectoProxy supports three breakpoint modes:

### Request Breakpoints

Pause **outgoing requests** before they are sent to the server. When triggered, you can inspect and modify:

- Request URL and path
- HTTP method
- Request headers
- Request body

This is useful when you want to alter what the server receives without modifying your application code.

### Response Breakpoints

Pause **incoming responses** before they are delivered to the client. When triggered, you can inspect and modify:

- HTTP status code and reason phrase
- Response headers
- Response body

This is useful when you want to test how your application handles specific server responses.

### Both (Request + Response)

Pause the traffic **twice** -- once when the request is about to be sent to the server, and again when the response comes back. This gives you full control over both directions of the communication.

::: tip
Use "Both" mode sparingly, as it requires two manual interactions per request. In most debugging scenarios, pausing only the request or only the response is sufficient.
:::

## Breakpoint Conditions

Breakpoints can be configured with conditions that determine which traffic triggers the pause. Without conditions, a breakpoint will pause **all** traffic, which is rarely what you want.

### URL Pattern

Match requests by their URL using the same pattern syntax as the [Rules Engine](./rules-engine):

```
https://api.example.com/v1/users/*
*api/checkout*
regex:.*\\.example\\.com/api/v[23]/.*
```

### Method Filter

Restrict the breakpoint to specific HTTP methods:

- `GET` -- Only pause GET requests
- `POST` -- Only pause POST requests
- `PUT`, `DELETE`, `PATCH`, `HEAD`, `OPTIONS`

You can select multiple methods. If no method is specified, the breakpoint matches all methods.

### Header Conditions

Trigger breakpoints based on request header values:

| Header | Condition | Value |
|---|---|---|
| `Content-Type` | equals | `application/json` |
| `Authorization` | contains | `Bearer` |
| `X-Debug` | exists | -- |

## Condition Logic

When multiple conditions are configured on a single breakpoint, you can choose how they are combined:

### AND Logic (All conditions must match)

```
URL contains:     /api/users
Method equals:    POST
Header exists:    Authorization
```

With AND logic, the breakpoint only triggers when the request matches **all three** conditions -- it must be a POST request to a URL containing `/api/users` that includes an Authorization header.

### OR Logic (Any condition can match)

```
URL contains:     /api/checkout
URL contains:     /api/payment
```

With OR logic, the breakpoint triggers when **any one** of the conditions matches -- it pauses requests to either the checkout or payment endpoint.

::: details Combining AND and OR
For more complex scenarios, you can create multiple breakpoints with different condition logic. For example, create one breakpoint with AND conditions for a specific scenario and another with OR conditions for a broader catch. Breakpoints are evaluated independently.
:::

## What Happens When a Breakpoint Triggers

When a matching request or response hits a breakpoint, the following occurs:

1. **Traffic is paused** -- The request or response is held in memory and does not proceed.
2. **UI notification** -- NectoProxy displays a prominent notification indicating that traffic has been intercepted.
3. **Intercept panel opens** -- The intercepted message is shown in an editable panel with the full request or response details.
4. **You make changes** -- Edit any part of the intercepted message (headers, body, URL, status code, etc.).
5. **You take action** -- Either resume or drop the intercepted message.

### Editing Intercepted Traffic

The intercept panel provides a full editor for the paused message:

**For intercepted requests:**
```
Method:  [POST          v]
URL:     [https://api.example.com/v1/users]

Headers:
  Content-Type:   application/json
  Authorization:  Bearer eyJhbGciOi...
  X-Custom:       my-value

Body:
{
  "name": "Jane Doe",
  "email": "jane@example.com"
}
```

**For intercepted responses:**
```
Status:  [200] [OK]

Headers:
  Content-Type:     application/json
  Cache-Control:    no-cache
  X-Request-Id:     abc-123

Body:
{
  "id": 456,
  "name": "Jane Doe",
  "created": true
}
```

You can freely edit any field. The modified version is what gets forwarded to its destination.

## Actions

When traffic is paused at a breakpoint, you have two choices:

### Resume

Forward the (potentially modified) message to its destination. The request continues to the server, or the response continues to the client, with whatever changes you have made.

### Drop

Discard the intercepted message entirely. For a paused request, the client receives a connection error. For a paused response, the client receives no response (effectively a timeout from the client's perspective).

::: warning
Dropping a request or response will cause the client to experience an error. Use this action intentionally -- for example, to test how your application handles network failures.
:::

## Timeout and Auto-Continue

To prevent breakpoints from blocking traffic indefinitely (for example, if you step away from your desk or forget about a paused request), NectoProxy includes a configurable **auto-continue timeout**.

| Setting | Default | Description |
|---|---|---|
| **Timeout duration** | 30 seconds | How long a breakpoint waits before auto-resuming |
| **Auto-continue action** | Resume | What happens when the timeout expires (Resume or Drop) |

When the timeout expires, the intercepted message is automatically resumed (or dropped, depending on your configuration) without modification.

::: tip
You can adjust the timeout duration in the breakpoint settings. Set it to a longer value (e.g., 120 seconds) if you need more time to inspect and modify traffic, or disable auto-continue entirely if you always want manual control.
:::

## Practical Use Cases

### Testing Authentication Flows

Pause a login request and modify the credentials to test how the server handles different inputs:

1. Create a breakpoint on `POST /api/auth/login`
2. Submit the login form in your application
3. When the breakpoint triggers, modify the request body:
   ```json
   {
     "username": "admin",
     "password": "wrong-password"
   }
   ```
4. Resume the request and observe the server's error response
5. Verify your UI displays the appropriate error message

### Modifying API Response Payloads

Test how your UI handles edge cases in API responses:

1. Create a response breakpoint on `GET /api/products`
2. Trigger the API call from your application
3. When the response breakpoint triggers, modify the body to include edge-case data:
   ```json
   {
     "products": [],
     "total": 0,
     "message": "No products found"
   }
   ```
4. Resume the response and verify your UI renders the empty state correctly

### Debugging Race Conditions

Use breakpoints to control the timing of concurrent requests:

1. Create request breakpoints on two API endpoints that your application calls concurrently
2. Trigger the concurrent calls from your application
3. Both requests are paused at their breakpoints
4. Resume them in a specific order to test how your application handles different response orderings
5. This technique is invaluable for reproducing and fixing race condition bugs

### Simulating Server Errors

Test error handling by modifying response status codes:

1. Create a response breakpoint on your API endpoint
2. When the response arrives, change the status code to `500` and set the body to:
   ```json
   {
     "error": "Internal Server Error",
     "message": "Database connection timeout"
   }
   ```
3. Resume the modified response to see how your application handles the error

---

::: info
Breakpoints are session-level settings. They are active only while NectoProxy is running and must be reconfigured if you restart the proxy. For persistent traffic modifications, use the [Rules Engine](./rules-engine) instead.
:::
