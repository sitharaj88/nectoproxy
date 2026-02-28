---
title: Throttle Action
description: Limit bandwidth for specific HTTP requests. Simulate slow connections, test progressive loading, and reproduce mobile network conditions on a per-URL basis.
---

# Throttle Action

The **Throttle** action limits the data transfer rate for matched requests, simulating a slow network connection. Unlike the [Delay](./delay) action that adds a one-time wait, throttling continuously restricts how fast data flows between the server and the client throughout the entire duration of the response.

This is the per-URL equivalent of NectoProxy's global [Network Conditioning](/features/network-conditioning) feature. While network conditioning applies bandwidth limits to **all** traffic, throttle rules let you target specific URLs, hosts, or request patterns.

## How It Works

1. A request arrives at the proxy and matches a rule with the `throttle` action.
2. The request is forwarded to the target server.
3. As the response data arrives from the server, NectoProxy **rate-limits** the data delivery to the client.
4. Data is dripped out at the configured `bytesPerSecond` rate until the entire response has been delivered.

```
Client ◄──[throttled stream]──◄── NectoProxy ◄──[full speed]──◄── Server
```

The server transmits its response at full speed. NectoProxy buffers the data and delivers it to the client at the restricted rate. From the client's perspective, the server is responding slowly.

::: tip
Throttling affects the perceived download speed, not the server-side processing time. The server completes its work at normal speed; only the data delivery to the client is slowed.
:::

## Configuration Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `bytesPerSecond` | number | Yes | -- | Maximum data transfer rate in bytes per second |
| `latency` | number | No | `0` | Additional initial latency in milliseconds before data starts flowing |

### Common Bandwidth Values

Use these reference values to simulate real-world connection speeds:

| Connection Type | Speed | `bytesPerSecond` Value |
|----------------|-------|----------------------|
| 2G (GPRS) | 50 Kbps | `6250` |
| 2G (EDGE) | 250 Kbps | `31250` |
| 3G (HSPA) | 2 Mbps | `250000` |
| 3G (HSPA+) | 5 Mbps | `625000` |
| 4G (LTE) | 20 Mbps | `2500000` |
| Slow WiFi | 1 Mbps | `125000` |
| DSL | 5 Mbps | `625000` |
| Cable | 25 Mbps | `3125000` |
| Fiber | 100 Mbps | `12500000` |

::: details Conversion Formula
To convert from Mbps (megabits per second) to bytes per second:

```
bytesPerSecond = Mbps * 1,000,000 / 8
```

For example, 2 Mbps = 2 * 1,000,000 / 8 = 250,000 bytes/second.
:::

## Practical Examples

### Example 1: Simulate a 3G Connection for API Responses

Throttle API responses to 3G speeds to test how your application handles slower data delivery.

```json
{
  "name": "Throttle API to 3G",
  "enabled": true,
  "priority": 5,
  "matchPattern": {
    "url": "*/api/*"
  },
  "action": "throttle",
  "config": {
    "bytesPerSecond": 250000,
    "latency": 100
  }
}
```

Test it:

```bash
time curl -x http://localhost:8888 -s -o /dev/null -w "Downloaded %{size_download} bytes in %{time_total}s\n" \
  http://api.example.com/api/v1/large-dataset
```

The download will be limited to approximately 250 KB/s, plus an additional 100 ms initial latency.

### Example 2: Test Image Loading on Slow Connections

Throttle image downloads to verify that your lazy loading, progressive rendering, and placeholder strategies work correctly.

```json
{
  "name": "Throttle Image Downloads",
  "enabled": true,
  "priority": 3,
  "matchPattern": {
    "url": "/\\.(jpg|jpeg|png|gif|webp|svg)/"
  },
  "action": "throttle",
  "config": {
    "bytesPerSecond": 31250,
    "latency": 200
  }
}
```

At EDGE speeds (250 Kbps), a 500 KB image takes approximately 16 seconds to download. This lets you observe:
- Whether placeholder images or blur-up effects appear
- How the layout handles images that have not loaded yet
- Whether lazy loading triggers correctly on scroll
- How the UI looks during progressive JPEG rendering

::: tip
Throttling images specifically (rather than all traffic) lets you test image loading behavior without slowing down API calls and navigation. This creates a more focused and realistic test scenario.
:::

### Example 3: Simulate 2G Conditions for a Specific Endpoint

Test how your application handles extremely slow responses from a specific service, such as a search endpoint that returns large result sets.

```json
{
  "name": "2G Search Results",
  "enabled": true,
  "priority": 1,
  "matchPattern": {
    "url": "*/api/search*",
    "method": "GET"
  },
  "action": "throttle",
  "config": {
    "bytesPerSecond": 6250,
    "latency": 500
  }
}
```

```bash
curl -x http://localhost:8888 -s -w "\nTotal time: %{time_total}s\n" \
  "http://api.example.com/api/search?q=proxy&limit=100"
```

At 2G speeds with 500 ms latency, a 50 KB JSON response takes approximately 8.5 seconds to deliver. This tests:
- Whether the search UI shows a loading indicator for the full duration
- Whether users can cancel the request
- Whether the UI handles partial data gracefully

### Example 4: Throttle File Downloads

Limit download speeds for file download endpoints to test download progress indicators and resume logic.

```json
{
  "name": "Throttle File Downloads",
  "enabled": true,
  "priority": 2,
  "matchPattern": {
    "url": "*/downloads/*"
  },
  "action": "throttle",
  "config": {
    "bytesPerSecond": 125000
  }
}
```

At 1 Mbps, a 10 MB file takes approximately 80 seconds to download. This is long enough to observe:
- Download progress bar accuracy
- Estimated time remaining calculations
- Pause and resume functionality
- User cancellation handling

### Example 5: Throttle with Initial Latency

Combine bandwidth limiting with initial connection latency for a comprehensive slow network simulation.

```json
{
  "name": "Full Slow Network Simulation",
  "enabled": true,
  "priority": 10,
  "matchPattern": {
    "url": "*",
    "host": "cdn.example.com"
  },
  "action": "throttle",
  "config": {
    "bytesPerSecond": 62500,
    "latency": 300
  }
}
```

This simulates a 500 Kbps connection with 300 ms initial latency for all CDN resources. The `latency` parameter adds the initial wait before any data starts flowing, simulating the connection setup time on a slow network.

::: warning
When throttling all traffic to a CDN, page load times can increase dramatically. A typical web page may load 2-5 MB of assets from a CDN. At 500 Kbps, that takes 32-80 seconds. Use this for targeted testing, not continuous development.
:::

## Use Cases

### Testing on Slow Connections Per-URL

The primary advantage of throttle rules over global network conditioning is **granularity**. You can slow down specific URLs while leaving the rest of your traffic at full speed:

- Throttle only image downloads to test lazy loading
- Throttle only the search API to test loading states
- Throttle only third-party scripts to test fallback behavior

### Progressive Loading Testing

Throttling makes progressive loading strategies visible and testable:

- **Progressive JPEGs**: Verify that images render progressively at low quality, improving as more data arrives.
- **Streaming JSON**: Test applications that parse JSON responses incrementally.
- **Chunked responses**: Verify that chunked transfer encoding renders content as chunks arrive.

### Mobile Experience Simulation

Test your application under mobile network conditions without using a physical mobile device:

1. Create throttle rules with 3G bandwidth values.
2. Add `latency` to simulate cellular connection setup times.
3. Browse your application to identify performance bottlenecks.

::: tip
For the most realistic mobile simulation, combine throttle rules for API endpoints with the global Network Conditioning feature for other traffic. This gives you fine-grained control over specific endpoints while maintaining realistic overall network conditions.
:::

### Stress Testing Data Handling

Slow data delivery can expose bugs in how your application handles streaming data:
- Buffer overflow issues
- Memory leaks from long-running connections
- Timeout handling for slow-but-active connections
- Progress event accuracy

## Throttle vs. Network Conditioning

NectoProxy offers two ways to simulate slow connections. Choose based on your needs:

| Aspect | Throttle (Rule) | Network Conditioning (Global) |
|--------|-----------------|-------------------------------|
| **Scope** | Per-URL / per-pattern | All proxy traffic |
| **Configuration** | Rule-based with match patterns | Global profile selection |
| **Granularity** | Fine-grained, different speeds per URL | Same speed for everything |
| **Presets** | Manual configuration | Built-in profiles (2G, 3G, 4G, etc.) |
| **Use case** | Test specific endpoints at specific speeds | Simulate overall network quality |

::: details When to Use Each
**Use Throttle rules when:**
- You want to slow down specific endpoints without affecting the rest of the application
- You need different bandwidth limits for different types of resources
- You are testing a specific feature's behavior under slow conditions

**Use Network Conditioning when:**
- You want to simulate an overall slow network environment
- You need to test the entire application under uniform network constraints
- You want quick preset profiles (2G, 3G, 4G, WiFi, Offline)
- You are doing general performance auditing
:::

## Throttle vs. Delay

| Aspect | Throttle | Delay |
|--------|----------|-------|
| **What it does** | Limits continuous data transfer speed | Adds a one-time wait before forwarding |
| **Duration** | Proportional to response size | Fixed, regardless of response size |
| **Effect on large responses** | Significantly longer delivery time | Same fixed delay regardless of size |
| **Best simulates** | Slow network bandwidth | Server processing time |
| **Visible effect** | Gradual, streaming data delivery | Instant response after a wait |

::: danger
Throttle rules can make responses take much longer than expected for large payloads. A 10 MB response throttled to 2G speeds (6,250 bytes/s) would take approximately 27 minutes to deliver. Make sure your test scenarios use appropriately sized responses and bandwidth values.
:::
