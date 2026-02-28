# Simulating Slow Networks

**Difficulty:** Beginner | **Time:** 10 minutes

This tutorial shows you how to use NectoProxy's network conditioning feature to simulate slow, unreliable, or constrained network connections. This helps you understand how your application behaves for users on mobile networks, slow Wi-Fi, or in regions with poor connectivity.

## Prerequisites

- NectoProxy installed and running
- Browser configured to use the proxy (port 8888)

## Why Simulate Slow Networks?

Most developers work on fast, reliable connections. Your users may not. Network simulation helps you:

- Test loading states and skeleton screens
- Verify progressive image loading
- Ensure lazy loading works correctly
- Check that timeouts are configured properly
- Measure perceived performance
- Test offline handling

## Step 1: Open the Network Conditioning Panel

In the NectoProxy Web UI, click the **Network Conditioning** button in the header toolbar (the speedometer/gauge icon). This opens the Network Conditioning panel.

## Step 2: Select a Built-In Preset

NectoProxy includes several built-in network presets that model real-world connections:

| Preset | Download | Upload | Latency | Packet Loss |
|--------|----------|--------|---------|-------------|
| **No Throttling** | Unlimited | Unlimited | 0 ms | 0% |
| **Slow 2G** | 280 Kbps | 256 Kbps | 1,400 ms | 1% |
| **Regular 2G** | 450 Kbps | 150 Kbps | 800 ms | 0.5% |
| **Good 2G** | 900 Kbps | 280 Kbps | 650 ms | 0.2% |
| **Slow 3G** | 780 Kbps | 330 Kbps | 400 ms | 0% |
| **Regular 3G** | 1.5 Mbps | 750 Kbps | 300 ms | 0% |
| **Good 3G** | 4 Mbps | 1.5 Mbps | 170 ms | 0% |
| **Regular 4G** | 9 Mbps | 4 Mbps | 50 ms | 0% |
| **DSL** | 2 Mbps | 1 Mbps | 50 ms | 0% |
| **WiFi** | 30 Mbps | 15 Mbps | 10 ms | 0% |
| **Offline** | ~0 | ~0 | 30,000 ms | 100% |

To activate a preset:

1. Click on the preset name in the list.
2. The preset is applied immediately to all traffic flowing through the proxy.
3. An indicator appears in the header showing that network conditioning is active.

::: tip
Start with **Slow 3G** for a realistic representation of a poor-but-usable mobile connection. This is the condition most likely to reveal performance issues in your application.
:::

## Step 3: Browse Your Application

With network conditioning active, open your application in the browser and interact with it normally. Pay attention to:

- **Initial load time:** How long does the page take to become usable?
- **Navigation:** Are page transitions smooth, or do they freeze while loading?
- **Images:** Do images load progressively or suddenly appear after a long wait?
- **API calls:** Are loading spinners shown while data is being fetched?
- **Forms:** Does submitting a form feel responsive, or does the user wonder if it worked?

## Step 4: Create a Custom Network Profile

If the built-in presets do not match your specific needs, create a custom profile:

1. In the Network Conditioning panel, look for the option to create a custom profile.
2. Configure the following parameters:

   | Parameter | Description | Unit |
   |-----------|-------------|------|
   | **Download Bandwidth** | Maximum download speed | bytes/second |
   | **Upload Bandwidth** | Maximum upload speed | bytes/second |
   | **Latency** | Base round-trip delay added to each request | milliseconds |
   | **Latency Jitter** | Random variance added to the base latency | milliseconds |
   | **Packet Loss** | Percentage of requests randomly dropped | 0-100% |

::: details Example: Australian Rural Connection
To simulate a connection typical of rural Australia:

| Parameter | Value |
|-----------|-------|
| Download Bandwidth | 128 KB/s (1 Mbps) |
| Upload Bandwidth | 32 KB/s (256 Kbps) |
| Latency | 200 ms |
| Latency Jitter | 50 ms |
| Packet Loss | 0.5% |
:::

## Step 5: Test Progressive Image Loading

Progressive images are loaded in stages, providing a blurry preview first and progressively improving quality. To test this:

1. Select the **Slow 3G** or **Regular 2G** preset.
2. Navigate to a page with images.
3. Observe whether images:
   - Show a placeholder/skeleton while loading (good)
   - Appear all at once after a long delay (needs improvement)
   - Load progressively from blurry to sharp (ideal for JPEG)

## Step 6: Test Lazy Loading Behavior

Lazy loading defers loading of off-screen content until the user scrolls to it. To test:

1. Activate a slow network preset (e.g., **Slow 3G**).
2. Navigate to a page with a long scrollable list.
3. Scroll slowly and observe:
   - Are off-screen items loaded on demand?
   - Is there a visible loading state when new items appear?
   - Does the scrolling feel janky due to layout shifts?
   - Does infinite scroll work correctly under slow conditions?

## Combining Global Conditioning with Per-URL Throttle Rules

For more targeted testing, combine global network conditioning with per-URL throttle rules:

**Global conditioning** affects all traffic uniformly. **Throttle rules** let you apply specific bandwidth limits to individual URLs.

**Example scenario:** You want to test your app with generally fast internet but a slow image CDN:

1. Keep global network conditioning set to **No Throttling** (or a fast profile like **WiFi**).
2. Create a **Throttle rule** in the Rules panel:

   | Field | Value |
   |-------|-------|
   | **Name** | Slow Image CDN |
   | **Action** | Throttle |
   | **Match Host** | `cdn.example.com` |
   | **Bytes Per Second** | `51200` (50 KB/s) |
   | **Latency** | `500` (ms) |

This way, your API calls remain fast while images from the CDN load slowly, accurately simulating a scenario where the CDN is under load or geographically distant.

## Tips for Network Simulation Testing

- **Test the "first visit" experience:** Clear your browser cache before testing with slow networks. Cached resources skew results.
- **Monitor the NectoProxy traffic list** to see actual transfer times for each request. The duration column shows how long each request took under the simulated conditions.
- **Use the "Offline" preset** to test what happens when the network is completely unavailable. Your app should detect this and show an appropriate message.
- **Test on actual mobile devices** by combining network conditioning with the [mobile debugging setup](./debugging-mobile). This gives you a more realistic picture than emulating mobile conditions in a desktop browser.
- **Measure Core Web Vitals** under constrained conditions. A page that scores well on a fast connection may perform poorly on 3G.

::: warning
Remember to disable network conditioning when you are done testing. Leaving it active will slow down all traffic through the proxy, including your regular browsing.
:::
