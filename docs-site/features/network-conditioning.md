---
title: Network Conditioning
description: Simulate real-world network conditions to test your application under constrained environments.
---

# Network Conditioning

Network Conditioning lets you simulate real-world network environments by throttling bandwidth, adding latency, introducing jitter, and simulating packet loss. This is essential for testing how your application performs for users on slow mobile networks, high-latency satellite connections, or unreliable Wi-Fi.

## Why Network Conditioning Matters

Most developers build and test applications on fast, low-latency connections. But real users access applications from a wide range of network conditions:

- A user on a 2G network in a rural area
- A commuter on a crowded train with degraded 3G connectivity
- A user behind a corporate DSL connection
- A user with spotty hotel Wi-Fi

Network conditioning lets you experience your application the way these users do, so you can identify and fix performance issues, optimize loading states, and build a better experience for everyone.

## Built-In Profiles

NectoProxy includes **11 pre-configured network profiles** that simulate common real-world conditions. Select a profile from the network conditioning dropdown in the toolbar to activate it immediately.

### Mobile Network Profiles

| Profile | Download | Upload | Latency | Typical Scenario |
|---|---|---|---|---|
| **Slow 2G** | 280 Kbps | 256 Kbps | 1400 ms | GPRS in rural or low-signal areas |
| **Regular 2G** | 450 Kbps | 150 Kbps | 800 ms | Standard EDGE connectivity |
| **Good 2G** | 900 Kbps | 280 Kbps | 650 ms | Strong EDGE signal |
| **Slow 3G** | 780 Kbps | 330 Kbps | 400 ms | Degraded UMTS connectivity |
| **Regular 3G** | 1.5 Mbps | 750 Kbps | 300 ms | Standard HSPA connection |
| **Good 3G** | 4 Mbps | 1.5 Mbps | 170 ms | Strong HSPA+ signal |
| **Regular 4G** | 9 Mbps | 4 Mbps | 50 ms | Standard LTE connection |

### Fixed Network Profiles

| Profile | Download | Upload | Latency | Typical Scenario |
|---|---|---|---|---|
| **DSL** | 2 Mbps | 1 Mbps | 50 ms | Standard DSL broadband |
| **WiFi** | 30 Mbps | 15 Mbps | 10 ms | Typical home or office Wi-Fi |

### Special Profiles

| Profile | Effect | Description |
|---|---|---|
| **Offline** | 100% packet loss | Simulates complete network disconnection. All requests fail. |

::: warning Offline Mode
The Offline profile drops all traffic. Your application will experience network errors on every request. This is useful for testing offline-capable applications, service worker caching behavior, and error states.
:::

## Profile Details

### Slow 2G

```
Download:  280 Kbps
Upload:    256 Kbps
Latency:   1400 ms
```

Simulates the slowest cellular connection still in use. At 280 Kbps download speed with 1.4 seconds of latency, even a small 50 KB API response takes several seconds to load. Use this profile to test:

- Critical loading path optimization
- Progressive enhancement strategies
- Timeout configurations
- Skeleton screen and placeholder implementations

### Regular 2G

```
Download:  450 Kbps
Upload:    150 Kbps
Latency:   800 ms
```

A standard 2G EDGE connection. Still very slow by modern standards, but noticeably faster than Slow 2G. Good for testing how your application performs when basic connectivity is available but constrained.

### Good 2G

```
Download:  900 Kbps
Upload:    280 Kbps
Latency:   650 ms
```

The best-case 2G experience. Download speeds approach 1 Mbps, but latency remains high. Image-heavy pages and large JavaScript bundles will still load slowly.

### Slow 3G

```
Download:  780 Kbps
Upload:    330 Kbps
Latency:   400 ms
```

Degraded 3G connectivity, common in areas with weak signal or network congestion. Download speeds are comparable to Good 2G, but latency is significantly lower.

### Regular 3G

```
Download:  1.5 Mbps
Upload:    750 Kbps
Latency:   300 ms
```

A standard 3G HSPA connection. This is the experience for a large number of mobile users worldwide. At 1.5 Mbps, most web pages load within 5-10 seconds. A good baseline for mobile performance testing.

### Good 3G

```
Download:  4 Mbps
Upload:    1.5 Mbps
Latency:   170 ms
```

A strong HSPA+ connection. At 4 Mbps download, most content loads at an acceptable speed, but the 170 ms latency still adds noticeable delay to interactive operations.

### Regular 4G

```
Download:  9 Mbps
Upload:    4 Mbps
Latency:   50 ms
```

Standard LTE connectivity. This is perceived as a "good" connection by most users. At 9 Mbps with 50 ms latency, most applications perform well, but large downloads and real-time features may still feel slightly impacted compared to broadband.

### DSL

```
Download:  2 Mbps
Upload:    1 Mbps
Latency:   50 ms
```

A typical DSL broadband connection. The asymmetric speeds (2 Mbps down, 1 Mbps up) with low latency represent a common home broadband experience in many regions. Good for testing file upload scenarios.

### WiFi

```
Download:  30 Mbps
Upload:    15 Mbps
Latency:   10 ms
```

A typical home or office Wi-Fi connection. This is close to an unconstrained experience for most web applications. Useful as a "mild constraint" profile to verify that your application works well on a good but not perfect connection.

### Offline

```
Packet Loss:  100%
```

All network traffic is dropped. No requests reach the server, and no responses are delivered to the client. Use this to test:

- Offline-first application behavior
- Service worker cache fallbacks
- Local storage persistence
- "No connection" UI states
- Retry mechanisms when connectivity is restored

## Custom Profiles

If the built-in profiles do not match your testing needs, you can create **custom network profiles** with precise control over every parameter.

### Configurable Parameters

| Parameter | Unit | Description | Range |
|---|---|---|---|
| **Download Bandwidth** | Kbps or Mbps | Maximum download throughput | 0 -- unlimited |
| **Upload Bandwidth** | Kbps or Mbps | Maximum upload throughput | 0 -- unlimited |
| **Latency** | Milliseconds | Additional delay added to each request | 0 -- 30000 ms |
| **Jitter** | Milliseconds | Random variation in latency (plus or minus) | 0 -- 5000 ms |
| **Packet Loss** | Percentage | Probability that a request is dropped | 0% -- 100% |

### Creating a Custom Profile

1. Open the **Network Conditioning** panel in the toolbar
2. Click **Custom Profile**
3. Set each parameter to your desired value
4. Optionally save the profile with a name for reuse

::: details Example: Simulating Unstable Hotel Wi-Fi
Hotel Wi-Fi is notoriously unreliable. Create a custom profile to simulate it:

```
Download:     5 Mbps
Upload:       2 Mbps
Latency:      80 ms
Jitter:       150 ms
Packet Loss:  5%
```

The jitter introduces random latency variation (80 ms +/- 150 ms, so anywhere from 0 to 230 ms), and the 5% packet loss simulates the occasional dropped connection that characterizes unreliable networks.
:::

::: details Example: Simulating Satellite Internet
Satellite connections have high bandwidth but extreme latency:

```
Download:     25 Mbps
Upload:       3 Mbps
Latency:      600 ms
Jitter:       50 ms
Packet Loss:  1%
```

This profile tests how your application handles a scenario where individual requests are fast to transfer but the round-trip time is very high.
:::

## Use Cases

### Performance Budgeting

Set a target network profile (e.g., Regular 3G) and measure whether your application loads within your performance budget. If your page takes 15 seconds to become interactive on 3G, you have identified an optimization opportunity.

### Loading State Validation

Slow networks reveal loading states that are invisible on fast connections. Enable a Slow 2G or Regular 3G profile and verify that your application displays appropriate loading indicators, skeleton screens, and progress bars while content loads.

### Timeout and Retry Testing

Verify that your application's timeout configurations and retry logic work correctly under high-latency conditions. A request that completes in 200 ms on a local network might take 3 seconds on a Slow 3G connection -- does your timeout handle this gracefully?

### Image and Asset Optimization

Enable a constrained profile and observe how images, fonts, and JavaScript bundles load. This often reveals opportunities for lazy loading, responsive images, code splitting, and other optimization techniques.

### Error State Testing

Use the Offline profile or a high packet-loss custom profile to test your application's error handling. Verify that failed requests produce meaningful error messages and that users can recover gracefully.

---

::: tip
Network conditioning applies to **all traffic** flowing through NectoProxy. To condition only specific requests, combine network conditioning with [Rules Engine](./rules-engine) delay and throttle actions for targeted control.
:::
