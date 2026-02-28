---
title: Request Replay
description: Re-send captured HTTP requests with optional modifications using NectoProxy.
---

# Request Replay

Request Replay lets you **re-send any captured HTTP request** directly from the NectoProxy UI. You can replay the request exactly as it was originally sent, or modify the URL, method, headers, and body before replaying. The response to the replayed request is captured and can be compared against the original response.

## How It Works

1. **Select a request** from the traffic list
2. **Open the replay panel** from the request's detail view or context menu
3. **Optionally modify** the request (URL, method, headers, body)
4. **Send** the replayed request
5. **View the response** alongside the original for comparison

NectoProxy sends the replayed request through the proxy, which means all active features apply -- rules, breakpoints, network conditioning, and upstream proxy settings affect replayed requests just as they affect live traffic.

::: tip
The replayed request appears in the traffic list as a new entry, clearly marked as a replay. This maintains a complete audit trail of all traffic, including replays.
:::

## Replaying from the Traffic List

### Quick Replay

To replay a request without modifications:

1. Right-click on a request in the traffic list
2. Select **Replay Request**
3. The request is immediately re-sent with the same method, URL, headers, and body
4. The response appears as a new entry in the traffic list

### Replay with Modifications

To modify a request before replaying:

1. Click on a request in the traffic list to open the detail panel
2. Click the **Replay** button
3. The replay editor opens with all the original request details pre-filled
4. Make your modifications
5. Click **Send** to replay the modified request

## What You Can Modify

The replay editor lets you change any aspect of the request before it is sent.

### URL

Edit the full request URL, including the scheme, host, path, and query parameters:

```
Original:  https://api.example.com/v1/users?page=1&limit=10
Modified:  https://api.example.com/v1/users?page=2&limit=50
```

### HTTP Method

Change the HTTP method to test how the server handles different verbs:

```
Original:  GET
Modified:  POST
```

### Headers

Add, modify, or remove request headers:

```
Original headers:
  Authorization: Bearer old-token-123
  Accept: application/json

Modified headers:
  Authorization: Bearer new-token-456
  Accept: application/xml
  X-Debug: true
```

### Request Body

Edit the request body content. For JSON bodies, the editor provides syntax highlighting and validation:

```json
// Original body
{
  "name": "Jane Doe",
  "email": "jane@example.com"
}

// Modified body
{
  "name": "Jane Doe",
  "email": "jane.doe@newdomain.com",
  "role": "admin"
}
```

::: details Advanced Body Editing
The body editor supports:
- **JSON** with syntax highlighting and pretty-printing
- **Form data** with key-value pair editing
- **Plain text** with a simple text editor
- **Raw binary** with hex input

The Content-Type header is automatically updated if you change the body format, or you can set it manually.
:::

## Comparing Original vs. Replayed Response

After replaying a request, you can compare the replayed response with the original to identify differences. NectoProxy provides a comparison view that shows:

| Comparison | What is Shown |
|---|---|
| **Status code** | Whether the status code changed |
| **Response headers** | Added, removed, or modified headers |
| **Response body** | Content differences (JSON-aware for structured data) |
| **Timing** | Response time comparison |

This comparison is powered by the same engine used in the [Request Comparison](./request-comparison) feature, with visual highlighting of differences.

::: tip
The compare view is particularly useful for verifying that API behavior has not changed after a deployment. Replay a request from before the deployment and compare the response to identify any differences.
:::

## Use Cases

### Regression Testing

Verify that an API endpoint still returns the same response after a code change or deployment:

1. Capture requests to the endpoint before the change
2. After the change is deployed, replay the captured requests
3. Compare original and replayed responses
4. Investigate any differences

### Debugging Intermittent Issues

Reproduce an intermittent error by replaying the exact request that triggered the issue:

1. Capture the failing request in NectoProxy
2. Replay it multiple times to see if the error is consistent or intermittent
3. If intermittent, monitor the response patterns to identify correlating factors (timing, server state)
4. Modify headers or body to narrow down the cause

### Testing Input Variations

Test how an API handles different inputs without manually constructing requests from scratch:

1. Capture a working request to the API
2. Use replay-with-modifications to change specific input values
3. Test edge cases:
   - Empty strings
   - Missing required fields
   - Extremely long values
   - Special characters
   - Boundary values for numeric fields
4. Observe how the server responds to each variation

### Authentication Testing

Test different authentication scenarios:

1. Capture an authenticated API request
2. Replay with the original token to verify it still works
3. Replay with an expired token to test error handling
4. Replay with a token for a different user to test authorization
5. Replay without the Authorization header to test unauthenticated access

### Rate Limit Testing

Verify rate limiting behavior:

1. Capture a request to a rate-limited endpoint
2. Replay it rapidly multiple times
3. Observe when the server starts returning `429 Too Many Requests`
4. Check the response headers for rate limit information (e.g., `X-RateLimit-Remaining`)

## Multiple Replays

You can replay the same request multiple times. Each replay creates a new entry in the traffic list, so you can compare responses across multiple replays to check for consistency.

::: details Example: Consistency Testing
```
Original request  --> 200 OK  {"balance": 100.00}
Replay #1        --> 200 OK  {"balance": 100.00}
Replay #2        --> 200 OK  {"balance": 100.00}
Replay #3        --> 200 OK  {"balance": 95.00}   <-- Different!
```

If a replayed response differs from the original or from previous replays, this indicates that server state has changed or that the response is non-deterministic. This insight is valuable for debugging data consistency issues.
:::

## Interaction with Other Features

| Feature | Behavior |
|---|---|
| **Rules Engine** | Active rules apply to replayed requests. A mock rule will return the mock response for a replay, just as it would for a live request. |
| **Breakpoints** | Active breakpoints can intercept replayed requests, allowing you to modify them further during replay. |
| **Network Conditioning** | Active network conditioning profiles affect replayed requests. |
| **Sessions** | Replayed requests are added to the active session. |
| **HAR Export** | Replayed requests are included in HAR exports. |
| **Annotations** | You can annotate replayed requests just like any other entry. |

---

::: info
Request replay sends a real HTTP request to the target server. Be mindful when replaying requests that trigger side effects (creating records, sending emails, processing payments, etc.). Always verify that you are replaying against a safe environment.
:::
