---
title: DNS Mapping
description: Override DNS resolution for specific domains with NectoProxy's custom DNS mapping.
---

# DNS Mapping

DNS Mapping lets you override DNS resolution for specific domains, directing traffic to custom IP addresses without modifying your system's hosts file or DNS settings. This is a powerful tool for development and testing workflows where you need to route traffic to alternative servers.

## What is DNS Mapping?

When NectoProxy receives a request for a domain, it normally resolves that domain using standard DNS to determine the server's IP address. DNS Mapping overrides this behavior for specific domains, telling NectoProxy to connect to a specific IP address instead of the DNS-resolved one.

```
Without DNS Mapping:
  Request for api.example.com
  --> DNS resolves to 93.184.216.34 (production)
  --> NectoProxy connects to 93.184.216.34

With DNS Mapping (api.example.com -> 192.168.1.100):
  Request for api.example.com
  --> DNS resolution is skipped
  --> NectoProxy connects to 192.168.1.100 (local/staging)
```

The client remains unaware of the mapping. From the client's perspective, it is communicating with `api.example.com` as usual. The TLS certificate presented by NectoProxy still matches `api.example.com` (since NectoProxy generates certificates for the requested hostname), and all request headers including the `Host` header remain unchanged.

::: tip Key Advantage
Unlike editing the system hosts file, DNS Mapping in NectoProxy only affects traffic flowing through the proxy. Other applications on the same machine continue to use normal DNS resolution. This isolation prevents unexpected side effects and makes DNS Mapping safe to use in shared development environments.
:::

## Use Cases

### Testing Against Staging Servers

The most common use case is redirecting API calls from a production domain to a staging server:

```
api.example.com  -->  staging.internal.example.com (10.0.1.50)
```

This lets you use a production build of your application (which makes requests to `api.example.com`) but have those requests served by your staging server. No code changes, no environment variable toggles, no separate builds.

### Local Development

Redirect remote services to your local development machine:

```
api.example.com     -->  127.0.0.1
cdn.example.com     -->  127.0.0.1
auth.example.com    -->  127.0.0.1
```

This is particularly useful when your application uses multiple microservices and you want to run one or more of them locally while keeping the rest connected to their remote endpoints.

### A/B Testing Across Backends

Compare behavior between different backend versions by mapping domains to different servers during different test runs:

**Test A:**
```
api.example.com  -->  10.0.1.50 (version 2.0)
```

**Test B:**
```
api.example.com  -->  10.0.1.51 (version 2.1-rc1)
```

This approach lets you test your frontend against different backend versions without any deployment changes.

### Accessing Services by IP

Some testing scenarios require connecting to a server by IP address, but the server application requires a specific `Host` header (e.g., virtual hosting). DNS Mapping allows the client to use the domain name (preserving the correct `Host` header) while NectoProxy connects to the desired IP.

### Testing Disaster Recovery

Verify that your application works correctly when traffic is routed to a backup or disaster recovery server:

```
api.example.com  -->  10.0.2.100 (DR datacenter)
```

## Configuring DNS Mappings

### Adding a Mapping

1. Open the **DNS Mapping** panel in the NectoProxy settings
2. Click **Add Mapping**
3. Enter the **domain name** (or wildcard pattern)
4. Enter the **target IP address**
5. Optionally add a **description** explaining the purpose of the mapping
6. The mapping is enabled by default

### Mapping Fields

| Field | Required | Description |
|---|---|---|
| **Domain** | Yes | The domain name to intercept (e.g., `api.example.com`) |
| **Target IP** | Yes | The IP address to connect to instead (e.g., `192.168.1.100`) |
| **Description** | No | A free-text note explaining the mapping's purpose |
| **Enabled** | -- | Toggle to enable or disable the mapping |

### Wildcard Domain Support

DNS Mapping supports wildcard patterns for matching multiple subdomains:

| Pattern | Matches | Does Not Match |
|---|---|---|
| `api.example.com` | `api.example.com` only | `www.example.com` |
| `*.example.com` | `api.example.com`, `www.example.com`, `cdn.example.com` | `example.com` |
| `*.api.example.com` | `v1.api.example.com`, `v2.api.example.com` | `api.example.com` |

::: warning
Wildcard mappings apply to all matching subdomains. Be cautious with broad wildcards like `*.example.com` as they will redirect all subdomain traffic, including services you may want to reach at their original destinations.
:::

### Enable/Disable Per Mapping

Each mapping has an **enable/disable toggle** that lets you quickly activate or deactivate it without deleting the configuration. This is useful when you need to temporarily switch between testing against a mapped server and the real server.

::: details Example Configuration
| Domain | Target IP | Description | Enabled |
|---|---|---|---|
| `api.example.com` | `192.168.1.100` | Local API server for development | Yes |
| `cdn.example.com` | `127.0.0.1` | Local CDN mock server | Yes |
| `auth.example.com` | `10.0.1.50` | Staging auth service | No |
| `*.internal.corp` | `10.0.0.1` | Corporate network gateway | Yes |
:::

## Managing DNS Mappings

The DNS Mapping panel provides full **CRUD operations** through the Web UI:

### Create

Add new mappings through the Add Mapping form. Enter the domain, target IP, and optional description.

### Read

View all configured mappings in a table showing the domain, target IP, description, and enabled status.

### Update

Click on any existing mapping to edit its domain, target IP, description, or enabled state.

### Delete

Remove mappings that are no longer needed. Deleted mappings are permanently removed and cannot be recovered.

## Interaction with Other Features

### SSL Passthrough

DNS Mapping works **alongside** [SSL Passthrough](./ssl-passthrough). If a domain has both a DNS mapping and an SSL Passthrough entry, NectoProxy will:

1. Resolve the domain using the DNS mapping (connecting to the specified IP)
2. Tunnel the traffic without decryption (as specified by SSL Passthrough)

### Rules Engine

[Rules Engine](./rules-engine) rules are applied **after** DNS mapping. The request URL and `Host` header still reference the original domain, so URL-based rule matching works as expected.

### Upstream Proxy

If an [Upstream Proxy](./upstream-proxy) is configured, DNS Mapping is applied **before** the request is forwarded to the upstream proxy. The upstream proxy receives the request with the mapped IP as the destination.

## Practical Example: Full-Stack Local Development

Consider a microservices architecture with the following production domains:

```
frontend.example.com    -->  Production CDN
api.example.com         -->  Production API gateway
auth.example.com        -->  Production auth service
uploads.example.com     -->  Production file storage
```

During development, you want to run the API locally but keep other services pointing to production:

| Domain | Target IP | Description |
|---|---|---|
| `api.example.com` | `127.0.0.1` | Local API running on port 8080 |

Now your production frontend (served from `frontend.example.com`) makes API calls to `api.example.com`, which NectoProxy routes to your local machine. Auth and file upload services continue to use their production endpoints.

::: tip Port Considerations
DNS Mapping changes only the IP address, not the port. If your local server runs on a non-standard port (e.g., 8080), the connection will still use the original port from the request URL (typically 443 for HTTPS or 80 for HTTP). Make sure your local server listens on the expected port, or use [Rules Engine Map Remote](./rules-engine) to redirect to a different port.
:::

---

::: info
DNS Mapping entries are persisted across NectoProxy sessions. Your mappings are saved automatically and restored when you restart the proxy.
:::
