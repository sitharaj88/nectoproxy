# WebSocket Frames API

The WebSocket Frames API provides access to captured WebSocket message frames. When NectoProxy intercepts a WebSocket connection, individual frames (messages, pings, pongs, close frames) are recorded and can be retrieved through this API.

## Endpoints Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/websocket/:trafficId/frames` | Get frames for a WebSocket connection |
| `GET` | `/api/websocket/frame/:id` | Get a specific frame |
| `GET` | `/api/websocket/:trafficId/count` | Get frame count for a connection |
| `DELETE` | `/api/websocket/:trafficId/frames` | Delete all frames for a connection |
| `POST` | `/api/websocket/:trafficId/send` | Inject a frame into a live connection |

---

## Get WebSocket Frames

```
GET /api/websocket/:trafficId/frames
```

Retrieve all captured WebSocket frames for a specific traffic entry (WebSocket connection).

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `trafficId` | `string` | Traffic entry ID of the WebSocket connection |

### Query Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `limit` | `number` | `100` | Maximum number of frames to return |

### Example Request

```bash
curl "http://localhost:8889/api/websocket/traffic-uuid-1/frames?limit=50"
```

### Response `200 OK`

```json
[
  {
    "id": "frame-uuid-1",
    "trafficId": "traffic-uuid-1",
    "timestamp": 1709136000100,
    "direction": "client-to-server",
    "opcode": 1,
    "data": "eyJhY3Rpb24iOiJzdWJzY3JpYmUiLCJjaGFubmVsIjoiY2hhdCJ9",
    "isBinary": false,
    "length": 42
  },
  {
    "id": "frame-uuid-2",
    "trafficId": "traffic-uuid-1",
    "timestamp": 1709136000200,
    "direction": "server-to-client",
    "opcode": 1,
    "data": "eyJzdGF0dXMiOiJzdWJzY3JpYmVkIiwiY2hhbm5lbCI6ImNoYXQifQ==",
    "isBinary": false,
    "length": 45
  },
  {
    "id": "frame-uuid-3",
    "trafficId": "traffic-uuid-1",
    "timestamp": 1709136001000,
    "direction": "server-to-client",
    "opcode": 9,
    "data": null,
    "isBinary": false,
    "length": 0
  },
  {
    "id": "frame-uuid-4",
    "trafficId": "traffic-uuid-1",
    "timestamp": 1709136001001,
    "direction": "client-to-server",
    "opcode": 10,
    "data": null,
    "isBinary": false,
    "length": 0
  }
]
```

::: tip Data Encoding
The `data` field is **base64-encoded** for JSON transport. For text frames (opcode 1), decode the base64 string to get the original message content. For binary frames (opcode 2), the decoded data is raw binary.
:::

---

## Get Specific Frame

```
GET /api/websocket/frame/:id
```

Retrieve a single WebSocket frame by its ID.

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `id` | `string` | Frame ID |

### Example Request

```bash
curl http://localhost:8889/api/websocket/frame/frame-uuid-1
```

### Response `200 OK`

```json
{
  "id": "frame-uuid-1",
  "trafficId": "traffic-uuid-1",
  "timestamp": 1709136000100,
  "direction": "client-to-server",
  "opcode": 1,
  "data": "eyJhY3Rpb24iOiJzdWJzY3JpYmUiLCJjaGFubmVsIjoiY2hhdCJ9",
  "isBinary": false,
  "length": 42
}
```

### Error `404 Not Found`

```json
{
  "error": "Frame not found"
}
```

---

## Get Frame Count

```
GET /api/websocket/:trafficId/count
```

Get the total number of captured frames for a WebSocket connection.

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `trafficId` | `string` | Traffic entry ID of the WebSocket connection |

### Example Request

```bash
curl http://localhost:8889/api/websocket/traffic-uuid-1/count
```

### Response `200 OK`

```json
{
  "count": 156
}
```

---

## Delete Frames

```
DELETE /api/websocket/:trafficId/frames
```

Delete all captured frames for a WebSocket connection.

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `trafficId` | `string` | Traffic entry ID of the WebSocket connection |

### Example Request

```bash
curl -X DELETE http://localhost:8889/api/websocket/traffic-uuid-1/frames
```

### Response `200 OK`

```json
{
  "success": true
}
```

---

## Inject a Frame

```
POST /api/websocket/:trafficId/send
```

Inject a frame into a **live** WebSocket connection, in either direction. Use this to simulate server pushes or client messages without touching the real endpoints. The connection identified by `trafficId` must still be open.

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `trafficId` | `string` | Traffic entry ID of the open WebSocket connection |

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| `direction` | `string` | Yes | `"to-client"` (as if from the server) or `"to-server"` (as if from the client) |
| `data` | `string` | Yes | The payload. Plain text when `isBinary` is false; base64-encoded when `isBinary` is true |
| `isBinary` | `boolean` | No | Whether `data` is base64-encoded binary. Defaults to `false` |

### Example Request

```bash
# Send a text frame to the client
curl -X POST http://localhost:8889/api/websocket/traffic-uuid-1/send \
  -H "Content-Type: application/json" \
  -d '{"direction":"to-client","data":"{\"type\":\"ping\"}","isBinary":false}'

# Send a binary frame to the server (data is base64-encoded)
curl -X POST http://localhost:8889/api/websocket/traffic-uuid-1/send \
  -H "Content-Type: application/json" \
  -d '{"direction":"to-server","data":"iVBORw0KGgo=","isBinary":true}'
```

### Response `200 OK`

```json
{
  "success": true
}
```

### Error Responses

| Status | Condition |
|---|---|
| `400 Bad Request` | `direction` is not `to-client`/`to-server`, or `data` is not a string |
| `404 Not Found` | No open WebSocket connection exists for this traffic entry |
| `503 Service Unavailable` | The WebSocket send handler is not available (proxy not wired for injection) |

::: tip Binary payloads
For binary frames, base64-encode the raw bytes in the `data` field and set `isBinary` to `true`. NectoProxy decodes it back to binary before injecting the frame.
:::

---

## WebSocket Opcodes

WebSocket frames are identified by their opcode, which indicates the type of message:

| Opcode | Name | Description |
|---|---|---|
| `1` | Text | UTF-8 encoded text message |
| `2` | Binary | Binary data message |
| `8` | Close | Connection close frame |
| `9` | Ping | Ping control frame (heartbeat) |
| `10` | Pong | Pong control frame (response to ping) |

---

## Frame Direction

| Direction | Description |
|---|---|
| `client-to-server` | Message sent from the client (browser) to the server |
| `server-to-client` | Message sent from the server to the client |

---

## WebSocket Frame Schema

::: details Full WebSocketFrame Schema
| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique frame identifier |
| `trafficId` | `string` | Parent traffic entry ID (the WebSocket connection) |
| `timestamp` | `number` | Unix timestamp in milliseconds when the frame was captured |
| `direction` | `string` | `"client-to-server"` or `"server-to-client"` |
| `opcode` | `number` | WebSocket opcode: `1` (text), `2` (binary), `8` (close), `9` (ping), `10` (pong) |
| `data` | `string\|null` | Base64-encoded frame payload. `null` for frames without data. |
| `isBinary` | `boolean` | Whether the frame contains binary data |
| `length` | `number` | Size of the frame payload in bytes |
:::

---

## Example: Inspect Chat WebSocket

::: details Retrieve and decode WebSocket messages

```bash
# 1. Find the WebSocket traffic entry
curl "http://localhost:8889/api/traffic?methods=GET&search=ws" | jq '.entries[] | select(.protocol == "wss")'

# 2. Get the frame count
curl http://localhost:8889/api/websocket/TRAFFIC_ID/count

# 3. Retrieve frames
curl "http://localhost:8889/api/websocket/TRAFFIC_ID/frames?limit=10"

# 4. Decode a text frame's data (in bash)
echo "eyJhY3Rpb24iOiJzdWJzY3JpYmUiLCJjaGFubmVsIjoiY2hhdCJ9" | base64 -d
# Output: {"action":"subscribe","channel":"chat"}
```
:::

::: tip Real-Time Frame Monitoring
Use the Socket.IO `websocket:frame` event to monitor WebSocket frames in real time as they are captured. See the [Real-Time Events](./realtime-events) documentation for details.
:::
