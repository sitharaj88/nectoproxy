---
title: Upstream Proxy
description: Chain NectoProxy with another upstream proxy for corporate environments, Tor, and VPN integration.
---

# Upstream Proxy

NectoProxy can be configured to forward all traffic through an **upstream proxy** rather than connecting directly to target servers. This is commonly known as **proxy chaining** and is essential in corporate environments, for routing through anonymizing networks, or when you need NectoProxy to work behind an existing proxy infrastructure.

## Overview

In a typical proxy configuration, the traffic flow is:

```
Client --> NectoProxy --> Target Server
```

With an upstream proxy configured, the flow becomes:

```
Client --> NectoProxy --> Upstream Proxy --> Target Server
```

NectoProxy handles the MITM interception and all its features (rules, breakpoints, inspection) locally, and then forwards the traffic through the upstream proxy to reach the target server.

## Supported Protocols

NectoProxy supports four upstream proxy protocols:

### HTTP Proxy

The most common proxy protocol. NectoProxy sends HTTP `CONNECT` requests to the upstream proxy for HTTPS traffic and direct HTTP requests for plain HTTP traffic.

```
Protocol:  HTTP
Host:      proxy.corp.example.com
Port:      8080
```

### HTTPS Proxy

Identical to HTTP proxy but the connection between NectoProxy and the upstream proxy is encrypted with TLS. This protects the proxy traffic from interception on the network between NectoProxy and the upstream proxy.

```
Protocol:  HTTPS
Host:      secure-proxy.corp.example.com
Port:      443
```

### SOCKS4

The SOCKS4 protocol provides a generic proxy mechanism that works at the TCP level. SOCKS4 supports TCP connections but does not support UDP or authentication.

```
Protocol:  SOCKS4
Host:      socks-proxy.example.com
Port:      1080
```

### SOCKS5

The most versatile SOCKS protocol. SOCKS5 supports TCP and UDP connections, IPv6 addresses, and username/password authentication. This is the protocol used by Tor and many VPN services.

```
Protocol:  SOCKS5
Host:      socks5-proxy.example.com
Port:      1080
```

::: tip Choosing a Protocol
- Use **HTTP/HTTPS** for standard corporate proxy environments
- Use **SOCKS5** for Tor routing, VPN integration, or when you need authentication with a generic proxy
- Use **SOCKS4** only for legacy proxy servers that do not support SOCKS5
:::

## Authentication

NectoProxy supports **proxy authentication** for upstream proxies that require credentials.

### HTTP/HTTPS Proxy Authentication

For HTTP and HTTPS upstream proxies, NectoProxy sends credentials using the `Proxy-Authorization` header with Basic authentication:

```
Proxy-Authorization: Basic dXNlcm5hbWU6cGFzc3dvcmQ=
```

### SOCKS5 Authentication

For SOCKS5 proxies, NectoProxy supports username/password authentication as defined in RFC 1929.

### Configuration

Set authentication credentials in the upstream proxy settings:

| Field | Description |
|---|---|
| **Username** | The proxy account username |
| **Password** | The proxy account password |

::: warning
Proxy credentials are stored in NectoProxy's configuration. Ensure that your NectoProxy instance is secured appropriately, especially in shared environments. Do not share configuration files that contain proxy credentials.
:::

## Bypass Rules

Not all traffic needs to go through the upstream proxy. **Bypass rules** let you specify domains or patterns that should be connected to directly, skipping the upstream proxy.

### Common Bypass Scenarios

| Pattern | Reason |
|---|---|
| `localhost` | Local development servers |
| `127.0.0.1` | Loopback traffic |
| `*.local` | Local network domains |
| `10.*` | Internal network (RFC 1918) |
| `192.168.*` | Internal network (RFC 1918) |
| `172.16.*` through `172.31.*` | Internal network (RFC 1918) |
| `*.corp.example.com` | Internal corporate services |

### Bypass Pattern Format

Bypass rules support:

- **Exact domains**: `internal.example.com`
- **Wildcard domains**: `*.internal.example.com`
- **IP addresses**: `192.168.1.100`
- **IP ranges**: `10.*`, `192.168.*`

::: details Example: Corporate Environment Configuration
In a corporate environment, you might configure:

```
Upstream Proxy:
  Protocol:   HTTP
  Host:       proxy.corp.example.com
  Port:       8080
  Username:   john.doe
  Password:   ********

Bypass Rules:
  - localhost
  - 127.0.0.1
  - *.corp.example.com
  - 10.*
  - 192.168.*
  - *.local
```

This routes all external traffic through the corporate proxy while keeping internal traffic direct.
:::

## Use Cases

### Corporate Proxy Environment

Most corporate networks require all internet traffic to pass through a corporate proxy server. Without upstream proxy support, NectoProxy would not be able to reach external servers.

**Configuration:**
1. Set the upstream proxy to your corporate proxy server
2. Add bypass rules for internal services
3. Set authentication credentials if required

NectoProxy functions normally within the corporate network, with all its features available. Traffic is inspected locally and then forwarded through the corporate proxy.

### Routing Through Tor

Use NectoProxy with the Tor network for anonymous traffic inspection:

**Configuration:**
```
Protocol:   SOCKS5
Host:       127.0.0.1
Port:       9050
```

::: warning
When routing through Tor, be aware of the significant latency increase. Tor routes traffic through multiple relays, which typically adds 500-2000 ms of latency per request. Adjust any timeout settings accordingly.
:::

### VPN Integration

Some VPN configurations expose a SOCKS proxy interface. NectoProxy can route traffic through the VPN's proxy to ensure traffic is encrypted and routed through the VPN tunnel.

**Configuration:**
```
Protocol:   SOCKS5
Host:       127.0.0.1
Port:       1080
```

### Multi-Layer Security Testing

For security testing scenarios, you might chain NectoProxy through a different proxy to reach a target network:

```
Client --> NectoProxy (inspect traffic) --> Upstream Proxy (network access) --> Target
```

This lets you use NectoProxy's inspection and modification features while relying on another proxy for network routing and access control.

### Geographic Testing

Route traffic through a proxy in a different geographic location to test geo-specific behavior:

```
Protocol:   SOCKS5
Host:       us-proxy.example.com
Port:       1080
```

This can be used to test CDN behavior, geo-restricted content, or locale-specific API responses.

## Configuration Through the UI

The upstream proxy is configured through the **Settings** panel in the NectoProxy Web UI.

### Settings Panel

1. Open **Settings** from the navigation bar
2. Navigate to the **Upstream Proxy** section
3. Toggle **Enable Upstream Proxy**
4. Fill in the proxy details:
   - Protocol (HTTP, HTTPS, SOCKS4, SOCKS5)
   - Host
   - Port
   - Username (optional)
   - Password (optional)
5. Add bypass rules as needed
6. Save the configuration

### Testing the Connection

After configuring the upstream proxy, send a test request through NectoProxy to verify connectivity. Check the traffic list for successful responses. If requests fail, check:

- The upstream proxy host and port are correct
- Authentication credentials are valid
- The upstream proxy is reachable from NectoProxy's network
- Bypass rules are not inadvertently excluding the test domain

## Interaction with Other Features

| Feature | Interaction |
|---|---|
| **Traffic Inspection** | Works normally. All inspection features are available regardless of upstream proxy configuration. |
| **Rules Engine** | Rules are applied before traffic is sent to the upstream proxy. |
| **Breakpoints** | Breakpoints pause traffic before it reaches the upstream proxy. |
| **SSL Passthrough** | Passthrough traffic is tunneled directly through the upstream proxy without MITM. |
| **DNS Mapping** | DNS mappings are applied before the upstream proxy connection. The proxy may perform its own DNS resolution. |
| **Network Conditioning** | Network conditioning is applied between the client and NectoProxy, not between NectoProxy and the upstream proxy. |

---

::: info
Upstream proxy settings are persisted across NectoProxy sessions. Your configuration is saved and automatically applied when you restart the proxy.
:::
