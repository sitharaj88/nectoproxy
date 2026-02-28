---
title: HAR Export & Import
description: Export and import HTTP traffic using the industry-standard HAR format in NectoProxy.
---

# HAR Export & Import

NectoProxy supports the **HTTP Archive (HAR)** format for exporting and importing captured traffic. HAR is an industry-standard JSON format that lets you share captured network data with teammates, import it into other tools, and create persistent records of debugging sessions.

## What is HAR?

The **HTTP Archive (HAR)** format is a JSON-based specification for recording HTTP transactions. It was originally developed for the HTTP Archive project and has since become the standard interchange format for HTTP debugging tools.

NectoProxy implements **HAR 1.2**, the latest version of the specification. A HAR file contains:

- Complete request details (method, URL, headers, body, cookies)
- Complete response details (status, headers, body, content)
- Timing information (DNS, connect, TLS, send, wait, receive)
- Page and entry metadata
- Creator and browser information

::: details HAR 1.2 Structure Overview
```json
{
  "log": {
    "version": "1.2",
    "creator": {
      "name": "NectoProxy",
      "version": "1.0.0"
    },
    "entries": [
      {
        "startedDateTime": "2025-01-15T10:30:00.000Z",
        "time": 245,
        "request": {
          "method": "GET",
          "url": "https://api.example.com/v1/users",
          "httpVersion": "HTTP/1.1",
          "headers": [...],
          "queryString": [...],
          "cookies": [...],
          "headersSize": 320,
          "bodySize": 0
        },
        "response": {
          "status": 200,
          "statusText": "OK",
          "httpVersion": "HTTP/1.1",
          "headers": [...],
          "cookies": [...],
          "content": {
            "size": 1234,
            "mimeType": "application/json",
            "text": "{...}"
          },
          "headersSize": 250,
          "bodySize": 1234
        },
        "timings": {
          "dns": 12,
          "connect": 35,
          "ssl": 48,
          "send": 1,
          "wait": 132,
          "receive": 17
        }
      }
    ]
  }
}
```
:::

## Exporting to HAR

### Exporting a Full Session

Export all traffic in the current session to a single HAR file:

1. Open the **Export** menu in the NectoProxy toolbar
2. Select **Export Session as HAR**
3. Choose a filename and save location
4. The HAR file is generated and downloaded

The exported file includes every request/response pair captured in the current session, with full headers, bodies, and timing data.

### Exporting Selected Entries

Export only specific traffic entries:

1. Select the entries you want to export in the traffic list (use `Ctrl+Click` or `Shift+Click` for multi-select)
2. Right-click and choose **Export Selected as HAR**, or use the Export menu
3. The HAR file contains only the selected entries

::: tip
Exporting selected entries is useful when you want to share a specific API call or a particular sequence of requests without including all the noise from a full session.
:::

### What is Included in the Export

| Data | Included | Notes |
|---|---|---|
| Request method and URL | Yes | Full URL including query parameters |
| Request headers | Yes | All headers including cookies |
| Request body | Yes | For POST, PUT, PATCH requests |
| Response status | Yes | Status code and reason phrase |
| Response headers | Yes | All response headers |
| Response body | Yes | Full body content, decompressed |
| Timing data | Yes | DNS, connect, TLS, send, wait, receive |
| TLS information | Yes | Protocol version, cipher suite |
| WebSocket frames | Partial | Initial upgrade is included; individual frames are not part of HAR spec |

::: warning Sensitive Data
HAR files contain **all request and response data**, including authorization headers, cookies, session tokens, and any sensitive information in request/response bodies. Review the content of HAR files before sharing them. Consider removing or redacting sensitive information.
:::

## Importing HAR Files

### Importing a HAR File

Load traffic from a HAR file into NectoProxy for inspection:

1. Open the **Import** menu in the NectoProxy toolbar
2. Select **Import HAR File**
3. Choose the `.har` file from your filesystem
4. The imported entries appear in the traffic list

Imported entries are displayed in the traffic list just like live-captured traffic. You can inspect headers, bodies, timing information, and use all of NectoProxy's analysis features on the imported data.

### HAR Validation

When importing a HAR file, NectoProxy validates the file structure against the HAR 1.2 specification:

- **Valid HAR files** are imported immediately
- **HAR files with minor issues** (e.g., missing optional fields) are imported with warnings
- **Invalid or corrupt files** are rejected with an error message describing the issue

::: details Common Validation Issues
| Issue | Severity | Resolution |
|---|---|---|
| Missing `log.version` | Warning | Defaults to "1.2" |
| Missing `log.creator` | Warning | Uses "Unknown" as creator |
| Missing `entry.startedDateTime` | Warning | Uses import timestamp |
| Invalid JSON syntax | Error | Fix the JSON syntax in the file |
| Missing `log.entries` array | Error | Ensure the file has the correct HAR structure |
| Empty entries array | Warning | File is valid but contains no traffic data |
:::

## Sharing Captured Traffic

HAR files are the standard way to share captured network traffic with teammates or include in bug reports. Common sharing workflows include:

### For Bug Reports

1. Capture the traffic that demonstrates the bug
2. Select the relevant entries
3. Export as HAR
4. Attach the HAR file to the bug report
5. The engineer investigating the bug can import it into NectoProxy (or any HAR-compatible tool) to inspect the exact traffic

### For Code Reviews

When a code change affects API behavior, export the before/after traffic as HAR files and attach them to the pull request. Reviewers can import both files and use NectoProxy's [Request Comparison](./request-comparison) feature to see the differences.

### For Documentation

Export HAR files of expected API flows and include them in your API documentation or integration guides. These serve as executable examples that developers can import and inspect.

## Integration with Other Tools

HAR is an open standard supported by many tools. NectoProxy's HAR files are compatible with:

| Tool | Import | Export | Notes |
|---|---|---|---|
| **Chrome DevTools** | Yes | Yes | Network tab supports HAR import/export |
| **Firefox DevTools** | Yes | Yes | Network monitor supports HAR |
| **Charles Proxy** | Yes | Yes | Full HAR 1.2 support |
| **Fiddler** | Yes | Yes | Import and export HAR files |
| **Postman** | Yes | No | Import HAR as a collection |
| **Insomnia** | Yes | No | Import HAR files |
| **har-analyzer** | Yes | No | Online HAR analysis tool |
| **WebPageTest** | Yes | No | Analyze HAR for performance metrics |

::: tip Cross-Tool Workflow
A common workflow is to capture traffic in Chrome DevTools, export as HAR, import into NectoProxy for advanced analysis (rules, breakpoints, replay), and then re-export for sharing. The HAR format ensures data fidelity across all these tools.
:::

## Practical Examples

### Example 1: Debugging a Production Issue

A user reports that a specific API call is failing. To investigate:

1. Ask the user to export a HAR file from their browser's DevTools
2. Import the HAR file into NectoProxy
3. Inspect the failing request's headers, body, and timing
4. Use the information to reproduce and fix the issue locally

### Example 2: Performance Baseline

Create a performance baseline for your application:

1. Open your application and navigate through key user flows
2. Export the full session as a HAR file
3. Save the HAR file as a baseline with a descriptive name (e.g., `baseline-2025-01-15.har`)
4. After making optimizations, repeat the process and compare timing data between the baseline and current HAR files

### Example 3: API Regression Testing

Verify that a backend deployment has not changed API behavior:

1. Before the deployment, capture and export API traffic as a HAR file
2. After the deployment, replay the same requests using [Request Replay](./request-replay)
3. Export the replayed traffic as a new HAR file
4. Compare the two HAR files to identify any changes in response bodies, headers, or status codes

---

::: info
HAR files can become large when capturing traffic with large response bodies (images, videos, large JSON payloads). NectoProxy includes response body content in exports by default. For large sessions, consider exporting only selected entries or using the session export options to exclude binary content.
:::
