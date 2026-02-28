---
title: Request Comparison
description: Compare two HTTP requests or responses side by side with visual diff highlighting.
---

# Request Comparison

Request Comparison lets you select any **two traffic entries** from the NectoProxy traffic list and view a detailed **side-by-side diff** of their requests and responses. Differences are visually highlighted, making it easy to identify exactly what changed between two API calls.

## Overview

Comparing two HTTP transactions is a common debugging task:

- What changed between a working request and a failing one?
- Did the API response change after a deployment?
- Are two seemingly identical requests actually different?
- How does the response differ between two users or environments?

NectoProxy's comparison feature answers these questions by displaying a structured, highlighted diff of every aspect of the two selected entries.

## How to Compare

### Selecting Entries

1. **Select the first entry** in the traffic list by clicking on it
2. **Hold `Ctrl` (or `Cmd` on macOS) and click the second entry** to add it to the selection
3. With two entries selected, click the **Compare** button in the toolbar, or right-click and select **Compare Selected**

The comparison view opens, showing both entries side by side with differences highlighted.

::: tip
You can compare any two entries in the traffic list, regardless of their position, session, or age. Compare a request from today with one from yesterday, or compare entries from different sessions.
:::

### Comparison Layout

The comparison view is divided into two columns:

```
+----------------------------+----------------------------+
|         Entry A            |         Entry B            |
|  (first selected entry)    |  (second selected entry)   |
+----------------------------+----------------------------+
|  Request headers           |  Request headers           |
|  - highlighted diffs -     |  - highlighted diffs -     |
+----------------------------+----------------------------+
|  Request body              |  Request body              |
|  - highlighted diffs -     |  - highlighted diffs -     |
+----------------------------+----------------------------+
|  Response headers          |  Response headers          |
|  - highlighted diffs -     |  - highlighted diffs -     |
+----------------------------+----------------------------+
|  Response body             |  Response body             |
|  - highlighted diffs -     |  - highlighted diffs -     |
+----------------------------+----------------------------+
```

## What is Compared

### Request Line

The comparison starts with the request line, showing differences in method, URL, and HTTP version:

```diff
- GET /api/v1/users?page=1&limit=10 HTTP/1.1
+ GET /api/v1/users?page=2&limit=10 HTTP/1.1
```

### Header Diff

Headers are compared key by key. The diff view shows:

| Indicator | Meaning | Color |
|---|---|---|
| **Added** | Header exists in Entry B but not in Entry A | Green |
| **Removed** | Header exists in Entry A but not in Entry B | Red |
| **Modified** | Header exists in both but values differ | Yellow/Orange |
| **Unchanged** | Header is identical in both entries | Gray (dimmed) |

::: details Example: Header Diff
```diff
  Content-Type: application/json          (unchanged)
- Authorization: Bearer old-token-abc     (removed/modified)
+ Authorization: Bearer new-token-xyz     (added/modified)
  Accept: application/json                (unchanged)
+ X-Request-Id: req-456                   (added)
- X-Debug: true                           (removed)
  User-Agent: MyApp/2.0                   (unchanged)
```
:::

### Body Diff

Body comparison adapts to the content type for the most meaningful diff:

#### JSON-Aware Diffing

For JSON bodies, NectoProxy parses and compares the JSON structure rather than performing a plain text diff. This means:

- **Key ordering** does not produce false diffs (JSON objects are order-independent)
- **Nested changes** are identified precisely
- **Added and removed keys** are highlighted at the correct level

```diff
{
    "name": "Jane Doe",                    (unchanged)
-   "email": "jane@old.com",              (modified)
+   "email": "jane@new.com",              (modified)
    "role": "admin",                       (unchanged)
+   "department": "engineering",           (added)
-   "temporary": true                      (removed)
}
```

::: tip
JSON-aware diffing is automatically activated when both entries have a `Content-Type` of `application/json`. For other content types, a standard text diff is used.
:::

#### Text Diff

For non-JSON text content (HTML, XML, plain text, etc.), a standard line-by-line diff is displayed:

```diff
  <html>
  <head>
-   <title>Old Page Title</title>
+   <title>New Page Title</title>
  </head>
  <body>
    <h1>Welcome</h1>
+   <p>This paragraph was added.</p>
  </body>
  </html>
```

#### Binary Content

For binary content, the comparison shows the size difference and indicates whether the content is identical or different. A byte-level comparison is not displayed for binary data.

### Response Status

Status code differences are clearly highlighted:

```diff
- HTTP/1.1 200 OK
+ HTTP/1.1 404 Not Found
```

### Timing Comparison

Timing data from both entries is shown side by side, making it easy to spot performance differences:

| Phase | Entry A | Entry B | Delta |
|---|---|---|---|
| DNS | 12 ms | 15 ms | +3 ms |
| Connect | 35 ms | 34 ms | -1 ms |
| TLS | 48 ms | 50 ms | +2 ms |
| Send | 1 ms | 1 ms | 0 ms |
| Wait (TTFB) | 132 ms | 890 ms | **+758 ms** |
| Receive | 17 ms | 45 ms | +28 ms |
| **Total** | **245 ms** | **1035 ms** | **+790 ms** |

Large timing differences are highlighted to draw your attention to performance regressions.

## Visual Highlighting

The comparison view uses consistent color coding throughout:

| Color | Meaning |
|---|---|
| **Green background** | Content that was added (present in Entry B, absent in Entry A) |
| **Red background** | Content that was removed (present in Entry A, absent in Entry B) |
| **Yellow/Orange background** | Content that was modified (present in both, but values differ) |
| **No highlight** | Content that is identical in both entries |

## Use Cases

### Before/After Testing

The most common use case is comparing traffic before and after a change:

1. Capture a request **before** making a code or configuration change
2. Make the change
3. Capture the same request **after** the change
4. Compare the two entries to verify only the expected differences appear

::: details Example Workflow: Testing a Bug Fix
1. Capture the API response that contains the bug (e.g., incorrect calculation)
2. Deploy the fix
3. Re-capture the API response
4. Compare: verify the response body contains the corrected value and nothing else has changed

```diff
  {
    "orderId": "ORD-123",
    "items": [...],
-   "total": 99.99,        // Bug: wrong total
+   "total": 109.99,       // Fixed: correct total
    "currency": "USD"
  }
```
:::

### Debugging Inconsistent Behavior

When the same request returns different results at different times:

1. Capture the request when it works correctly
2. Capture the request when it behaves incorrectly
3. Compare to identify what differs -- headers, body, timing, or status code

### Comparing Environments

Compare how the same request behaves in different environments:

1. Send a request to the staging API (e.g., `staging-api.example.com`)
2. Send the same request to the production API (e.g., `api.example.com`)
3. Compare the responses to identify environment-specific differences

### Reviewing Replayed Requests

After using [Request Replay](./request-replay) to re-send a request:

1. Select the original request and the replayed request
2. Compare them to see if the response has changed
3. This is effectively an automated regression test

### Investigating Authentication Differences

Compare requests from different authentication contexts:

1. Capture a request made by User A
2. Capture the same endpoint called by User B
3. Compare to verify that role-based access control is working correctly (e.g., User A sees admin fields, User B does not)

---

::: info
Request comparison is a read-only operation. It does not modify the original traffic entries. Both entries remain unchanged in the traffic list after comparison.
:::
