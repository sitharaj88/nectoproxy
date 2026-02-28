# nectoproxy cert

The `cert` command manages the NectoProxy root CA certificate used for HTTPS interception. It provides subcommands to view certificate information, get installation instructions, locate the certificate file, and clear the cached domain certificates.

## Usage

```bash
nectoproxy cert [options]
```

## Options

| Option | Description |
|---|---|
| *(no flags)* | Display information about the current CA certificate |
| `--install` | Show platform-specific CA certificate installation instructions |
| `--path` | Print the file path to the CA certificate |
| `--clear-cache` | Clear all cached per-domain certificates |

## Default Behavior (No Flags)

Running `nectoproxy cert` without any flags displays information about the currently generated root CA certificate:

```bash
nectoproxy cert
```

Example output:

```
  NectoProxy CA Certificate

  Subject:     NectoProxy CA
  Issuer:      NectoProxy CA
  Valid From:  2025-01-15T00:00:00Z
  Valid Until: 2035-01-15T00:00:00Z
  Fingerprint: AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78:90

  Location:    ~/.nectoproxy/certs/ca.pem
```

::: tip First Run
The CA certificate is automatically generated the first time you run `nectoproxy start`. If you run `nectoproxy cert` before ever starting NectoProxy, it will generate the certificate on the spot.
:::

## Show Installation Instructions

```bash
nectoproxy cert --install
```

This prints platform-specific instructions for installing the CA certificate on your operating system. The output detects your current platform and shows the relevant commands.

Example output on macOS:

```
  Install the NectoProxy CA certificate:

  macOS (System Keychain):
    sudo security add-trusted-cert -d -r trustRoot \
      -k /Library/Keychains/System.keychain \
      ~/.nectoproxy/certs/ca.pem

  Firefox (all platforms):
    Settings > Privacy & Security > View Certificates
    > Authorities > Import > Select ca.pem
    > Trust this CA to identify websites

  For detailed guides, visit:
    https://nectoproxy.dev/certificate/
```

::: tip Detailed Guides
For step-by-step instructions with screenshots and troubleshooting, see the platform-specific certificate guides:
- [macOS](/certificate/macos)
- [Windows](/certificate/windows)
- [Linux](/certificate/linux)
- [Firefox](/certificate/firefox)
- [Mobile Devices](/certificate/mobile)
:::

## Print Certificate Path

```bash
nectoproxy cert --path
```

Prints the absolute file path to the CA certificate file. This is useful for scripting or when you need to reference the certificate in other tools.

Example output:

```
/home/user/.nectoproxy/certs/ca.pem
```

You can use this in scripts:

```bash
# Copy the certificate to another location
cp "$(nectoproxy cert --path)" /tmp/nectoproxy-ca.pem

# Use with curl
curl --cacert "$(nectoproxy cert --path)" https://example.com

# Set as Node.js extra CA
export NODE_EXTRA_CA_CERTS="$(nectoproxy cert --path)"
```

## Clear Domain Certificate Cache

```bash
nectoproxy cert --clear-cache
```

Clears all cached per-domain certificates from `~/.nectoproxy/certs/domain-certs/`. These are the certificates that NectoProxy generates on the fly for each HTTPS domain it intercepts.

Example output:

```
  Cleared 47 cached domain certificates.
```

::: details When to Clear the Cache
You should clear the domain certificate cache if:
- **The CA certificate was regenerated** -- After deleting and regenerating the root CA, old domain certificates signed by the previous CA will cause errors.
- **Certificate errors appear** -- If specific domains show TLS handshake failures, clearing the cache forces regeneration.
- **Disk space** -- Each cached certificate is small, but after intercepting traffic to thousands of domains, the cache directory may grow.

Domain certificates are automatically regenerated as needed, so clearing the cache has no lasting impact on functionality.
:::

## Examples

### View CA Info and Install

A common workflow when setting up NectoProxy for the first time:

```bash
# Start NectoProxy to generate the CA certificate
nectoproxy start
# (Press Ctrl+C to stop after it starts)

# View the CA certificate details
nectoproxy cert

# Get installation instructions for your platform
nectoproxy cert --install

# Find the certificate file
nectoproxy cert --path
```

### Script: Install CA on macOS

```bash
#!/bin/bash
# Ensure NectoProxy CA is generated and installed on macOS

# Start and immediately stop to ensure CA is generated
nectoproxy start --no-open &
NECTO_PID=$!
sleep 2
kill $NECTO_PID

# Install the CA
sudo security add-trusted-cert -d -r trustRoot \
  -k /Library/Keychains/System.keychain \
  "$(nectoproxy cert --path)"

echo "NectoProxy CA installed successfully."
```

### Refresh All Domain Certificates

If you are experiencing certificate issues with specific domains:

```bash
# Clear cached domain certificates
nectoproxy cert --clear-cache

# Restart NectoProxy -- domain certs will regenerate on demand
nectoproxy start
```
