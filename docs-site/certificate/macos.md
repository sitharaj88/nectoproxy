# macOS Certificate Setup

This guide explains how to install the NectoProxy root CA certificate on macOS so that HTTPS traffic can be intercepted without browser warnings.

## Method 1: Command Line (Recommended)

Open Terminal and run the following command:

```bash
sudo security add-trusted-cert -d -r trustRoot \
  -k /Library/Keychains/System.keychain \
  ~/.nectoproxy/certs/ca.pem
```

You will be prompted for your administrator password. Once entered, the certificate is immediately trusted system-wide.

::: tip What This Command Does
- `security add-trusted-cert` -- Adds a certificate to a keychain and marks it as trusted.
- `-d` -- Adds the certificate to the admin trust settings (not just the user).
- `-r trustRoot` -- Marks it as a trusted root certificate.
- `-k /Library/Keychains/System.keychain` -- Installs it into the System keychain so all users on the machine trust it.
:::

## Method 2: Keychain Access (GUI)

If you prefer a graphical approach:

1. **Open Keychain Access**
   - Press `Cmd + Space`, type "Keychain Access", and press Enter.
   - Or navigate to Applications > Utilities > Keychain Access.

2. **Select the System keychain**
   - In the left sidebar, click **System** under "System Keychains".

3. **Import the certificate**
   - Go to File > Import Items (or press `Shift + Cmd + I`).
   - Navigate to `~/.nectoproxy/certs/` and select `ca.pem`.
   - Click Open.

4. **Trust the certificate**
   - Find the newly imported certificate in the list (it will be named "NectoProxy CA" or similar).
   - Double-click the certificate to open its details.
   - Expand the **Trust** section.
   - Set **When using this certificate** to **Always Trust**.
   - Close the dialog. You will be prompted for your administrator password.

5. **Confirm trust**
   - The certificate should now show a blue "+" icon indicating it is trusted.

## Verify Installation

After installing the certificate, verify it is trusted:

### Via Command Line

```bash
security find-certificate -a -c "NectoProxy" /Library/Keychains/System.keychain
```

If the certificate is found, the output will display its details.

### Via Browser

1. Open Safari or Chrome.
2. Make sure your proxy is set to `127.0.0.1:8888`.
3. Navigate to any HTTPS website (e.g., `https://example.com`).
4. The page should load without any certificate warnings.
5. Click the lock icon in the address bar to verify the certificate chain includes the NectoProxy CA.

## Removing the Certificate

To remove the NectoProxy CA certificate when you no longer need it:

### Via Command Line

```bash
sudo security delete-certificate -c "NectoProxy" /Library/Keychains/System.keychain
```

### Via Keychain Access

1. Open Keychain Access.
2. Select the **System** keychain.
3. Find the NectoProxy CA certificate.
4. Right-click and select **Delete**.
5. Confirm deletion and enter your administrator password.

## Troubleshooting

### "The certificate is not trusted"

If you installed the certificate but browsers still show warnings:

- **Verify trust settings**: Open the certificate in Keychain Access and confirm the Trust section shows "Always Trust".
- **Restart your browser**: Some browsers cache certificate trust decisions. Close and reopen the browser completely.
- **Check the keychain**: Ensure the certificate is in the **System** keychain, not the **login** keychain. Certificates in the login keychain may not be trusted by all applications.

### Firefox Still Shows Warnings

Firefox uses its own certificate store and does not use the macOS System keychain by default. See the [Firefox Certificate Setup](/certificate/firefox) guide for Firefox-specific instructions.

### Permission Denied

If you get a permission error when running the `security` command:

- Make sure you are using `sudo`.
- Verify your user account has administrator privileges.

::: warning Corporate / MDM Managed Macs
On managed Macs with MDM profiles, the System keychain may be locked or restricted. Contact your IT administrator, or install the certificate in the **login** keychain instead (it will only be trusted for your user account):

```bash
security add-trusted-cert -r trustRoot \
  -k ~/Library/Keychains/login.keychain-db \
  ~/.nectoproxy/certs/ca.pem
```
:::
