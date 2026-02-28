---
title: Delay Action
description: Add artificial latency to HTTP requests. Test timeout handling, simulate slow APIs, uncover race conditions, and verify loading states.
---

# Delay Action

The **Delay** action pauses a matched request for a specified duration before forwarding it to the upstream server. The request and response are not modified in any way -- only the timing is affected.

This action is essential for testing how your application handles slow network conditions, verifying timeout logic, exposing race conditions, and ensuring that loading states render correctly.

## How It Works

1. A request arrives at the proxy and matches a rule with the `delay` action.
2. NectoProxy **waits** for the configured duration.
3. After the delay, the request is forwarded to the target server normally.
4. The server's response is returned to the client without additional delay.

```
Client ──► NectoProxy ──[wait]──► Server
                                     │
Client ◄────────────────────────◄───┘
```

The total request time as perceived by the client is the configured delay **plus** the actual server response time.

::: tip
The delay is applied **before** the request is forwarded, not after the response is received. This means the server still processes the request at its normal speed -- the artificial latency is purely a proxy-side wait.
:::

## Configuration Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `delay` | number | Yes | -- | Fixed delay in milliseconds before forwarding the request |
| `variance` | number | No | `0` | Random variance in milliseconds, applied as +/- around the base delay |

### Understanding Variance

When `variance` is set, the actual delay for each request is randomly selected from the range:

```
actual_delay = delay + random(-variance, +variance)
```

For example, with `delay: 1000` and `variance: 300`:
- Minimum delay: 700 ms (1000 - 300)
- Maximum delay: 1300 ms (1000 + 300)
- Average delay: 1000 ms

This simulates realistic network jitter, where latency fluctuates rather than remaining perfectly constant.

::: tip
Use variance to create more realistic simulations. Real networks never have perfectly consistent latency. Adding variance exposes timing-dependent bugs that a fixed delay might miss.
:::

## Practical Examples

### Example 1: Simulate a Slow API

Add a 2-second delay to all API requests to simulate a slow backend.

```json
{
  "name": "Slow API Simulation",
  "enabled": true,
  "priority": 5,
  "matchPattern": {
    "url": "*/api/*"
  },
  "action": "delay",
  "config": {
    "delay": 2000
  }
}
```

Test it:

```bash
time curl -x http://localhost:8888 http://api.example.com/api/v1/users
# Should take ~2 seconds longer than normal
```

### Example 2: Test Client Timeout Handling

Set a delay that exceeds your application's timeout threshold to verify that timeout errors are handled correctly.

```json
{
  "name": "Exceed Client Timeout",
  "enabled": true,
  "priority": 1,
  "matchPattern": {
    "url": "*/api/search*",
    "method": "GET"
  },
  "action": "delay",
  "config": {
    "delay": 35000
  }
}
```

If your application has a 30-second timeout, this rule triggers a timeout error, allowing you to verify:
- The timeout error message is user-friendly
- The application does not crash or hang
- Retry logic works correctly
- Loading indicators are dismissed

```bash
# This request will time out if your client has a 30-second timeout
curl -x http://localhost:8888 --max-time 30 http://api.example.com/api/search?q=test
# Expected: curl exits with timeout error before the proxy forwards the request
```

::: warning
Very long delays (> 60 seconds) may trigger proxy-level or operating system-level connection timeouts. If you need to test extremely long delays, check your proxy and OS timeout settings.
:::

### Example 3: Realistic Network Jitter

Simulate realistic network conditions with variable latency using the `variance` option.

```json
{
  "name": "Realistic API Latency",
  "enabled": true,
  "priority": 10,
  "matchPattern": {
    "url": "*/api/*",
    "host": "api.example.com"
  },
  "action": "delay",
  "config": {
    "delay": 800,
    "variance": 400
  }
}
```

Each request will have a random delay between 400 ms and 1200 ms. Run several requests to observe the variation:

```bash
# Run multiple requests and observe different response times
for i in 1 2 3 4 5; do
  time curl -x http://localhost:8888 -s -o /dev/null http://api.example.com/api/v1/health
done
```

### Example 4: Delay Only Specific Endpoints

Apply targeted delays to specific endpoints that you want to test in isolation.

```json
{
  "name": "Slow Payment Processing",
  "enabled": true,
  "priority": 1,
  "matchPattern": {
    "url": "*/api/payments/process",
    "method": "POST"
  },
  "action": "delay",
  "config": {
    "delay": 5000,
    "variance": 1000
  }
}
```

```json
{
  "name": "Slow Image Upload",
  "enabled": true,
  "priority": 2,
  "matchPattern": {
    "url": "*/api/upload*",
    "method": "POST"
  },
  "action": "delay",
  "config": {
    "delay": 8000,
    "variance": 2000
  }
}
```

This lets you test how your UI handles slow operations while the rest of the application responds at normal speed.

::: tip
Targeted delays are more useful than global delays for testing specific user flows. For example, delay only the checkout API to verify that the payment processing UI shows a progress indicator without slowing down the entire browsing experience.
:::

### Example 5: Incremental Latency for Pagination Testing

Create multiple delay rules with increasing latency to simulate progressively slower responses as the user pages through results.

```json
{
  "name": "Slow Later Pages",
  "enabled": true,
  "priority": 5,
  "matchPattern": {
    "url": "*/api/results*",
    "method": "GET"
  },
  "action": "delay",
  "config": {
    "delay": 1500,
    "variance": 500
  }
}
```

## Use Cases

### Testing Timeout Handling

Every HTTP client should have timeout logic. Delay rules let you verify that:
- The client aborts requests that take too long
- Error messages are displayed to the user
- Retry mechanisms work as expected
- Resources (connections, memory) are properly cleaned up after a timeout

### Simulating Slow APIs

APIs in production sometimes respond slowly due to database queries, external service calls, or resource contention. Delay rules let you reproduce these conditions in development:
- Test under realistic latency conditions
- Verify that your UI does not assume instant responses
- Identify race conditions between fast and slow endpoints

### Race Condition Testing

Race conditions often surface when operations complete in an unexpected order. By adding delays to specific endpoints, you can force a particular ordering:

1. Delay the "save" API by 3 seconds.
2. Trigger "save" and "navigate away" in quick succession.
3. Verify that the application handles the late-arriving save response correctly.

### Loading State Testing

Frontend applications should display loading indicators while waiting for API responses. Delay rules make it easy to verify:
- Spinners and skeleton screens render correctly
- Loading states are dismissed when the response arrives
- The UI is not interactive in states where it should not be
- Progress indicators update appropriately

::: danger
Do not leave delay rules enabled in any environment that handles real user traffic. Artificial delays directly impact user experience and can cause cascading timeouts in dependent services.
:::

## Delay vs. Throttle

Both Delay and [Throttle](./throttle) simulate slow network conditions but in fundamentally different ways:

| Aspect | Delay | Throttle |
|--------|-------|----------|
| **What slows down** | Time before request is forwarded | Data transfer rate |
| **Effect** | Fixed wait, then normal-speed transfer | Continuous slow data delivery |
| **Best for** | Timeout testing, race conditions | Download/upload speed testing |
| **User experience** | Sudden wait, then fast response | Gradual, continuous loading |
| **Simulates** | Server processing delay | Slow network bandwidth |

Use **Delay** when you want to test waiting and timeout scenarios. Use **Throttle** when you want to test progressive loading with bandwidth constraints.

::: details Combining Delay with Other Rules
Only one rule action is applied per request. If you need both a delay and a response modification, consider:

1. Using the [Mock](./mock) action with its built-in `delay` option for mocked responses.
2. Using the [Throttle](./throttle) action with its `latency` option for combined latency and bandwidth limiting.
3. Creating separate rules that target different aspects of the same API (e.g., delay on `GET` requests and modify response on `POST` requests).
:::
