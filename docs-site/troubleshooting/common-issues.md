# Common Issues

This page covers the most frequently encountered issues when using NectoProxy, along with their causes and solutions.

## No Traffic Appearing in the Web UI

**Symptom:** NectoProxy is running and the Web UI loads, but no traffic entries appear when you browse.

### Possible Causes and Solutions

**1. Browser is not configured to use the proxy**

The most common cause. Verify your browser's proxy settings point to `localhost:8888`.

::: details How to Check Proxy Settings by Browser

**Chrome / Edge (uses system proxy on macOS/Windows):**
- macOS: System Preferences > Network > Advanced > Proxies
- Windows: Settings > Network & Internet > Proxy
- Linux: Settings > Network > Network Proxy

**Firefox (has its own proxy settings):**
- Preferences > General > Network Settings > Settings
- Set Manual proxy: HTTP Proxy `127.0.0.1`, Port `8888`
- Check "Also use this proxy for HTTPS"

**Using environment variables (for CLI tools):**
```bash
export HTTP_PROXY=http://localhost:8888
export HTTPS_PROXY=http://localhost:8888
```
:::

**2. Wrong port**

Double-check that the port in your proxy settings matches the port NectoProxy is listening on. The default is `8888`, but if you started with `-p 9999`, use that port instead.

**3. Recording is paused**

Check the header of the Web UI. If the recording button shows a **play icon** instead of a **pause icon**, recording is paused. Click it to resume recording. Traffic still flows through the proxy when paused, but entries are not captured or displayed.

**4. Different session is selected**

Traffic is recorded into the active session. If you switched sessions, the traffic list shows entries from the currently selected session. Make sure you are viewing the correct session.

---

## HTTPS Sites Show Security Errors

**Symptom:** HTTP sites work fine through the proxy, but HTTPS sites display security warnings like "Your connection is not private" or `NET::ERR_CERT_AUTHORITY_INVALID`.

**Cause:** The NectoProxy CA certificate is not installed or not trusted on your system.

**Solution:** Install the CA certificate. See the detailed [Certificate Errors](./certificate-errors) page for platform-specific instructions.

```bash
# Show installation instructions
nectoproxy cert --install
```

---

## Rules Not Being Applied

**Symptom:** You created a rule, but requests matching the pattern are not affected.

### Check These Things

**1. Is the rule enabled?**

In the Rules panel, verify the toggle next to your rule is turned on (enabled). Disabled rules are ignored during evaluation.

**2. Does the match pattern actually match?**

Rule matching is based on the URL, method, host, path, and headers. Common mistakes:

| Problem | Example | Fix |
|---------|---------|-----|
| Missing wildcard | `/api/users` does not match `https://example.com/api/users` | Use `*/api/users` |
| Wrong method | Rule matches GET but request is POST | Add the correct method |
| Case sensitivity | `/API/Users` does not match `/api/users` | Match the exact case |

::: tip
Test your match pattern by looking at the URL in the traffic list. Copy the full URL and compare it against your rule's match pattern.
:::

**3. Check rule priority**

If multiple rules match the same request, the rule with the highest priority number is applied first. A lower-priority rule might be getting overridden.

**4. Is there a conflicting rule?**

A Block rule with higher priority could be preventing your Mock rule from firing. Review all active rules for conflicts.

---

## WebSocket Connections Failing

**Symptom:** WebSocket connections fail when going through the proxy, but work fine without the proxy.

**Solutions:**

1. **Ensure WebSocket traffic goes through the proxy port (8888).** WebSocket connections start as HTTP upgrade requests and must use the proxy port, not the UI port.

2. **Check for SSL passthrough.** If the WebSocket server's domain is in the SSL passthrough list, NectoProxy will not intercept the connection. This is usually correct, but it means you will not see frames in the UI.

3. **Check for certificate pinning.** Some WebSocket libraries or servers implement certificate pinning. If the library validates certificates strictly, it will reject NectoProxy's generated certificates. Add the domain to SSL passthrough as a workaround.

---

## Binary Body Shows Garbled Text

**Symptom:** Opening a traffic entry for an image, video, or binary file shows garbled characters in the body viewer.

**Explanation:** This is expected behavior. Binary content (images, PDF, protobuf, compressed data) is stored as-is in the database and displayed as base64-encoded text in the UI. NectoProxy does not attempt to render binary content inline.

::: tip
Check the `Content-Type` header to identify the content type. Common binary types include `image/png`, `application/octet-stream`, `application/pdf`, and `application/protobuf`.
:::

---

## Large Requests Are Truncated

**Symptom:** The request or response body appears to be cut off, or the entry has an `isTruncated` flag.

**Cause:** The body exceeded the `maxBodySize` limit (default 10 MB). NectoProxy captures only the first `maxBodySize` bytes to prevent excessive memory usage.

**Solution:** Increase the `maxBodySize` setting:

```bash
# Increase to 50 MB
curl -X PUT http://localhost:8889/api/settings/maxBodySize \
  -H "Content-Type: application/json" \
  -d '{"value": 52428800}'
```

Or update it in the Settings panel in the Web UI.

::: warning
Increasing `maxBodySize` significantly will increase memory usage and database size. Only increase it when you specifically need to capture large bodies.
:::

---

## "Address Already in Use" Error (EADDRINUSE)

**Symptom:** NectoProxy fails to start with an error like `Port is already in use`.

**Cause:** Another process is already listening on port 8888 or 8889.

**Solutions:**

1. **Use a different port:**
   ```bash
   nectoproxy start -p 9999 -u 9998
   ```

2. **Find and stop the conflicting process:** See the [Port Conflicts](./port-conflicts) page for details.

---

## Cannot Connect from Other Devices

**Symptom:** NectoProxy works on your local machine, but phones or other computers on the network cannot connect.

**Causes and Solutions:**

**1. NectoProxy is bound to localhost only**

By default, NectoProxy binds to `127.0.0.1`, which only accepts connections from the local machine. Start with:

```bash
nectoproxy start --host 0.0.0.0
```

**2. Firewall is blocking the port**

Check your system's firewall and ensure ports 8888 and 8889 are open for inbound connections.

**3. Devices are on different networks**

Your computer and the connecting device must be on the same network (e.g., the same Wi-Fi network).

**4. Using the wrong IP address**

Check the Settings panel in the Web UI for your computer's IP address. Use that address in the connecting device's proxy settings, not `localhost` or `127.0.0.1`.

---

## NectoProxy Crashes on Startup

**Symptom:** NectoProxy exits immediately after starting.

**Possible Causes:**

| Cause | Solution |
|-------|---------|
| Node.js version too old | NectoProxy requires Node.js 20+. Check with `node -v`. |
| Corrupted database | Rename or delete `~/.nectoproxy/data.db` and restart. |
| Port conflict | Try different ports: `nectoproxy start -p 9999 -u 9998` |
| Missing dependencies | Reinstall: `npm install -g nectoproxy` |

::: tip
Run NectoProxy with the `DEBUG` environment variable for more verbose output:
```bash
DEBUG=* nectoproxy start
```
:::
