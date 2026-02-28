---
title: SSL Passthrough
description: Bypass MITM decryption for specific domains in NectoProxy.
---

# SSL Passthrough

SSL Passthrough allows you to configure specific domains whose HTTPS traffic should **pass through NectoProxy without being decrypted**. Traffic to passthrough domains is forwarded directly to the destination server, maintaining the original end-to-end TLS encryption.

## What is SSL Passthrough?

By default, NectoProxy performs **Man-in-the-Middle (MITM)** interception on all HTTPS traffic. This means it decrypts requests, inspects them, and re-encrypts them before forwarding. While this is necessary for traffic inspection, there are situations where you do not want (or cannot) decrypt traffic for certain domains.

SSL Passthrough tells NectoProxy to act as a **transparent TCP tunnel** for those domains. The proxy receives the `CONNECT` request from the client, establishes a TCP connection to the target server, and then forwards raw bytes in both directions without any decryption or inspection.

```
Without SSL Passthrough (default):
  Client <--TLS--> NectoProxy <--TLS--> Server
  (NectoProxy decrypts, inspects, re-encrypts)

With SSL Passthrough:
  Client <--TLS-------------------TLS--> Server
  (NectoProxy tunnels raw bytes, no decryption)
```

## When to Use SSL Passthrough

### Certificate Pinning

Some applications implement **certificate pinning**, where the client verifies that the server's certificate matches a specific known certificate or public key. When NectoProxy performs MITM interception, it presents its own generated certificate, which does not match the pinned certificate. This causes the connection to fail.

Adding such domains to the SSL Passthrough list allows the connection to succeed because the client sees the real server certificate.

::: tip Common Pinned Domains
Mobile banking applications, certain Google services, and many native mobile apps use certificate pinning. If you see TLS connection failures for specific domains, certificate pinning is a likely cause.
:::

### Financial and Banking Services

Even when certificate pinning is not in use, you may want to avoid decrypting traffic to banking and financial services as a matter of security practice. SSL Passthrough ensures that sensitive financial data is never exposed in the proxy, even temporarily.

### Compliance Requirements

Some organizations have policies that prohibit the interception of certain types of traffic. SSL Passthrough lets you use NectoProxy for general debugging while respecting these policies for specific domains.

### Application-Level TLS Verification

Applications that perform additional TLS verification beyond standard certificate chain validation (such as mutual TLS or custom trust stores) may fail when traffic is intercepted. SSL Passthrough ensures these applications work correctly through the proxy.

## Configuring SSL Passthrough

### Adding a Domain

1. Open the **SSL Passthrough** panel from the settings area in NectoProxy
2. Click **Add Domain**
3. Enter the domain name or wildcard pattern
4. Optionally add a **reason or note** explaining why passthrough is configured
5. The entry is enabled by default

### Domain Format

SSL Passthrough entries support exact domain names and wildcard patterns:

| Pattern | Matches | Does Not Match |
|---|---|---|
| `bank.example.com` | `bank.example.com` | `www.bank.example.com` |
| `*.example.com` | `www.example.com`, `api.example.com` | `example.com`, `sub.sub.example.com` |
| `*.google.com` | `accounts.google.com`, `mail.google.com` | `google.com` |
| `*.*.example.com` | `a.b.example.com` | `c.example.com` |

::: warning
Wildcard patterns match only one level of subdomain per `*`. The pattern `*.example.com` matches `www.example.com` but not `a.b.example.com`. Use `*.*.example.com` for two-level matching, or add multiple entries if you need broader coverage.
:::

### Per-Domain Enable/Disable

Each passthrough entry has an **enable/disable toggle**. When disabled, the domain reverts to normal MITM interception. This lets you keep entries configured for later use without removing them.

::: details Example Configuration
| Domain | Reason | Enabled |
|---|---|---|
| `*.bank.example.com` | Banking app uses certificate pinning | Yes |
| `accounts.google.com` | OAuth flow breaks with MITM | Yes |
| `*.apple.com` | Apple services certificate pinning | Yes |
| `internal.corp.net` | Compliance requirement | Yes |
| `api.payment.com` | PCI DSS compliance | Yes |
| `*.staging.example.com` | Temporarily disabled for debugging | No |
:::

### Adding a Reason/Note

Each passthrough entry supports a free-text **reason** field. Use this to document why the domain is excluded from interception. This is especially valuable in team environments where multiple people may be using or administering NectoProxy.

Good examples of reasons:
- "Banking app uses certificate pinning -- connection fails without passthrough"
- "PCI DSS compliance requires end-to-end encryption for payment traffic"
- "OAuth callback fails when certificate is not the original"
- "Mobile app crashes on certificate mismatch for this domain"

## Managing Passthrough Entries

### CRUD Operations

The SSL Passthrough panel provides full CRUD (Create, Read, Update, Delete) operations:

- **Create** -- Add new domains via the Add Domain form
- **Read** -- View all configured passthrough entries in a table
- **Update** -- Edit the domain pattern, reason, or enabled state of any entry
- **Delete** -- Remove entries that are no longer needed

### Bulk Management

For situations where you need to configure many domains at once, you can add multiple domains separated by newlines in the Add Domain form.

## Performance Benefits

SSL Passthrough provides a modest **performance improvement** for traffic to configured domains because NectoProxy skips the TLS decryption and re-encryption process:

- **No certificate generation** -- NectoProxy does not need to generate a certificate for the target domain
- **No decryption overhead** -- The proxy does not perform any cryptographic operations on the traffic
- **No inspection processing** -- Traffic is not parsed, analyzed, or stored in the session
- **Lower memory usage** -- Passthrough traffic does not consume memory for request/response storage

For domains that generate high volumes of traffic (such as CDNs or streaming services) that you do not need to inspect, SSL Passthrough can noticeably reduce NectoProxy's CPU and memory usage.

::: tip
If you are experiencing high resource usage with NectoProxy, consider adding high-traffic domains that you do not need to inspect (such as CDN domains, analytics services, or streaming endpoints) to the passthrough list.
:::

## Limitations

- **No traffic inspection** -- Passthrough traffic cannot be viewed, filtered, or analyzed in NectoProxy. It appears in the traffic list only as a `CONNECT` tunnel entry.
- **No rules** -- Rules Engine actions (Mock, Block, Modify, etc.) cannot be applied to passthrough traffic since the content is not decrypted.
- **No breakpoints** -- Breakpoints cannot intercept passthrough traffic.
- **DNS resolution** -- SSL Passthrough does not affect DNS resolution. Use [DNS Mapping](./dns-mapping) if you need to redirect passthrough traffic to a different IP address.

---

::: info
SSL Passthrough entries are persisted across NectoProxy sessions. Entries you configure are saved and automatically loaded the next time you start the proxy.
:::
