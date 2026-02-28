# Testing Error Handling

**Difficulty:** Intermediate | **Time:** 10 minutes

This tutorial shows you how to systematically test your application's error-handling paths by using NectoProxy to simulate various failure scenarios. Well-tested error handling is critical, and most bugs hide in the paths developers rarely exercise.

## Prerequisites

- NectoProxy installed and running
- CA certificate installed in your browser
- Browser proxy configured to use port 8888
- An application you want to test

## Scenario Overview

You will test how your application handles five categories of failure:

| Scenario | NectoProxy Feature | What You Test |
|----------|---------------------|---------------|
| Connection blocked | Block rule | Network unreachable / connection refused |
| Server error | Mock rule (500) | Internal server error handling |
| Rate limiting | Mock rule (429) | Retry logic, backoff, user feedback |
| Timeout | Delay rule (35s) | Client-side timeout handling |
| Manual modification | Breakpoints | Ad-hoc response manipulation |

## Step 1: Test Connection Errors with a Block Rule

A **Block** rule prevents the request from reaching the server entirely, simulating a scenario where the server is unreachable or the network is down.

1. Open the **Rules panel** in the NectoProxy Web UI.
2. Click **Add Rule**.
3. Configure:

   | Field | Value |
   |-------|-------|
   | **Name** | Block API Endpoint |
   | **Action** | Block |
   | **Match URL** | `*/api/critical-endpoint` |

4. Click **Save**.

Now navigate to the part of your application that calls this endpoint. Your application should:

- Show a user-friendly error message (not a blank screen or crash).
- Log the error appropriately.
- Offer a retry option if applicable.

::: tip
The Block action returns a connection error to the client. This is different from returning an HTTP error status code -- it simulates the server being completely unreachable. Use this to test the most severe failure mode.
:::

## Step 2: Test Server Errors with a 500 Mock

Create a mock rule that returns a 500 Internal Server Error:

1. Click **Add Rule** in the Rules panel.
2. Configure:

   | Field | Value |
   |-------|-------|
   | **Name** | Mock 500 Error |
   | **Action** | Mock |
   | **Match URL** | `*/api/critical-endpoint` |
   | **Status** | `500` |
   | **Status Text** | `Internal Server Error` |

3. Add headers:

   | Header | Value |
   |--------|-------|
   | `Content-Type` | `application/json` |

4. Set the body:

```json
{
  "error": "InternalServerError",
  "message": "An unexpected error occurred",
  "requestId": "req-12345"
}
```

5. Click **Save**.
6. **Disable** the Block rule from Step 1 so this Mock rule takes effect.

Test your application. It should:

- Display an appropriate error message to the user.
- Not expose raw error details (like stack traces) to end users.
- Consider offering a retry mechanism.

::: warning
Make sure to disable or delete conflicting rules when testing different scenarios. If both a Block rule and a Mock rule match the same URL pattern, the rule with higher priority will fire first.
:::

## Step 3: Test Rate Limiting with a 429 Mock

Rate limiting is a common API behavior that applications must handle gracefully.

1. Click **Add Rule**.
2. Configure:

   | Field | Value |
   |-------|-------|
   | **Name** | Mock Rate Limit |
   | **Action** | Mock |
   | **Match URL** | `*/api/critical-endpoint` |
   | **Status** | `429` |
   | **Status Text** | `Too Many Requests` |

3. Add headers:

   | Header | Value |
   |--------|-------|
   | `Content-Type` | `application/json` |
   | `Retry-After` | `60` |
   | `X-RateLimit-Remaining` | `0` |
   | `X-RateLimit-Reset` | `1706900000` |

4. Set the body:

```json
{
  "error": "RateLimitExceeded",
  "message": "Too many requests. Please try again in 60 seconds.",
  "retryAfter": 60
}
```

5. Click **Save**.
6. Disable the 500 rule from Step 2.

Test your application. It should:

- Read the `Retry-After` header and wait before retrying.
- Show the user a meaningful message about the rate limit.
- Implement exponential backoff if appropriate.

## Step 4: Test Timeout Handling with a Delay Rule

Use a **Delay** rule to simulate a server that takes too long to respond, triggering your client's timeout logic.

1. Click **Add Rule**.
2. Configure:

   | Field | Value |
   |-------|-------|
   | **Name** | Simulate Slow Response |
   | **Action** | Delay |
   | **Match URL** | `*/api/critical-endpoint` |
   | **Delay** | `35000` (35 seconds) |

3. Click **Save**.
4. Disable the 429 rule from Step 3.

::: details Why 35 Seconds?
The default `requestTimeout` in NectoProxy is 30,000 ms (30 seconds). A 35-second delay exceeds this timeout, causing NectoProxy itself to abort the request. If your client has its own timeout (e.g., Axios defaults to no timeout, fetch has no built-in timeout), adjust the delay to exceed your client's timeout value.
:::

Test your application. It should:

- Show a loading indicator while waiting.
- Eventually time out and display an error.
- Not freeze or become unresponsive.
- Offer a way to retry the request.

## Step 5: Use Breakpoints for Ad-Hoc Modification

Breakpoints let you intercept a request or response in real time and manually modify it before it continues. This is useful for one-off tests that do not warrant creating a permanent rule.

1. Open the **Breakpoints panel** in the Web UI.
2. Click **Add Breakpoint**.
3. Configure:

   | Field | Value |
   |-------|-------|
   | **Name** | Intercept API Response |
   | **Type** | Response |
   | **Match URL** | `*/api/critical-endpoint` |

4. Click **Save**.
5. Disable all rules from the previous steps.

Now trigger the request from your application. The request goes to the real server, but NectoProxy pauses the response before delivering it to your app:

1. The **Intercepted Panel** appears showing the response details.
2. You can modify:
   - **Status code** -- Change `200` to `503` to test service unavailable handling.
   - **Headers** -- Add, remove, or modify response headers.
   - **Body** -- Replace the response body with malformed JSON, empty body, or unexpected data.
3. Click **Resume** to deliver the modified response to your application.
4. Click **Abort** to drop the connection entirely.

::: tip
Breakpoints are powerful for exploratory testing. You can change the response differently each time without creating or modifying rules. The breakpoint timeout (default 30 seconds) auto-continues the request if you do not interact with it in time.
:::

## Error-Handling Checklist

Use this checklist to systematically verify your application's resilience:

- [ ] **Connection refused:** App shows error, does not crash
- [ ] **500 Internal Server Error:** User sees friendly message
- [ ] **502 Bad Gateway:** Handled distinctly from 500 if applicable
- [ ] **503 Service Unavailable:** Retry logic activates
- [ ] **429 Too Many Requests:** Backoff/retry, respects Retry-After
- [ ] **408 Request Timeout:** Client retries or notifies user
- [ ] **Network timeout:** Loading state resolves, error shown
- [ ] **Malformed JSON response:** App does not crash on parse error
- [ ] **Empty response body:** Handled without null reference errors
- [ ] **Missing required fields:** Validation handles partial data
- [ ] **Slow response (5-10s):** Loading indicator visible
- [ ] **Very slow response (30s+):** Timeout fires correctly

## Tips

- **Test in order of severity:** Start with the most severe failures (connection blocked) and work toward less severe ones (slow responses).
- **Combine scenarios:** In production, errors often compound. Try enabling a delay rule alongside a mock error to simulate a slow server that eventually fails.
- **Test concurrent failures:** If your app makes multiple API calls, mock errors on one endpoint while leaving others working to verify that partial failures are handled correctly.
- **Document expected behavior:** Keep a record of what your app should do in each scenario. This becomes your regression test plan.
