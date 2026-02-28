# Traffic API

The Traffic API provides endpoints for listing, searching, inspecting, deleting, and replaying captured HTTP/HTTPS traffic entries.

## Endpoints Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/traffic` | List traffic entries with filtering |
| `GET` | `/api/traffic/search` | Global search across sessions |
| `GET` | `/api/traffic/stats/:sessionId` | Get session statistics |
| `GET` | `/api/traffic/:id` | Get a specific traffic entry |
| `DELETE` | `/api/traffic/:id` | Delete a specific entry |
| `DELETE` | `/api/traffic/session/:sessionId` | Clear all traffic in a session |
| `POST` | `/api/traffic/:id/replay` | Replay a captured request |
| `POST` | `/api/traffic/replay` | Execute a custom request |

---

## List Traffic Entries

```
GET /api/traffic
```

Retrieve traffic entries with optional filtering, sorting, and pagination.

### Query Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `sessionId` | `string` | - | Filter by session ID |
| `limit` | `number` | `1000` | Maximum entries to return |
| `offset` | `number` | `0` | Number of entries to skip |
| `search` | `string` | - | Search in URL, host, and path |
| `methods` | `string` | - | Comma-separated list of HTTP methods (e.g., `GET,POST`) |
| `statusCodes` | `string` | - | Comma-separated status codes (e.g., `200,404,500`) |
| `hosts` | `string` | - | Comma-separated hostnames |
| `sortField` | `string` | - | Sort field: `timestamp`, `duration`, `size`, `status`, `host`, `method` |
| `sortDirection` | `string` | `desc` | Sort direction: `asc` or `desc` |

### Example Request

```bash
curl "http://localhost:8889/api/traffic?sessionId=abc123&limit=50&methods=GET,POST&search=api"
```

### Response `200 OK`

```json
{
  "entries": [
    {
      "id": "entry-uuid-1",
      "sessionId": "session-uuid",
      "timestamp": 1709136000000,
      "method": "GET",
      "url": "https://api.example.com/users",
      "protocol": "https",
      "host": "api.example.com",
      "path": "/users",
      "requestHeaders": {
        "accept": "application/json",
        "user-agent": "Mozilla/5.0"
      },
      "requestBody": null,
      "requestBodySize": 0,
      "status": 200,
      "statusText": "OK",
      "responseHeaders": {
        "content-type": "application/json",
        "content-length": "1234"
      },
      "responseBody": "eyJkYXRhIjpbXX0=",
      "responseBodySize": 1234,
      "duration": 145,
      "remoteAddress": "93.184.216.34",
      "tlsVersion": "TLSv1.3",
      "error": null,
      "isComplete": true,
      "isMocked": false,
      "isBreakpointed": false,
      "isTruncated": false
    }
  ],
  "count": 1
}
```

::: tip Body Encoding
The `requestBody` and `responseBody` fields are **base64-encoded** in JSON responses. Decode them to get the original content. A `null` value indicates no body was present.
:::

---

## Global Search

```
GET /api/traffic/search
```

Search across all sessions with advanced filtering options.

### Query Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `q` | `string` | **required** | Search query string |
| `searchIn` | `string` | `url,headers,body` | Comma-separated search targets: `url`, `headers`, `body` |
| `methods` | `string` | - | Comma-separated HTTP methods to filter |
| `statusCodes` | `string` | - | Comma-separated status codes to filter |
| `limit` | `number` | `50` | Maximum results to return |
| `offset` | `number` | `0` | Number of results to skip |

### Example Request

```bash
curl "http://localhost:8889/api/traffic/search?q=authentication&searchIn=url,headers&limit=20"
```

### Response `200 OK`

```json
{
  "entries": [
    {
      "id": "entry-uuid-1",
      "sessionId": "session-uuid",
      "method": "POST",
      "url": "https://api.example.com/authentication/login",
      "status": 200,
      "..."
    }
  ],
  "total": 5,
  "sessionNames": {
    "session-uuid": "My Session"
  }
}
```

### Error `400 Bad Request`

```json
{
  "error": "Search query is required"
}
```

---

## Get Traffic Entry

```
GET /api/traffic/:id
```

Retrieve a single traffic entry with full details including request and response bodies.

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `id` | `string` | Traffic entry ID |

### Example Request

```bash
curl http://localhost:8889/api/traffic/entry-uuid-1
```

### Response `200 OK`

```json
{
  "id": "entry-uuid-1",
  "sessionId": "session-uuid",
  "timestamp": 1709136000000,
  "method": "POST",
  "url": "https://api.example.com/users",
  "protocol": "https",
  "host": "api.example.com",
  "path": "/users",
  "requestHeaders": {
    "content-type": "application/json",
    "authorization": "Bearer token123"
  },
  "requestBody": "eyJuYW1lIjoiSm9obiJ9",
  "requestBodySize": 15,
  "status": 201,
  "statusText": "Created",
  "responseHeaders": {
    "content-type": "application/json",
    "location": "/users/42"
  },
  "responseBody": "eyJpZCI6NDIsIm5hbWUiOiJKb2huIn0=",
  "responseBodySize": 24,
  "duration": 230,
  "remoteAddress": "93.184.216.34",
  "tlsVersion": "TLSv1.3",
  "error": null,
  "isComplete": true,
  "isMocked": false,
  "isBreakpointed": false,
  "isTruncated": false
}
```

### Error `404 Not Found`

```json
{
  "error": "Traffic entry not found"
}
```

---

## Get Session Statistics

```
GET /api/traffic/stats/:sessionId
```

Retrieve aggregate statistics for a capture session.

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `sessionId` | `string` | Session ID |

### Example Request

```bash
curl http://localhost:8889/api/traffic/stats/session-uuid
```

### Response `200 OK`

```json
{
  "totalRequests": 142,
  "completedRequests": 140,
  "failedRequests": 2,
  "totalBytes": 2457600,
  "avgDuration": 185.5
}
```

::: details Response Field Descriptions
| Field | Type | Description |
|---|---|---|
| `totalRequests` | `number` | Total number of requests captured |
| `completedRequests` | `number` | Requests that received a response |
| `failedRequests` | `number` | Requests that resulted in errors |
| `totalBytes` | `number` | Total size of all request and response bodies in bytes |
| `avgDuration` | `number` | Average request duration in milliseconds |
:::

---

## Delete Traffic Entry

```
DELETE /api/traffic/:id
```

Delete a single traffic entry.

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `id` | `string` | Traffic entry ID |

### Example Request

```bash
curl -X DELETE http://localhost:8889/api/traffic/entry-uuid-1
```

### Response `200 OK`

```json
{
  "success": true
}
```

### Error `404 Not Found`

```json
{
  "error": "Traffic entry not found"
}
```

---

## Clear Session Traffic

```
DELETE /api/traffic/session/:sessionId
```

Delete all traffic entries for a given session.

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `sessionId` | `string` | Session ID |

### Example Request

```bash
curl -X DELETE http://localhost:8889/api/traffic/session/session-uuid
```

### Response `200 OK`

```json
{
  "success": true
}
```

::: warning Irreversible
This operation permanently deletes all traffic data for the session. It cannot be undone.
:::

---

## Replay a Captured Request

```
POST /api/traffic/:id/replay
```

Re-send a previously captured request, optionally with modifications. The response includes the new result and a comparison with the original.

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `id` | `string` | Traffic entry ID to replay |

### Request Body (optional modifications)

```json
{
  "method": "POST",
  "url": "https://api.example.com/users/updated",
  "headers": {
    "Authorization": "Bearer new-token"
  },
  "body": "{\"name\": \"Updated\"}"
}
```

All fields are optional. Omitted fields retain their original values from the captured request.

### Example Request

```bash
curl -X POST http://localhost:8889/api/traffic/entry-uuid-1/replay \
  -H "Content-Type: application/json" \
  -d '{"headers": {"Authorization": "Bearer new-token"}}'
```

### Response `200 OK`

```json
{
  "result": {
    "status": 200,
    "statusText": "OK",
    "headers": {
      "content-type": "application/json"
    },
    "body": "eyJzdWNjZXNzIjp0cnVlfQ==",
    "duration": 198
  },
  "comparison": {
    "statusChanged": false,
    "headersChanged": true,
    "bodyChanged": true
  },
  "originalId": "entry-uuid-1"
}
```

### Error `404 Not Found`

```json
{
  "error": "Traffic entry not found"
}
```

---

## Execute Custom Request

```
POST /api/traffic/replay
```

Send a custom HTTP request through the proxy and receive the response. This does not require an existing traffic entry.

### Request Body

```json
{
  "method": "GET",
  "url": "https://api.example.com/health",
  "headers": {
    "Accept": "application/json"
  },
  "body": null,
  "timeout": 30000
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `method` | `string` | Yes | HTTP method (GET, POST, PUT, DELETE, etc.) |
| `url` | `string` | Yes | Full URL to send the request to |
| `headers` | `object` | No | Key-value pairs of request headers |
| `body` | `string` | No | Request body content |
| `timeout` | `number` | No | Request timeout in milliseconds |

### Example Request

```bash
curl -X POST http://localhost:8889/api/traffic/replay \
  -H "Content-Type: application/json" \
  -d '{
    "method": "POST",
    "url": "https://httpbin.org/post",
    "headers": {"Content-Type": "application/json"},
    "body": "{\"key\": \"value\"}"
  }'
```

### Response `200 OK`

```json
{
  "status": 200,
  "statusText": "OK",
  "headers": {
    "content-type": "application/json",
    "content-length": "512"
  },
  "body": "eyJhcmdzIjp7fSwiZGF0YSI6IntcImtleVwiOiBcInZhbHVlXCJ9In0=",
  "duration": 342
}
```

### Error `400 Bad Request`

```json
{
  "error": "Method and URL are required"
}
```

---

## Traffic Entry Schema

::: details Full TrafficEntry Schema
| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique identifier |
| `sessionId` | `string` | Parent session ID |
| `timestamp` | `number` | Unix timestamp in milliseconds |
| `method` | `string` | HTTP method (GET, POST, PUT, etc.) |
| `url` | `string` | Full request URL |
| `protocol` | `string` | Protocol: `http`, `https`, `ws`, or `wss` |
| `host` | `string` | Request hostname |
| `path` | `string` | URL path |
| `requestHeaders` | `object` | Request headers as key-value pairs |
| `requestBody` | `string\|null` | Base64-encoded request body |
| `requestBodySize` | `number` | Request body size in bytes |
| `status` | `number\|null` | HTTP response status code |
| `statusText` | `string\|null` | HTTP response status text |
| `responseHeaders` | `object\|null` | Response headers as key-value pairs |
| `responseBody` | `string\|null` | Base64-encoded response body |
| `responseBodySize` | `number\|null` | Response body size in bytes |
| `duration` | `number\|null` | Request duration in milliseconds |
| `remoteAddress` | `string\|null` | Server IP address |
| `tlsVersion` | `string\|null` | TLS version used (e.g., `TLSv1.3`) |
| `error` | `string\|null` | Error message if request failed |
| `isComplete` | `boolean` | Whether the response has been fully received |
| `isMocked` | `boolean` | Whether the response was generated by a mock rule |
| `isBreakpointed` | `boolean` | Whether the request was paused by a breakpoint |
| `isTruncated` | `boolean` | Whether the body was truncated due to size limits |
:::
