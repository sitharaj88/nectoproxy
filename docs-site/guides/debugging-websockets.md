# Debugging WebSockets

**Difficulty:** Intermediate | **Time:** 10 minutes

This tutorial shows you how to inspect WebSocket connections and their individual frames using NectoProxy. WebSockets are used for real-time communication in chat applications, live dashboards, multiplayer games, and collaborative tools. Debugging them requires specialized tooling, and NectoProxy provides it.

## Prerequisites

- NectoProxy installed and running
- CA certificate installed in your browser
- Browser configured to use the proxy (port 8888)
- An application that uses WebSockets

## How WebSocket Proxying Works

When your browser opens a WebSocket connection through NectoProxy:

1. The browser sends an HTTP `Upgrade` request (the WebSocket handshake).
2. NectoProxy intercepts this request and establishes a WebSocket connection to the upstream server.
3. NectoProxy acts as a relay, forwarding frames in both directions while capturing a copy of each frame.
4. The connection appears in the NectoProxy traffic list with the protocol column showing **WS** (for `ws://`) or **WSS** (for `wss://`).

## Step 1: Configure Your Proxy

Ensure NectoProxy is running and your browser is configured to use it:

```bash
nectoproxy start
```

The proxy captures WebSocket connections that pass through it automatically. No additional configuration is needed.

## Step 2: Open Your WebSocket Application

Open the application that uses WebSockets in your browser. For example:

- A chat application
- A real-time dashboard
- A live notification feed
- A collaborative editing tool

If you do not have a WebSocket application handy, you can test with a simple example:

```javascript
// Open your browser console and run:
const ws = new WebSocket('wss://echo.websocket.org');
ws.onopen = () => {
  console.log('Connected');
  ws.send('Hello NectoProxy!');
};
ws.onmessage = (event) => console.log('Received:', event.data);
```

## Step 3: Find WebSocket Traffic

In the NectoProxy traffic list:

1. Look for entries where the **Protocol** column shows **WS** or **WSS**.
2. Alternatively, the **Status** column will show **101** (Switching Protocols) for the initial WebSocket handshake.
3. The **Method** column typically shows **GET** (the initial upgrade request).

::: tip
Use the filter bar at the top of the traffic list to filter by protocol. Type `ws` or `wss` to show only WebSocket connections, reducing noise from regular HTTP traffic.
:::

## Step 4: View WebSocket Frames

Click on a WebSocket entry in the traffic list to open the detail panel. You will see:

### Connection Details

The request tab shows the initial WebSocket handshake:

- **URL:** The WebSocket endpoint (e.g., `wss://api.example.com/socket`)
- **Request Headers:** Including `Upgrade: websocket`, `Connection: Upgrade`, `Sec-WebSocket-Key`, and `Sec-WebSocket-Version`
- **Status:** `101 Switching Protocols`

### Frame List

The WebSocket frames tab shows all messages exchanged over the connection:

| Column | Description |
|--------|-------------|
| **Timestamp** | When the frame was sent or received |
| **Direction** | Arrow indicating client-to-server or server-to-client |
| **Opcode** | The WebSocket frame type (see table below) |
| **Data** | The frame payload (text or binary) |
| **Length** | Size of the frame data in bytes |

## Step 5: Understanding Frame Data

### Frame Direction

Each frame has a direction indicator:

| Symbol | Meaning |
|--------|---------|
| Client-to-Server | Message sent from the browser to the server |
| Server-to-Client | Message sent from the server to the browser |

### Frame Opcodes

WebSocket frames have an opcode that indicates the type of data:

| Opcode | Name | Description |
|--------|------|-------------|
| `1` | Text | UTF-8 text data (most common for JSON APIs) |
| `2` | Binary | Binary data (used for file transfers, protobuf, etc.) |
| `8` | Close | Connection close frame |
| `9` | Ping | Keep-alive ping from either side |
| `10` | Pong | Response to a ping |

### Reading Frame Data

- **Text frames (opcode 1):** Displayed as readable text. JSON messages are formatted for easy reading.
- **Binary frames (opcode 2):** Displayed as base64-encoded data. The `isBinary` flag is set to `true`.
- **Control frames (8, 9, 10):** Usually have minimal or no payload.

::: details Example: Chat Application Frames
A typical chat application might show frames like this:

```
[Client -> Server] {"type": "message", "text": "Hello!", "room": "general"}
[Server -> Client] {"type": "message", "from": "alice", "text": "Hello!", "room": "general", "timestamp": 1706900000}
[Server -> Client] {"type": "presence", "user": "bob", "status": "online"}
[Client -> Server] {"type": "typing", "room": "general"}
```

Each of these is a separate WebSocket text frame captured by NectoProxy.
:::

## Step 6: Filter WebSocket Traffic

To focus on WebSocket connections in a busy traffic list:

- **Filter by protocol:** Use the filter bar and type `ws` or `wss`.
- **Filter by status:** Filter for status `101` to find WebSocket handshakes.
- **Filter by URL pattern:** Enter part of the WebSocket endpoint URL.

## Common WebSocket Issues and Solutions

### Connection Fails to Establish

**Symptom:** No `101 Switching Protocols` response; you see a `400` or `403` instead.

**Possible causes:**
- The server rejected the WebSocket handshake.
- The `Origin` header is not allowed by the server's CORS policy.
- A required authentication token is missing from the handshake request.

**Debugging with NectoProxy:** Check the request headers in the handshake to verify the `Origin`, `Cookie`, and any authentication headers are correct.

### Connection Drops Unexpectedly

**Symptom:** A close frame (opcode 8) appears, or frames stop flowing.

**Possible causes:**
- Server-side timeout due to inactivity (no ping/pong).
- Network interruption.
- Server-side error.

**Debugging with NectoProxy:** Look for the close frame's data payload, which may contain a close code and reason. Check the timing of the last frames to determine if inactivity caused the disconnect.

### Messages Are Not Received

**Symptom:** Client sends messages but receives no response, or vice versa.

**Possible causes:**
- The server is not handling the message format correctly.
- Subscription or room setup was not completed.
- Serialization mismatch (client sends JSON, server expects protobuf).

**Debugging with NectoProxy:** Compare the sent and received frames. Verify that the message format matches the server's expected schema.

### High Latency on Messages

**Symptom:** Messages take a long time to appear.

**Debugging with NectoProxy:** Compare the timestamps of client-to-server and server-to-client frames. Large gaps indicate server-side processing delays. Consistent small gaps are normal network latency.

## Tips

- **Keep the traffic list focused** by pausing recording when you are not actively debugging, then resuming when you want to capture a specific interaction.
- **Use annotations** to mark interesting WebSocket entries for later review. Right-click on an entry and add a note.
- **WebSocket connections persist** across many frames. A single entry in the traffic list may have hundreds or thousands of frames. Use the frame list's scroll or search to find specific messages.
- **Binary WebSocket data** (like protobuf or MessagePack) will appear as base64-encoded strings. You will need an external tool to decode the binary format.
