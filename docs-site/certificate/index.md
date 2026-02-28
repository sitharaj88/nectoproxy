# Certificate Setup Overview

To inspect HTTPS traffic, NectoProxy must decrypt and re-encrypt it on the fly. This page explains why a certificate is needed, how the process works, and where to find platform-specific setup instructions.

## Why Certificates Are Needed

HTTPS encrypts traffic between your browser and the server using TLS. Under normal circumstances, no intermediary can read or modify this traffic -- that is the entire point of HTTPS.

To inspect HTTPS traffic, NectoProxy acts as a **man-in-the-middle (MITM) proxy**. It must terminate the TLS connection from the client, inspect the plaintext request, optionally modify it, and then establish a separate TLS connection to the upstream server. For this to work without triggering browser security warnings, your system must trust NectoProxy's root CA certificate.

## How It Works

When NectoProxy intercepts an HTTPS request, the following process occurs:

1. **Your browser sends a CONNECT request** to the proxy, indicating it wants to establish a tunnel to the target host (e.g., `api.example.com:443`).

2. **NectoProxy generates a domain-specific certificate** for `api.example.com`, signed by its own root CA. This certificate is created on the fly and cached for subsequent requests to the same domain.

3. **NectoProxy completes the TLS handshake** with your browser using this generated certificate. Because your system trusts the NectoProxy root CA, the browser accepts this certificate as valid.

4. **NectoProxy establishes a separate TLS connection** to the real `api.example.com` server and forwards the request.

5. **The response flows back** through NectoProxy, which can inspect and optionally modify it before forwarding it to your browser.

::: tip Key Point
NectoProxy only intercepts traffic that is explicitly routed through its proxy. It does not interfere with any traffic that does not pass through `127.0.0.1:8888` (or whichever address you configured).
:::

## Certificate Location

NectoProxy stores its certificates in the following directory:

```
~/.nectoproxy/certs/
```

This directory contains:

| File | Description |
|---|---|
| `ca.pem` | The root CA certificate (public key). This is the file you install in your system/browser trust store. |
| `ca-key.pem` | The root CA private key. Keep this secure -- it is used to sign per-domain certificates. |
| `domain-certs/` | Cached per-domain certificates, generated on the fly. |

::: warning Security Considerations
- The root CA private key (`ca-key.pem`) should be protected. Anyone with access to this key can generate certificates trusted by your system.
- NectoProxy's root CA is unique to your installation -- it is generated the first time you run NectoProxy.
- When you are finished using NectoProxy, you can remove the CA from your trust store for maximum security.
- NectoProxy **only** intercepts traffic that passes through its proxy server. Applications not configured to use the proxy are unaffected.
:::

## Clearing the Certificate Cache

If you need to regenerate domain certificates (for example, after changing your CA or encountering certificate issues), you can clear the domain certificate cache:

```bash
nectoproxy cert --clear-cache
```

This removes all cached per-domain certificates. They will be regenerated on the fly as new HTTPS requests come in.

## Platform Setup Guides

Follow the guide for your operating system and browser:

| Platform | Guide |
|---|---|
| **macOS** | [macOS Certificate Setup](/certificate/macos) |
| **Windows** | [Windows Certificate Setup](/certificate/windows) |
| **Linux** | [Linux Certificate Setup](/certificate/linux) |
| **Firefox** | [Firefox Certificate Setup](/certificate/firefox) (all platforms) |
| **iOS / Android** | [Mobile Device Setup](/certificate/mobile) |

::: details Why Does Firefox Need a Separate Guide?
Firefox uses its own certificate store (NSS) instead of the operating system's trust store. Even if you install the NectoProxy CA at the system level, Firefox will not trust it unless you either import it into Firefox's certificate manager or enable a Firefox setting to use system certificates. See the [Firefox guide](/certificate/firefox) for details.
:::
