---
title: HTTP/2 & gRPC
description: Experimental HTTP/2 interception in NectoProxy, including gRPC forwarding over end-to-end HTTP/2 with trailer relay.
---

# HTTP/2 & gRPC

NectoProxy includes **experimental HTTP/2 interception**. It is disabled by default and enabled with the `--http2` flag:

```bash
nectoproxy start --http2
```

::: warning Experimental
HTTP/2 interception is under active development. It works well for common request/response traffic and unary gRPC calls, but has the known limitations listed below. Leave it off unless you specifically need it.
:::

## How It Works

When `--http2` is enabled, NectoProxy terminates TLS with an HTTP/2 secure server that also has `allowHTTP1` turned on. This means:

- **HTTP/2 clients** negotiate `h2` over ALPN and are handled natively.
- **HTTP/1.1 clients** that do not negotiate `h2` still work through the same server -- enabling HTTP/2 never breaks a plain HTTP/1.1 client.

For ordinary (non-gRPC) traffic, an intercepted HTTP/2 request is forwarded to the origin **over HTTP/1.1**, and the response is translated back to the h2 client. Pseudo-headers (`:method`, `:status`, ...) and hop-by-hop headers are handled automatically so the two protocol versions bridge cleanly.

## gRPC

gRPC requires HTTP/2 end-to-end -- it depends on h2 framing and trailers (the `grpc-status` trailer in particular). So when an intercepted h2 request has a `content-type` starting with `application/grpc`, NectoProxy does **not** downgrade it. Instead it:

1. Opens an HTTP/2 connection to the origin.
2. Forwards the request with its pseudo-headers.
3. Relays the response body and **trailers** (including `grpc-status`) back to the client.

This keeps unary gRPC calls working transparently through the proxy while they are captured for inspection.

### Protobuf decoding in the UI

gRPC payloads are Protocol Buffers. NectoProxy's UI decoding is **best-effort** -- it will show the raw framed bytes and attempt a generic decode, but there is **no `.proto` upload yet**, so field names and precise types are not resolved. Use the hex/raw view to verify message contents.

## Known Limitations

::: warning Current constraints
- **gRPC is unary-only.** Server-streaming and bidirectional-streaming RPCs are not streamed frame-by-frame yet -- only unary (single request / single response) calls are handled reliably.
- **Rules and breakpoints do not apply to gRPC responses.** gRPC requests are forwarded over end-to-end HTTP/2 on a separate path, so the [Rules Engine](./rules-engine) and [Breakpoints](./breakpoints) are bypassed for them.
- **gRPC through an upstream proxy falls back to HTTP/1.1.** When an [upstream proxy](./upstream-proxy) is configured, the end-to-end h2 path is not used, so gRPC calls are downgraded and may not behave correctly.
- **Best-effort protobuf decoding.** No `.proto` schema upload; field names are not resolved.
:::

## What Works

- HTTP/2 clients captured alongside HTTP/1.1 traffic in the same session.
- HTTP/1.1 clients continue to work when `--http2` is enabled (via `allowHTTP1`).
- Ordinary h2 request/response traffic, forwarded to origins over HTTP/1.1.
- Unary gRPC calls, forwarded over end-to-end HTTP/2 with `grpc-status` trailers relayed.

## See Also

- [`nectoproxy start`](/cli/start) -- the `--http2` flag
- [WebSocket Support](./websocket-support) -- inspecting another persistent-connection protocol
- [Traffic Inspection](./traffic-inspection) -- viewing captured requests and responses
