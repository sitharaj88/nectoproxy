---
title: Traffic Inspection
description: Real-time HTTP/HTTPS traffic monitoring and inspection with NectoProxy.
---

# Traffic Inspection

Traffic inspection is the core capability of NectoProxy. Every HTTP and HTTPS request that flows through the proxy is captured, decoded, and displayed in the Web UI in real time, giving you complete visibility into your application's network activity.

## How MITM Interception Works

NectoProxy acts as a **Man-in-the-Middle (MITM)** proxy. When a client makes an HTTPS request through NectoProxy, the following process occurs:

1. **Client connects** to NectoProxy and issues a `CONNECT` request for the target host.
2. **NectoProxy establishes** a TLS connection to the target server and retrieves its certificate details.
3. **NectoProxy generates** a certificate for the target domain on the fly, signed by its own root Certificate Authority (CA).
4. **Client accepts** the generated certificate (because NectoProxy's root CA has been installed as a trusted authority on the client system).
5. **Two separate TLS sessions** are maintained -- one between the client and NectoProxy, and one between NectoProxy and the target server.
6. **NectoProxy decrypts, inspects, and re-encrypts** all traffic flowing between the two endpoints.

::: warning Important
For HTTPS inspection to work, you must install and trust NectoProxy's root CA certificate on the client device. See the [Certificate Setup](/certificate/) guide for detailed instructions.
:::

::: tip SSL Passthrough
If you do not want NectoProxy to decrypt traffic for certain domains (e.g., banking sites or domains with certificate pinning), you can configure [SSL Passthrough](./ssl-passthrough) to let that traffic flow through untouched.
:::

## The Traffic List

The main view in NectoProxy is the traffic list, which displays all captured requests in a scrollable table. Each row shows key information at a glance:

| Column | Description |
|---|---|
| **#** | Sequential request number |
| **Method** | HTTP method (GET, POST, PUT, DELETE, PATCH, etc.) |
| **Status** | HTTP response status code with color coding |
| **Host** | Target hostname |
| **Path** | Request URL path and query string |
| **Content Type** | Response content type (e.g., `application/json`) |
| **Size** | Response body size |
| **Duration** | Total round-trip time |
| **Protocol** | HTTP version and whether TLS was used |

### Virtualized Rendering

The traffic list uses **virtualized scrolling** to handle thousands of captured entries without degrading UI performance. Only the rows currently visible in the viewport are rendered in the DOM. This means you can capture tens of thousands of requests in a single session without the UI slowing down.

::: details How Virtualization Works
Rather than rendering every captured request as a DOM element, NectoProxy calculates which rows are visible based on the scroll position and viewport height. Only those rows are mounted in the DOM, with placeholder elements above and below to maintain correct scroll behavior. As you scroll, rows are recycled and re-populated with new data. This approach keeps memory usage and rendering cost constant regardless of how many entries have been captured.
:::

## Request & Response Details Panel

Clicking on any entry in the traffic list opens the details panel, which provides a comprehensive view of the selected request and response.

### Headers Tab

Displays all request and response headers in a structured, readable format.

**Request headers** include:
- Method, URL, and HTTP version
- Host, User-Agent, Accept, Content-Type
- Authorization, Cookie, and all custom headers

**Response headers** include:
- Status code and reason phrase
- Content-Type, Content-Length, Content-Encoding
- Set-Cookie, Cache-Control, and all other response headers

### Body Tab

The body tab renders request and response bodies with **automatic syntax highlighting** based on the content type:

| Content Type | Highlighting |
|---|---|
| `application/json` | JSON with collapsible tree view |
| `application/xml`, `text/xml` | XML syntax highlighting |
| `text/html` | HTML syntax highlighting |
| `application/javascript`, `text/javascript` | JavaScript syntax highlighting |
| `text/css` | CSS syntax highlighting |
| Plain text | No highlighting, monospaced font |
| Binary data | Hex dump view |

::: tip Body Size Truncation
For performance reasons, very large response bodies are truncated in the UI display. The full body is still captured and available for export. A notice is displayed when truncation occurs, along with the actual body size.
:::

### Automatic Decompression

NectoProxy automatically decompresses response bodies that use standard compression encodings:

- **gzip** -- The most common HTTP compression format
- **deflate** -- The raw deflate compression algorithm
- **Brotli** (`br`) -- Google's modern compression format, increasingly used by CDNs

The decompressed content is what you see in the body tab. The original `Content-Encoding` header is preserved in the headers tab so you can verify what compression was used.

### Timing Tab

The timing tab breaks down the lifecycle of each request into individual phases:

```
DNS Lookup    |----|
TCP Connect         |------|
TLS Handshake              |--------|
Request Send                        |--|
Waiting (TTFB)                         |------------|
Content Download                                     |------|
```

Each phase shows its duration in milliseconds, giving you precise insight into where time is being spent. This is invaluable for diagnosing slow requests -- whether the bottleneck is DNS resolution, TLS negotiation, server processing time, or download speed.

### TLS Tab

For HTTPS requests, the TLS tab displays certificate and connection details:

- **Protocol version** (TLS 1.2, TLS 1.3)
- **Cipher suite** used for the connection
- **Server certificate** details (subject, issuer, validity dates, serial number)
- **Certificate chain** information

## Filtering Traffic

NectoProxy provides several ways to filter the traffic list so you can focus on the requests that matter.

### Filter Bar

The filter bar at the top of the traffic list supports filtering by multiple criteria simultaneously:

| Filter | Example | Description |
|---|---|---|
| **Method** | `GET`, `POST` | Show only requests with the specified HTTP method |
| **Status** | `200`, `4xx`, `5xx` | Filter by exact status code or status class |
| **URL** | `/api/users` | Match requests whose URL contains the specified string |
| **Host** | `api.example.com` | Show only requests to a specific host |
| **Content Type** | `application/json` | Filter by response content type |

Filters can be combined. For example, you can filter for `POST` requests to `api.example.com` that returned a `500` status code.

### Quick Filters

Click on any value in the traffic list (such as a hostname, status code, or method) to instantly apply it as a filter. This is the fastest way to narrow down traffic when investigating a specific issue.

### Example: Debugging API Errors

Suppose your application is experiencing intermittent 500 errors from your API:

1. Set the **Host** filter to `api.example.com`
2. Set the **Status** filter to `5xx`
3. The traffic list now shows only failed API requests
4. Click on an entry to inspect the response body for error details
5. Check the timing tab to see if the errors correlate with slow response times

## WebSocket Traffic

NectoProxy also captures WebSocket upgrade requests. When a WebSocket connection is established, it appears in the traffic list with a special `WS` or `WSS` indicator. See [WebSocket Support](./websocket-support) for complete details on WebSocket frame inspection.

## Performance Considerations

::: tip Best Practices for High-Volume Traffic
- Use filters to narrow the display when capturing large amounts of traffic
- Clear completed sessions when you no longer need the data
- Enable [SSL Passthrough](./ssl-passthrough) for domains you do not need to inspect to reduce processing overhead
- The virtualized list handles thousands of entries efficiently, but keeping captured data to relevant traffic improves your debugging workflow
:::
