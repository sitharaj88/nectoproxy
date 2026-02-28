# Firefox Certificate Setup

Firefox uses its own built-in certificate store (NSS) rather than the operating system's trust store. This means that even if you have installed the NectoProxy CA certificate at the system level (macOS Keychain, Windows Certificate Store, or Linux system CA directory), Firefox will not automatically trust it.

You have two options: import the certificate directly into Firefox, or configure Firefox to use system certificates.

## Method 1: Import into Firefox (Recommended)

This method adds the NectoProxy CA certificate directly to Firefox's internal certificate manager.

1. **Open Firefox Settings**
   - Click the hamburger menu (three horizontal lines) in the top-right corner.
   - Select **Settings** (or **Preferences** on some systems).
   - Alternatively, type `about:preferences` in the address bar and press Enter.

2. **Navigate to Certificates**
   - In the left sidebar, click **Privacy & Security**.
   - Scroll down to the **Certificates** section (near the bottom of the page).
   - Click the **View Certificates** button.

3. **Import the CA Certificate**
   - In the Certificate Manager dialog, click the **Authorities** tab.
   - Click the **Import** button.
   - Navigate to `~/.nectoproxy/certs/` (on macOS/Linux) or `%USERPROFILE%\.nectoproxy\certs\` (on Windows).
   - Select the `ca.pem` file and click **Open**.

    ::: tip Finding the Certificate File
    If you cannot navigate to the `.nectoproxy` directory (hidden directories may not be visible in the file picker), you can:
    - On macOS/Linux: Type `~/.nectoproxy/certs/ca.pem` directly in the file picker's path bar, or press `Cmd+Shift+.` (macOS) to show hidden files.
    - On Windows: Type `%USERPROFILE%\.nectoproxy\certs\ca.pem` in the file name field.
    - Or copy the certificate to a visible location first: `cp ~/.nectoproxy/certs/ca.pem ~/Desktop/nectoproxy-ca.pem`
    :::

4. **Set Trust Settings**
   - A dialog appears asking how you want to trust this certificate.
   - Check **Trust this CA to identify websites**.
   - You do not need to check "Trust this CA to identify email users" for proxy usage.
   - Click **OK**.

5. **Confirm Import**
   - The NectoProxy CA certificate should now appear in the Authorities list, grouped under its organization name.

## Method 2: Use System Certificates

Instead of importing the certificate manually, you can configure Firefox to trust all certificates in the operating system's trust store. This is useful if you have already installed the NectoProxy CA at the system level.

1. **Open Firefox Configuration**
   - Type `about:config` in the address bar and press Enter.
   - Click **Accept the Risk and Continue** when warned about advanced settings.

2. **Search for the Setting**
   - In the search bar, type: `security.enterprise_roots.enabled`

3. **Enable the Setting**
   - If the value is `false`, click the toggle button to set it to `true`.
   - If the setting does not exist, click the **+** button to create it as a Boolean with the value `true`.

4. **Restart Firefox**
   - Close and reopen Firefox for the change to take effect.

::: warning Limitations of Method 2
- This method relies on the NectoProxy CA being installed in the system trust store first (see [macOS](/certificate/macos), [Windows](/certificate/windows), or [Linux](/certificate/linux) guides).
- On Linux, this feature reads from the system NSS database or the p11-kit trust store, depending on the distribution. It may not work on all distributions.
- This setting causes Firefox to trust **all** system root certificates, not just NectoProxy's. If you prefer fine-grained control, use Method 1.
:::

## Verify Installation

After installing the certificate using either method:

1. Make sure your Firefox proxy is set to `127.0.0.1:8888`:
   - Go to Settings > General > Network Settings > Settings.
   - Select **Manual proxy configuration**.
   - Set HTTP Proxy to `127.0.0.1` and Port to `8888`.
   - Check **Also use this proxy for HTTPS**.
   - Click **OK**.

2. Navigate to any HTTPS website (e.g., `https://example.com`).

3. The page should load without certificate warnings.

4. Click the lock icon in the address bar and select **Connection secure > More information > View Certificate** to confirm the certificate chain includes the NectoProxy CA.

## Removing the Certificate

### If Imported via Method 1

1. Open Firefox Settings > Privacy & Security > View Certificates.
2. Go to the **Authorities** tab.
3. Find the NectoProxy CA certificate in the list.
4. Select it and click **Delete or Distrust**.
5. Confirm the removal.

### If Using Method 2

1. Navigate to `about:config`.
2. Search for `security.enterprise_roots.enabled`.
3. Toggle it back to `false`.
4. Restart Firefox.

## Troubleshooting

### Certificate Import Fails

- **File format**: Firefox expects PEM-encoded certificates. The NectoProxy `ca.pem` file is already in PEM format. If import fails, verify the file is not corrupted by checking it starts with `-----BEGIN CERTIFICATE-----`.
- **File permissions**: Ensure the certificate file is readable. Run `chmod 644 ~/.nectoproxy/certs/ca.pem` if needed.

### HTTPS Sites Still Show Warnings After Import

- **Restart Firefox**: Fully close and reopen Firefox (check that no Firefox processes are running in the background).
- **Check proxy settings**: Verify that Firefox is actually routing through the NectoProxy proxy. Visit `http://httpbin.org/ip` and check if the request appears in the NectoProxy Web UI.
- **Verify trust settings**: Open the Certificate Manager, go to the Authorities tab, find the NectoProxy CA, and click **Edit Trust**. Ensure "Trust this CA to identify websites" is checked.

### Firefox for Android

Firefox on Android also uses its own certificate store. You need to import the certificate through Firefox's settings:

1. Transfer the `ca.pem` file to your Android device.
2. Open Firefox on Android.
3. Go to Settings > About Firefox > tap the Firefox logo 5 times to enable secret settings.
4. Look for certificate management options in the advanced settings.

Alternatively, use the `security.enterprise_roots.enabled` method if the certificate is already installed at the Android system level.

::: details Enterprise Deployment
For organizations deploying NectoProxy across many machines, you can distribute the Firefox configuration via enterprise policies. Create a `policies.json` file:

```json
{
  "policies": {
    "Certificates": {
      "ImportEnterpriseRoots": true
    }
  }
}
```

Place this file in Firefox's distribution directory:
- **macOS**: `/Applications/Firefox.app/Contents/Resources/distribution/policies.json`
- **Linux**: `/usr/lib/firefox/distribution/policies.json` or `/usr/lib64/firefox/distribution/policies.json`
- **Windows**: `C:\Program Files\Mozilla Firefox\distribution\policies.json`

This automatically enables `security.enterprise_roots.enabled` for all users.
:::
