# Linux Certificate Setup

This guide covers installing the NectoProxy root CA certificate on various Linux distributions. Because Linux does not have a single unified certificate store, the process varies by distribution and by application.

## Ubuntu / Debian

1. **Copy the certificate to the system CA directory:**

    ```bash
    sudo cp ~/.nectoproxy/certs/ca.pem /usr/local/share/ca-certificates/nectoproxy-ca.crt
    ```

    ::: warning File Extension
    The file **must** have a `.crt` extension in the `ca-certificates` directory. Even though NectoProxy generates `ca.pem`, rename it to `.crt` when copying.
    :::

2. **Update the system certificate store:**

    ```bash
    sudo update-ca-certificates
    ```

    You should see output like:

    ```
    Updating certificates in /etc/ssl/certs...
    1 added, 0 removed; done.
    ```

3. **Verify the certificate was added:**

    ```bash
    ls /etc/ssl/certs/ | grep -i necto
    ```

## Fedora / RHEL / CentOS

1. **Copy the certificate to the system trust anchors:**

    ```bash
    sudo cp ~/.nectoproxy/certs/ca.pem /etc/pki/ca-trust/source/anchors/nectoproxy-ca.pem
    ```

2. **Update the CA trust store:**

    ```bash
    sudo update-ca-trust
    ```

3. **Verify:**

    ```bash
    trust list | grep -i necto
    ```

## Arch Linux / Manjaro

1. **Copy the certificate:**

    ```bash
    sudo cp ~/.nectoproxy/certs/ca.pem /etc/ca-certificates/trust-source/anchors/nectoproxy-ca.crt
    ```

2. **Update the trust store:**

    ```bash
    sudo update-ca-trust
    ```

3. **Verify:**

    ```bash
    trust list | grep -i necto
    ```

## openSUSE

1. **Copy the certificate:**

    ```bash
    sudo cp ~/.nectoproxy/certs/ca.pem /etc/pki/trust/anchors/nectoproxy-ca.pem
    ```

2. **Update the trust store:**

    ```bash
    sudo update-ca-certificates
    ```

## Chrome / Chromium on Linux

Chrome and Chromium on Linux use the **NSS shared database** for certificate management, not the system CA store. Even after installing the certificate at the system level, Chrome may not trust it unless you also add it to the NSS database.

### Install certutil

You need the `certutil` tool from the NSS tools package:

```bash
# Ubuntu / Debian
sudo apt install libnss3-tools

# Fedora / RHEL
sudo dnf install nss-tools

# Arch Linux
sudo pacman -S nss
```

### Add the Certificate to the NSS Database

```bash
certutil -d sql:$HOME/.pki/nssdb -A \
  -t "C,," \
  -n "NectoProxy CA" \
  -i ~/.nectoproxy/certs/ca.pem
```

::: tip What the Flags Mean
- `-d sql:$HOME/.pki/nssdb` -- The NSS database directory used by Chrome.
- `-A` -- Add a certificate.
- `-t "C,,"` -- Trust attributes: `C` = trusted CA for SSL, the two commas mean no trust for email or object signing.
- `-n "NectoProxy CA"` -- A human-readable nickname for the certificate.
- `-i` -- Input file path.
:::

### Create the NSS Database (If It Doesn't Exist)

If the NSS database directory does not exist, create it first:

```bash
mkdir -p $HOME/.pki/nssdb
certutil -d sql:$HOME/.pki/nssdb -N --empty-password
```

Then run the `certutil -A` command above.

### Verify in Chrome

```bash
certutil -d sql:$HOME/.pki/nssdb -L
```

You should see "NectoProxy CA" listed with trust attributes `C,,`.

### Remove the Certificate from NSS

```bash
certutil -d sql:$HOME/.pki/nssdb -D -n "NectoProxy CA"
```

## Verify System-Level Installation

After installing the certificate at the system level, verify it with `curl` or `openssl`:

### Using curl

```bash
# Configure your terminal to use the proxy
export http_proxy=http://localhost:8888
export https_proxy=http://localhost:8888

# This should succeed without --insecure
curl https://example.com
```

If the certificate is correctly installed, `curl` will complete without SSL errors.

### Using openssl

```bash
openssl verify -CApath /etc/ssl/certs ~/.nectoproxy/certs/ca.pem
```

## Removing the Certificate

### Ubuntu / Debian

```bash
sudo rm /usr/local/share/ca-certificates/nectoproxy-ca.crt
sudo update-ca-certificates --fresh
```

### Fedora / RHEL

```bash
sudo rm /etc/pki/ca-trust/source/anchors/nectoproxy-ca.pem
sudo update-ca-trust
```

### Arch Linux

```bash
sudo rm /etc/ca-certificates/trust-source/anchors/nectoproxy-ca.crt
sudo update-ca-trust
```

## Troubleshooting

### curl Works but Chrome Does Not

This means the system CA store is correctly configured, but Chrome's NSS database does not have the certificate. Follow the [Chrome / Chromium on Linux](#chrome-chromium-on-linux) section above to add the certificate to the NSS database.

### Firefox Ignores the System Certificate

Firefox uses its own certificate store, independent of both the system CA store and the NSS database used by Chrome. See the [Firefox Certificate Setup](/certificate/firefox) guide.

### "update-ca-certificates" Command Not Found

Install the `ca-certificates` package:

```bash
# Ubuntu / Debian
sudo apt install ca-certificates

# Fedora / RHEL
sudo dnf install ca-certificates
```

### Certificate File Not Found

Make sure NectoProxy has been run at least once to generate the CA certificate:

```bash
nectoproxy start
```

Then check the certificate exists:

```bash
ls -la ~/.nectoproxy/certs/ca.pem
```

Or use:

```bash
nectoproxy cert --path
```

::: details Node.js Applications Behind the Proxy
Node.js does not use the system CA store by default. If you are proxying Node.js applications, set the `NODE_EXTRA_CA_CERTS` environment variable:

```bash
export NODE_EXTRA_CA_CERTS=~/.nectoproxy/certs/ca.pem
```

Add this to your shell configuration file (e.g., `~/.bashrc`, `~/.zshrc`) to make it persistent.
:::
