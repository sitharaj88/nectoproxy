---
title: WebSocket Support
description: Inspect WebSocket connections and frames in real time with NectoProxy.
---

# WebSocket Support

NectoProxy provides full inspection capabilities for **WebSocket (WS)** and **secure WebSocket (WSS)** connections. WebSocket traffic is captured, decoded, and displayed alongside regular HTTP traffic, giving you complete visibility into bidirectional real-time communication channels.

## Overview

WebSocket is a protocol that enables persistent, full-duplex communication between a client and a server over a single TCP connection. Unlike HTTP's request-response model, WebSocket allows both the client and server to send messages at any time without waiting for a response.

NectoProxy intercepts the initial HTTP upgrade handshake and then monitors all subsequent WebSocket frames flowing in both directions.

## How WebSocket Capture Works

1. **Client sends an HTTP upgrade request** -- The client initiates a WebSocket connection by sending an HTTP `GET` request with `Upgrade: websocket` and `Connection: Upgrade` headers.
2. **NectoProxy captures the upgrade** -- The upgrade request appears in the traffic list like any other HTTP request, with a `101 Switching Protocols` response.
3. **Connection is established** -- Once the handshake completes, a persistent WebSocket connection is established.
4. **Frames are captured** -- NectoProxy intercepts and records every frame sent through the connection in both directions.
5. **Frames are displayed** -- Each frame appears in the detail panel for the WebSocket connection, showing content, direction, type, and timestamp.

::: tip
WebSocket connections appear in the traffic list with a distinctive **WS** or **WSS** badge to differentiate them from regular HTTP requests.
:::

## Frame Types

NectoProxy captures and displays all standard WebSocket frame types:

### Text Frames

Text frames carry UTF-8 encoded string data. This is the most common frame type for WebSocket APIs that exchange JSON, XML, or plain text messages.

```json
{
  "type": "chat.message",
  "data": {
    "userId": 42,
    "text": "Hello, world!",
    "timestamp": "2025-01-15T10:30:00Z"
  }
}
```

Text frame content is displayed with syntax highlighting when the content is recognized as JSON or another structured format.

### Binary Frames

Binary frames carry arbitrary binary data. NectoProxy displays binary frame content in a hex dump view with both hexadecimal and ASCII representations:

```
00000000  89 50 4e 47 0d 0a 1a 0a  00 00 00 0d 49 48 44 52  |.PNG........IHDR|
00000010  00 00 00 40 00 00 00 40  08 06 00 00 00 aa 69 71  |...@...@......iq|
```

### Ping Frames

Control frames sent to check if the connection is still alive. NectoProxy logs ping frames with their optional payload data.

### Pong Frames

Response frames sent in reply to a ping. Pong frames must carry the same payload as the ping they are responding to. NectoProxy logs these alongside the corresponding ping frames.

### Close Frames

Sent by either endpoint to initiate connection closure. Close frames include a status code and an optional reason string:

| Code | Meaning |
|---|---|
| 1000 | Normal closure |
| 1001 | Going away (e.g., server shutting down) |
| 1002 | Protocol error |
| 1003 | Unsupported data type |
| 1006 | Abnormal closure (no close frame received) |
| 1008 | Policy violation |
| 1011 | Unexpected server error |

## Direction Tracking

Every captured frame is tagged with its **direction**, making it easy to follow the conversation flow:

| Direction | Symbol | Description |
|---|---|---|
| **Client to Server** | `-->` | Messages sent from the client to the server |
| **Server to Client** | `<--` | Messages sent from the server to the client |

The frame list uses visual indicators (arrows or color coding) to distinguish direction at a glance, so you can quickly trace the sequence of a bidirectional conversation.

::: details Example: Chat Application Flow
```
[10:30:00.123]  -->  {"type": "join", "room": "general"}
[10:30:00.456]  <--  {"type": "joined", "room": "general", "users": 12}
[10:30:05.789]  -->  {"type": "message", "text": "Hello everyone!"}
[10:30:05.891]  <--  {"type": "message", "from": "user42", "text": "Hello everyone!"}
[10:30:10.234]  <--  {"type": "message", "from": "user7", "text": "Welcome!"}
[10:30:15.000]  -->  PING
[10:30:15.023]  <--  PONG
```
:::

## Opcode Information

Each WebSocket frame includes an **opcode** that identifies the frame type. NectoProxy displays this information for every captured frame:

| Opcode | Type | Description |
|---|---|---|
| `0x0` | Continuation | Part of a fragmented message |
| `0x1` | Text | UTF-8 text data |
| `0x2` | Binary | Binary data |
| `0x8` | Close | Connection close request |
| `0x9` | Ping | Keep-alive ping |
| `0xA` | Pong | Keep-alive pong |

Opcodes `0x3` through `0x7` are reserved for future non-control frames, and `0xB` through `0xF` are reserved for future control frames.

## Binary Data Display

When a WebSocket connection exchanges binary data, NectoProxy provides multiple views:

- **Hex view** -- Traditional hexadecimal dump with ASCII sidebar
- **Raw size** -- The byte count of the binary payload
- **Content detection** -- When possible, NectoProxy identifies the binary format (e.g., PNG, Protocol Buffers, MessagePack)

::: tip
For applications using Protocol Buffers, MessagePack, or other binary serialization formats over WebSocket, the hex view helps verify that the correct data is being transmitted even when you cannot parse the format directly.
:::

## Real-Time Frame Streaming

WebSocket frames are displayed in the NectoProxy UI **in real time** as they are exchanged. There is no buffering or delay -- each frame appears in the frame list immediately after it is intercepted. This is essential for debugging real-time features like:

- Live chat and messaging
- Real-time notifications
- Collaborative editing
- Live sports scores or financial tickers
- IoT sensor data streams
- Multiplayer game state synchronization

The frame list auto-scrolls to keep the most recent frame visible, with an option to pause auto-scrolling when you want to examine earlier frames.

## Frame Injection

The WebSocket viewer is no longer inspect-only. A **frame composer** lets you send (inject) your own frames into a live WebSocket connection, in either direction, without touching the client or server code.

This is invaluable for exercising message handlers, simulating server pushes, or reproducing edge cases that are hard to trigger from the real endpoints.

### Composing a Frame

1. Open a live WebSocket connection in the detail panel (the connection must still be open).
2. Use the **frame composer** to set:
   - **Direction** -- `to-client` (as if the server sent it) or `to-server` (as if the client sent it).
   - **Payload type** -- **text** (sent as UTF-8) or **binary** (entered as base64 and decoded before sending).
   - **Content** -- the frame payload.
3. Send the frame. It is injected into the live connection and also appears in the frame list, tagged as injected so you can distinguish it from captured traffic.

### Direction Semantics

| Direction | Effect |
|---|---|
| `to-client` | The frame is delivered to the client as though the server sent it |
| `to-server` | The frame is delivered to the origin server as though the client sent it |

::: tip Requires a live connection
Injection only works while the WebSocket connection is still open. If the connection has already closed, there is nothing to inject into and the request returns a `404`.
:::

::: details Under the hood
The composer calls `POST /api/websocket/:trafficId/send` with a JSON body of `{ direction, data, isBinary }`. Binary payloads are base64-encoded in `data` and decoded server-side before injection. See the [WebSocket Frames API](/api/websocket#inject-a-frame) for the full endpoint reference.
:::

## Filtering WebSocket Traffic

### In the Traffic List

Filter the main traffic list to show only WebSocket connections by using the content type filter or searching for `101` status code (Switching Protocols).

### Within a WebSocket Connection

Once you open a WebSocket connection's detail panel, you can filter the frame list by:

| Filter | Description |
|---|---|
| **Direction** | Show only client-to-server or server-to-client frames |
| **Frame type** | Show only text, binary, or control frames |
| **Content search** | Search for specific text within frame payloads |

## Practical Examples

### Debugging a Real-Time Chat Application

1. Open your chat application and configure it to use NectoProxy
2. Join a chat room and send a few messages
3. In NectoProxy, find the WebSocket connection in the traffic list (look for the `101` response or the WS badge)
4. Click to open the frame list
5. Observe the sequence of messages: join events, message broadcasts, presence updates
6. Use direction filtering to see only outgoing messages (client-to-server) to verify your client is sending the correct payloads

### Monitoring GraphQL Subscriptions

Many GraphQL implementations use WebSocket for subscriptions:

1. Start a GraphQL subscription in your application
2. Locate the WebSocket connection in NectoProxy
3. Observe the subscription initialization frames
4. Trigger events that should produce subscription updates
5. Verify that the server sends the expected data in real time

### Diagnosing Connection Drop Issues

If a WebSocket connection is dropping unexpectedly:

1. Capture the full lifecycle of the connection in NectoProxy
2. Look for close frames -- check the close code and reason
3. Monitor ping/pong frames to verify the keep-alive mechanism is functioning
4. Check for abnormal closure (code 1006) which indicates the connection was lost without a close handshake

---

::: info
WebSocket interception requires MITM for WSS connections, which means the NectoProxy root CA certificate must be installed on the client. For WS (unencrypted) connections, no certificate installation is necessary.
:::
