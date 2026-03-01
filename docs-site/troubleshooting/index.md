# Troubleshooting

When things are not working as expected, this section helps you diagnose and resolve common issues with NectoProxy. Start with the quick debugging checklist below, then follow the links to detailed troubleshooting pages.

## Quick Debugging Checklist

Run through these checks in order when NectoProxy is not behaving as expected:

### 1. Is NectoProxy Running?

Verify the proxy process is active:

```bash
# Check if the process is running
ps aux | grep nectoproxy

# Or try accessing the Web UI
curl -s http://localhost:8889 > /dev/null && echo "Web UI is reachable" || echo "Web UI is NOT reachable"
```

If NectoProxy is not running, start it:

```bash
nectoproxy start
```

### 2. Is Your Browser/System Configured to Use the Proxy?

Check your proxy settings:

- **Browser:** Verify the HTTP proxy is set to `localhost:8888` (or your custom port).
- **System:** Check system-level proxy settings if you configured them.
- **CLI tools:** Ensure `HTTP_PROXY` and `HTTPS_PROXY` environment variables are set if you are using command-line tools.

```bash
# Test with curl
curl -x http://localhost:8888 http://httpbin.org/get
```

### 3. Is the CA Certificate Installed?

HTTPS traffic requires the NectoProxy CA certificate to be installed and trusted:

```bash
# Show certificate path and installation instructions
nectoproxy cert --install
```

If you see security errors in your browser for HTTPS sites, the CA certificate is likely not installed. See the [Certificate Errors](./certificate-errors) page.

### 4. Are You Using the Correct Port?

Verify you are connecting to the right port:

- **Proxy port:** Default `8888` (for browser/system proxy settings)
- **Web UI port:** Default `8889` (for accessing the NectoProxy dashboard)

```bash
# Check which ports NectoProxy is listening on
lsof -i :8888
lsof -i :8889
```

### 5. Is a Firewall Blocking Connections?

If connecting from another device (e.g., a phone for mobile debugging):

```bash
# macOS: Check if the firewall allows connections
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate

# Linux: Check iptables
sudo iptables -L -n | grep 8888

# Windows: Check firewall
netsh advfirewall firewall show rule name=all | findstr 8888
```

Make sure ports 8888 and 8889 are open for inbound connections. NectoProxy binds to all interfaces (`0.0.0.0`) by default, so firewall rules must allow inbound connections on these ports when accessing from other devices.

## Troubleshooting Pages

| Page | What It Covers |
|------|---------------|
| [Common Issues](./common-issues) | Frequently encountered problems and their solutions |
| [Certificate Errors](./certificate-errors) | SSL/TLS certificate problems and fixes |
| [Port Conflicts](./port-conflicts) | EADDRINUSE errors and port management |
| [Performance](./performance) | Slow UI, high memory, database growth |

## Getting Help

If you cannot resolve your issue with the information in this section:

1. **Search existing issues** on the [NectoProxy GitHub Issues](https://github.com/sitharaj88/nectoproxy/issues) page.
2. **Open a new issue** with:
   - Your operating system and version
   - Node.js version (`node -v`)
   - NectoProxy version (`nectoproxy --version`)
   - Steps to reproduce the problem
   - Any error messages from the terminal
   - Browser name and version (if relevant)

::: tip
When reporting issues, include the terminal output from NectoProxy's startup. This often contains error messages that help diagnose the problem quickly.
:::
