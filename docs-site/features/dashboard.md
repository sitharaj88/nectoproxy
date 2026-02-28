---
title: Dashboard
description: Visual analytics and real-time statistics for captured HTTP traffic in NectoProxy.
---

# Dashboard

The Dashboard provides a **visual analytics view** of your captured HTTP traffic. Real-time charts, statistical summaries, and top-level metrics give you a bird's-eye view of your application's network behavior, making it easy to spot patterns, anomalies, and performance issues.

## Overview

The dashboard is organized into two main areas:

1. **Statistical summary cards** -- Key metrics at a glance
2. **Charts** -- Visual representations of traffic data over time and by category

All dashboard data updates **in real time** as new traffic is captured, so you can watch metrics evolve as you interact with your application.

## Statistical Summary Cards

The top of the dashboard displays summary cards with key metrics:

### Total Requests

The total number of HTTP requests captured in the active session.

```
Total Requests
    1,247
```

### Average Response Time

The mean response time across all captured requests, measured in milliseconds.

```
Avg Response Time
    342 ms
```

::: tip
A high average response time may indicate backend performance issues. Drill into the "Top Slowest Requests" chart to identify specific endpoints that are dragging the average up.
:::

### Error Rate

The percentage of requests that returned error status codes (4xx and 5xx) relative to total requests.

```
Error Rate
    3.2%
```

::: warning
An error rate above 1-2% typically warrants investigation. Check the "Requests by Status Code" chart to see whether errors are concentrated on specific status codes (e.g., a spike in 429 rate-limiting responses or 503 service unavailable errors).
:::

## Charts

### Requests Per Second

A **time-series line chart** showing the rate of requests over time. The x-axis represents time, and the y-axis shows the number of requests per second.

**What to look for:**
- **Spikes** -- Sudden increases in request rate may indicate polling loops, retry storms, or user-initiated batch operations
- **Drops** -- Sudden decreases may indicate connectivity issues or blocked traffic
- **Steady patterns** -- Consistent request rates indicate normal application behavior

::: details Example: Identifying a Polling Loop
If you see a consistent high request rate (e.g., 10 requests per second) even when the application is idle, this likely indicates an aggressive polling interval. Look at the traffic list to identify which endpoint is being polled and consider reducing the frequency or switching to WebSocket for real-time updates.
:::

### Error Rate Over Time

A **time-series chart** showing the percentage of error responses (4xx and 5xx) over time. This helps you correlate error spikes with specific actions or time periods.

**What to look for:**
- **Error spikes after deployments** -- Indicates a regression
- **Gradual increase in errors** -- May indicate resource exhaustion on the server
- **Periodic error patterns** -- Could indicate scheduled jobs or maintenance windows

### Response Time Histogram

A **histogram** showing the distribution of response times across all captured requests. The x-axis shows response time buckets (e.g., 0-100ms, 100-200ms, etc.), and the y-axis shows the number of requests in each bucket.

**What to look for:**
- **Bimodal distribution** -- Two clusters of response times may indicate cache hits vs. cache misses, or fast vs. slow database queries
- **Long tail** -- A few very slow requests dragging out the right side of the histogram indicate outlier performance issues
- **Shift right** -- If the entire distribution shifts to higher response times compared to a baseline, overall performance has degraded

### Requests by Domain

A **bar chart** or **pie chart** showing the distribution of requests across different domains (hostnames). This reveals which services your application communicates with most frequently.

**What to look for:**
- **Unexpected domains** -- Third-party services you did not expect your application to contact
- **Dominant domains** -- One domain receiving a disproportionate number of requests may be a candidate for optimization (caching, batching, etc.)
- **CDN vs. API traffic** -- Understanding the ratio of static asset requests vs. API requests

::: details Example: Discovering Unnecessary Requests
A "Requests by Domain" chart might reveal that `analytics.thirdparty.com` accounts for 30% of all requests. This is a signal to investigate whether the analytics integration is overly chatty and could be optimized.
:::

### Requests by Status Code

A **bar chart** showing how many requests returned each status code. Status codes are grouped and color-coded:

| Range | Color | Category |
|---|---|---|
| **2xx** | Green | Successful responses |
| **3xx** | Blue | Redirections |
| **4xx** | Orange | Client errors |
| **5xx** | Red | Server errors |

**What to look for:**
- **High 301/302 count** -- Excessive redirects can slow page loads
- **High 404 count** -- Broken links or missing assets
- **Any 5xx responses** -- Server errors that need investigation
- **429 responses** -- Rate limiting is being triggered

### Top Slowest Requests

A **ranked list** of the slowest requests captured in the session, ordered by response time (longest first).

| Rank | URL | Duration | Status |
|---|---|---|---|
| 1 | `POST /api/reports/generate` | 12,450 ms | 200 |
| 2 | `GET /api/search?q=widgets` | 8,230 ms | 200 |
| 3 | `GET /api/dashboard/analytics` | 5,120 ms | 200 |
| 4 | `POST /api/images/upload` | 4,890 ms | 201 |
| 5 | `GET /api/users?include=all` | 3,450 ms | 200 |

**What to look for:**
- Endpoints that consistently appear in this list are prime optimization targets
- The difference between the slowest and average response time indicates how much variability exists
- Check whether slow requests are slow due to server processing (high TTFB) or large responses (high download time)

::: tip
Click on any entry in the "Top Slowest Requests" list to jump to that request in the traffic list, where you can inspect its timing breakdown, headers, and response body in detail.
:::

## Real-Time Updates

Dashboard charts and statistics update **in real time** as new traffic flows through NectoProxy. You do not need to refresh or reload the dashboard.

This real-time behavior is useful for:

- **Monitoring live testing** -- Watch metrics evolve as you interact with your application
- **Observing the impact of changes** -- Deploy a fix and immediately see the effect on error rates or response times
- **Detecting anomalies** -- Spot unusual patterns (spikes, drops, errors) as they happen

## Filtering Dashboard Data

The dashboard displays data from the **active session**. To change what data is displayed:

### By Session

Switch to a different [session](./sessions) to view that session's dashboard metrics. This lets you compare dashboard views across different test runs.

### By Time Range

If the session contains a large amount of traffic, you can narrow the dashboard to a specific time range:

- **Last 5 minutes**
- **Last 15 minutes**
- **Last 1 hour**
- **All time** (entire session)

### By Domain or Path

Filter dashboard data to show metrics for a specific domain or URL path:

```
Filter: api.example.com
```

This recalculates all charts and statistics using only traffic to the specified domain.

## Use Cases

### Performance Monitoring

Use the dashboard to monitor your application's network performance during development:

1. Start a new session for your performance testing
2. Interact with your application (or run automated tests)
3. Watch the dashboard for response time trends and error rates
4. Use the "Top Slowest Requests" to identify optimization targets
5. Make changes and re-test, comparing dashboard metrics between sessions

### Deployment Verification

After deploying a new version:

1. Create a new session for post-deployment monitoring
2. Drive traffic through the application
3. Check the error rate for any increase compared to pre-deployment
4. Verify that response times have not degraded
5. Look for any unexpected changes in the domain or status code distributions

### Load Pattern Analysis

Understand your application's communication patterns:

1. Capture traffic from a realistic user session
2. Review the "Requests by Domain" chart to see which services are called
3. Review the "Requests Per Second" chart to understand traffic patterns
4. Identify opportunities for optimization (batching, caching, reducing unnecessary calls)

---

::: info
Dashboard data is computed from the traffic entries in the active session. Clearing the session or switching to a different session resets the dashboard view. Export sessions before clearing them if you want to preserve the data for future reference.
:::
