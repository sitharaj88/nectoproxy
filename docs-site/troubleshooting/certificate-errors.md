# Certificate Errors

This page covers all certificate-related issues you may encounter when using NectoProxy, with platform-specific solutions.

## How NectoProxy Certificates Work

NectoProxy generates a root Certificate Authority (CA) on first launch. This CA is stored in `~/.nectoproxy/certs/`. When your browser connects to an HTTPS site through the proxy, NectoProxy dynamically generates a certificate for that domain, signed by its CA. For this to work without browser warnings, your system must trust the NectoProxy CA.

## "Your Connection Is Not Private" / NET::ERR_CERT_AUTHORITY_INVALID

**Symptom:** Chrome shows "Your connection is not private" with error code `NET::ERR_CERT_AUTHORITY_INVALID`. Other browsers show similar warnings.

**Cause:** The NectoProxy CA certificate is not installed or not trusted on your system.

**Solution:** Install the CA certificate.

### Find the Certificate

```bash
# Show the CA certificate path
nectoproxy cert --path

# Show detailed installation instructions
nectoproxy cert --install
```

The certificate file is located at `~/.nectoproxy/certs/ca.crt`.

### Install on macOS

1. Open **Keychain Access** (Applications > Utilities > Keychain Access).
2. Select the **System** keychain (or **login** keychain).
3. Go to **File > Import Items** and select `~/.nectoproxy/certs/ca.crt`.
4. Find the imported "NectoProxy CA" certificate.
5. Double-click it, expand **Trust**, and set **When using this certificate** to **Always Trust**.
6. Close the dialog and enter your password to confirm.

Or via the terminal:

```bash
sudo security add-trusted-cert -d -r trustRoot \
  -k /Library/Keychains/System.keychain \
  ~/.nectoproxy/certs/ca.crt
```

### Install on Windows

1. Double-click the `ca.crt` file.
2. Click **Install Certificate**.
3. Select **Local Machine** (requires administrator) or **Current User**.
4. Choose **Place all certificates in the following store**.
5. Click **Browse** and select **Trusted Root Certification Authorities**.
6. Click **Next**, then **Finish**.

Or via PowerShell (run as Administrator):

```powershell
Import-Certificate -FilePath "$env:USERPROFILE\.nectoproxy\certs\ca.crt" `
  -CertStoreLocation Cert:\LocalMachine\Root
```

### Install on Linux

#### Ubuntu / Debian

```bash
sudo cp ~/.nectoproxy/certs/ca.crt /usr/local/share/ca-certificates/nectoproxy-ca.crt
sudo update-ca-certificates
```

#### Fedora / RHEL / CentOS

```bash
sudo cp ~/.nectoproxy/certs/ca.crt /etc/pki/ca-trust/source/anchors/nectoproxy-ca.crt
sudo update-ca-trust
```

#### Arch Linux

```bash
sudo cp ~/.nectoproxy/certs/ca.crt /etc/ca-certificates/trust-source/anchors/nectoproxy-ca.crt
sudo trust extract-compat
```

::: warning
On Linux, installing the system CA certificate may not affect all browsers. Firefox and some Electron-based applications use their own certificate stores. See the Firefox-specific section below.
:::

---

## Certificate Expired

**Symptom:** Browser shows an expired certificate error for sites accessed through NectoProxy.

**Cause:** The cached domain certificate has expired. Domain certificates are valid for 365 days by default.

**Solution:** Clear the certificate cache:

```bash
nectoproxy cert --clear-cache
```

This removes all cached domain certificates. NectoProxy will regenerate them on the next request. The CA certificate itself is valid for 10 years and does not need to be regenerated.

::: tip
After clearing the cache, restart NectoProxy for the changes to take effect fully:
```bash
nectoproxy cert --clear-cache
# Then restart NectoProxy
nectoproxy start
```
:::

---

## Firefox Shows Errors but Chrome Works

**Symptom:** HTTPS sites work fine in Chrome (or Edge/Safari) but Firefox shows certificate errors.

**Cause:** Firefox uses its own certificate store instead of the system certificate store. Installing the CA in your system keychain/store does not affect Firefox.

**Solution:** Import the CA certificate into Firefox:

1. Open Firefox.
2. Go to **Settings** (or **Preferences** on macOS).
3. Search for **Certificates** or navigate to **Privacy & Security > Certificates**.
4. Click **View Certificates**.
5. Go to the **Authorities** tab.
6. Click **Import** and select `~/.nectoproxy/certs/ca.crt`.
7. Check **Trust this CA to identify websites**.
8. Click **OK**.

::: details Alternative: Configure Firefox to Use System Certificates
You can configure Firefox to use the system certificate store instead of its own. In `about:config`, set:

```
security.enterprise_roots.enabled = true
```

This makes Firefox trust all certificates in the system certificate store, including the NectoProxy CA (if it is installed there).
:::

---

## Mobile App Shows Certificate Errors

**Symptom:** A mobile app shows SSL/TLS errors when traffic is routed through NectoProxy, even though the CA certificate is installed on the device.

**Cause:** The app likely uses **certificate pinning**, which means it only trusts specific certificates (usually the production server's certificate) and rejects any others, including NectoProxy's dynamically generated certificates.

**Solution:** Add the app's domain to NectoProxy's **SSL Passthrough** list:

1. Open the NectoProxy Web UI.
2. Go to **Settings** > **SSL Passthrough** > **Configure**.
3. Add the domain (e.g., `api.example.com` or `*.example.com`).
4. Enable it.

NectoProxy will pass through the SSL connection without decrypting it. You will not see the request/response details for these domains, but the app will work correctly.

::: tip
Common apps that use certificate pinning include banking apps, payment SDKs, some social media apps, and security-focused applications. When in doubt, add the domain to SSL passthrough and see if the app starts working.
:::

---

## "Certificate Not Valid for Domain"

**Symptom:** Browser shows that the certificate is not valid for the requested domain, despite the CA being installed.

**Cause:** A stale or corrupted domain certificate in the cache.

**Solution:**

1. Clear the certificate cache:
   ```bash
   nectoproxy cert --clear-cache
   ```

2. Restart NectoProxy:
   ```bash
   nectoproxy start
   ```

NectoProxy will generate fresh certificates on the next request.

---

## Regenerating the CA Certificate

If the CA certificate itself is corrupted, expired, or you want to start fresh:

1. **Stop NectoProxy.**

2. **Delete the certs directory:**
   ```bash
   rm -rf ~/.nectoproxy/certs/
   ```

3. **Start NectoProxy.** A new CA certificate is generated automatically:
   ```bash
   nectoproxy start
   ```

4. **Reinstall the new CA certificate** on all browsers and devices. The old CA certificate is no longer valid.

::: danger
Regenerating the CA means all previously installed certificates (on browsers, phones, VMs) are now invalid. Every device and browser must install and trust the new CA certificate.
:::

---

## Verifying the CA Certificate Is Installed

### macOS

```bash
# List trusted certificates containing "NectoProxy"
security find-certificate -a -c "NectoProxy" -Z /Library/Keychains/System.keychain
```

### Windows

```powershell
# List certificates in Trusted Root store containing "NectoProxy"
Get-ChildItem Cert:\LocalMachine\Root | Where-Object { $_.Subject -like "*NectoProxy*" }
```

### Linux

```bash
# Check if the certificate is in the system store
awk -v cmd='openssl x509 -noout -subject' '/BEGIN/{close(cmd)};{print | cmd}' \
  < /etc/ssl/certs/ca-certificates.crt | grep -i "nectoproxy"
```

### Firefox

1. Go to **Settings > Privacy & Security > Certificates > View Certificates**.
2. Check the **Authorities** tab for "NectoProxy CA".

### iOS

1. Go to **Settings > General > About > Certificate Trust Settings**.
2. Look for "NectoProxy CA" under "Enable Full Trust for Root Certificates".

### Android

1. Go to **Settings > Security > Encryption & Credentials > Trusted Credentials**.
2. Check the **User** tab for "NectoProxy CA".

---

## Certificate Troubleshooting Flowchart

```
HTTPS error in browser?
  |
  |--> Is CA installed? (check with commands above)
  |     |
  |     |--> No: Install it (see platform instructions)
  |     |
  |     |--> Yes: Is it trusted?
  |           |
  |           |--> No: Mark as trusted (macOS: Always Trust; Windows: Trusted Root)
  |           |
  |           |--> Yes: Clear cert cache and restart
  |                 |
  |                 |--> Still broken? Regenerate CA (delete certs/ folder)
  |
  |--> Mobile app error?
        |
        |--> Check if app uses cert pinning
        |--> Add domain to SSL passthrough
```
