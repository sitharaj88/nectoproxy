# Chaining Proxies

**Difficulty:** Advanced | **Time:** 10 minutes

This tutorial explains how to configure NectoProxy to route its outbound traffic through an upstream proxy server. This is essential in corporate environments with mandatory HTTP proxies, for routing traffic through SOCKS5 tunnels, or for layered debugging setups.

## How Proxy Chaining Works

```
Browser  -->  NectoProxy  -->  Upstream Proxy  -->  Internet
  (client)    (MITM + UI)      (corporate/SSH)    (target server)
```

Without chaining, NectoProxy connects directly to target servers. With chaining, NectoProxy routes all outbound requests through the configured upstream proxy. NectoProxy still performs MITM decryption and provides the full debugging UI -- the upstream proxy simply handles the final hop.

## Supported Upstream Proxy Types

| Protocol | Description | Use Case |
|----------|-------------|----------|
| **HTTP** | Standard HTTP proxy (CONNECT for HTTPS) | Corporate proxies, Squid, other HTTP proxies |
| **HTTPS** | HTTP proxy over TLS | Encrypted proxy connections |
| **SOCKS4** | SOCKS version 4 proxy | Legacy SSH tunnels |
| **SOCKS5** | SOCKS version 5 proxy (with optional auth) | SSH tunnels, Tor, VPN gateways |

## Scenario 1: Corporate HTTP Proxy

Your company requires all internet traffic to pass through a corporate proxy. You want to use NectoProxy for debugging, but it needs to chain through the corporate proxy to reach external servers.

### Configuration Steps

1. Open the NectoProxy Web UI at `http://localhost:8889`.
2. Click the **gear icon** to open Settings.
3. In the Proxy Settings section, click **Configure** next to **Upstream Proxy**.
4. In the Upstream Proxy panel, configure:

   | Field | Value |
   |-------|-------|
   | **Enabled** | On |
   | **Protocol** | HTTP |
   | **Host** | `proxy.corporate.com` |
   | **Port** | `8080` |

5. If your corporate proxy requires authentication:

   | Field | Value |
   |-------|-------|
   | **Username** | `your-username` |
   | **Password** | `your-password` |

6. Click **Save**.

All outbound traffic from NectoProxy now routes through `proxy.corporate.com:8080`.

::: tip
You can find your corporate proxy settings in your system's proxy configuration, your company's IT documentation, or by checking environment variables like `HTTP_PROXY` and `HTTPS_PROXY`.
:::

## Scenario 2: SOCKS5 Proxy (SSH Tunnel)

You have an SSH tunnel providing SOCKS5 access to a remote network. You want to use NectoProxy to debug traffic flowing through that tunnel.

### Setting Up the SSH Tunnel

First, create a SOCKS5 proxy via SSH:

```bash
# Create a SOCKS5 proxy on local port 1080
ssh -D 1080 -N user@remote-server.example.com
```

This creates a SOCKS5 proxy listening on `localhost:1080`.

### Configure NectoProxy

1. Open Settings > Upstream Proxy.
2. Configure:

   | Field | Value |
   |-------|-------|
   | **Enabled** | On |
   | **Protocol** | SOCKS5 |
   | **Host** | `127.0.0.1` |
   | **Port** | `1080` |

3. Click **Save**.

Now all traffic from NectoProxy routes through your SSH tunnel, and you can inspect it in the Web UI.

::: details Using Tor as an Upstream Proxy
Tor's local proxy uses SOCKS5 on port 9050 by default. To route NectoProxy traffic through Tor:

| Field | Value |
|-------|-------|
| **Protocol** | SOCKS5 |
| **Host** | `127.0.0.1` |
| **Port** | `9050` |

Note that routing through Tor adds significant latency. Also be aware that Tor exit nodes may block or modify traffic. This setup is primarily useful for testing how your application behaves when accessed through Tor.
:::

## Scenario 3: Bypass Rules for Internal Domains

When using an upstream proxy, you may want some traffic to bypass the proxy and connect directly. For example, internal services on your company's network may not be reachable through the corporate proxy.

### Configure Bypass Rules

In the Upstream Proxy configuration panel:

1. Locate the **Bypass Rules** section.
2. Add domains or patterns that should skip the upstream proxy:

```
localhost
127.0.0.1
*.internal.company.com
10.0.0.*
192.168.*.*
*.local
```

Each line is a pattern. Wildcards (`*`) are supported.

### How Bypass Works

| Request Target | Upstream Proxy? | Why |
|---------------|:---------------:|-----|
| `api.example.com` | Yes | Does not match any bypass rule |
| `app.internal.company.com` | No | Matches `*.internal.company.com` |
| `localhost:3000` | No | Matches `localhost` |
| `10.0.0.5:8080` | No | Matches `10.0.0.*` |

::: warning
Bypass rules use simple string matching with wildcard support. They match against the hostname (not the full URL). If your internal services use IP addresses, add both the IP patterns and the hostnames to the bypass list.
:::

## Verifying the Configuration

After configuring the upstream proxy, verify it works:

1. Open a website through your browser (proxied through NectoProxy).
2. Check the NectoProxy traffic list -- requests should appear normally.
3. If the upstream proxy is unreachable, you will see `502 Bad Gateway` errors in the traffic list.

### Troubleshooting Chain Issues

| Symptom | Likely Cause | Solution |
|---------|-------------|---------|
| All requests return 502 | Upstream proxy is unreachable | Verify host and port, check if proxy is running |
| Authentication errors (407) | Wrong credentials | Double-check username and password |
| Some sites work, others do not | Upstream proxy blocks certain domains | Check upstream proxy's allow/deny lists |
| HTTPS sites fail but HTTP works | Upstream proxy does not support CONNECT | Switch to SOCKS5 or contact proxy administrator |
| Extremely slow connections | Proxy chain adds latency | Expected with multi-hop routing; consider bypassing for non-essential domains |

## Settings API

You can also configure the upstream proxy programmatically:

```bash
# Configure HTTP upstream proxy
curl -X PUT http://localhost:8889/api/upstream-proxy \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "type": "http",
    "host": "proxy.corporate.com",
    "port": 8080,
    "auth": {
      "username": "user",
      "password": "pass"
    },
    "bypassRules": ["localhost", "*.internal.com"]
  }'

# Disable upstream proxy
curl -X PUT http://localhost:8889/api/upstream-proxy \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```

## Tips

- **Test bypass rules carefully.** An incorrect bypass rule might route internal traffic through the external proxy (a security concern) or fail to route external traffic through the proxy (a connectivity issue).
- **Use SOCKS5 over SOCKS4** when possible. SOCKS5 supports authentication and DNS resolution through the proxy, which are important for security and functionality.
- **Monitor for 407 errors.** A `407 Proxy Authentication Required` response means the upstream proxy rejected your credentials.
- **Chain order matters.** Your browser connects to NectoProxy, which connects to the upstream proxy. NectoProxy handles MITM decryption regardless of the upstream proxy -- the upstream proxy only sees encrypted CONNECT tunnels for HTTPS traffic.
