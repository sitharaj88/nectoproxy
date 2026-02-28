# Windows Certificate Setup

This guide explains how to install the NectoProxy root CA certificate on Windows so that HTTPS traffic can be intercepted without browser warnings.

## Method 1: PowerShell (Recommended)

Open **PowerShell as Administrator** (right-click PowerShell and select "Run as administrator") and run:

```powershell
Import-Certificate -FilePath "$env:USERPROFILE\.nectoproxy\certs\ca.pem" `
  -CertStoreLocation Cert:\LocalMachine\Root
```

::: tip What This Command Does
- `Import-Certificate` -- Imports a certificate file into a Windows certificate store.
- `-FilePath` -- Path to the NectoProxy CA certificate.
- `-CertStoreLocation Cert:\LocalMachine\Root` -- Installs it into the Trusted Root Certification Authorities store for the local machine, so it is trusted by all users.
:::

You may see a security prompt asking you to confirm the installation of a root certificate. Click **Yes** to proceed.

### User-Level Install (No Admin Required)

If you do not have administrator access, you can install the certificate for your user account only:

```powershell
Import-Certificate -FilePath "$env:USERPROFILE\.nectoproxy\certs\ca.pem" `
  -CertStoreLocation Cert:\CurrentUser\Root
```

::: warning User vs Machine Store
A user-level certificate (`Cert:\CurrentUser\Root`) is only trusted for your user account. Other users on the machine will still see certificate warnings. For shared machines, use the machine-level store (`Cert:\LocalMachine\Root`) with administrator privileges.
:::

## Method 2: Certificate Manager GUI

If you prefer a graphical approach:

1. **Open the Certificate Manager**
   - Press `Win + R`, type `certmgr.msc`, and press Enter.
   - This opens the certificate manager for the current user.
   - For the machine-level store, use `certlm.msc` instead (requires administrator).

2. **Navigate to Trusted Root Certification Authorities**
   - In the left panel, expand **Trusted Root Certification Authorities**.
   - Click on **Certificates**.

3. **Import the certificate**
   - Right-click on **Certificates** and select **All Tasks > Import**.
   - The Certificate Import Wizard opens. Click **Next**.
   - Click **Browse** and navigate to `%USERPROFILE%\.nectoproxy\certs\`.
   - Change the file type filter to **All Files (*.*)** (the `.pem` extension may not show with the default filter).
   - Select `ca.pem` and click **Open**.
   - Click **Next**.

4. **Select the certificate store**
   - Ensure **Place all certificates in the following store** is selected.
   - The store should show **Trusted Root Certification Authorities**.
   - Click **Next**, then **Finish**.

5. **Confirm the security warning**
   - A security warning dialog will appear asking if you want to install the certificate. Click **Yes**.
   - You should see a message: "The import was successful."

## Verify Installation

### Via PowerShell

```powershell
Get-ChildItem Cert:\LocalMachine\Root | Where-Object { $_.Subject -like "*NectoProxy*" }
```

If the certificate is installed, this command will display its details including thumbprint and subject.

### Via Browser

1. Open Microsoft Edge or Google Chrome (both use the Windows certificate store).
2. Make sure your proxy is set to `127.0.0.1:8888`.
3. Navigate to any HTTPS website (e.g., `https://example.com`).
4. The page should load without any certificate warnings.
5. Click the lock icon in the address bar to inspect the certificate chain.

## Removing the Certificate

### Via PowerShell (Administrator)

```powershell
Get-ChildItem Cert:\LocalMachine\Root | `
  Where-Object { $_.Subject -like "*NectoProxy*" } | `
  Remove-Item
```

### Via Certificate Manager GUI

1. Open `certmgr.msc` (or `certlm.msc` for machine-level).
2. Navigate to **Trusted Root Certification Authorities > Certificates**.
3. Find the NectoProxy CA certificate.
4. Right-click and select **Delete**.
5. Confirm the deletion.

## Troubleshooting

### "Access Denied" When Running Import-Certificate

- Make sure you are running PowerShell **as Administrator** when using `Cert:\LocalMachine\Root`.
- Right-click on PowerShell or Windows Terminal and select "Run as administrator".

### Certificate Imported but Browser Still Shows Warnings

- **Restart the browser**: Close all browser windows completely and reopen. Some browsers cache trust decisions.
- **Check the store location**: Verify the certificate is in **Trusted Root Certification Authorities**, not in **Personal** or another store.
- **Edge/Chrome vs Firefox**: Edge and Chrome use the Windows certificate store. Firefox uses its own store. If you are using Firefox, see the [Firefox Certificate Setup](/certificate/firefox) guide.

### File Not Found

If the certificate file is not found at the expected path:

1. Make sure NectoProxy has been run at least once (`nectoproxy start`). The CA certificate is generated on first run.
2. Verify the file exists:

   ```powershell
   Test-Path "$env:USERPROFILE\.nectoproxy\certs\ca.pem"
   ```

3. Check the exact path by running:

   ```bash
   nectoproxy cert --path
   ```

### .pem File Extension Not Visible in File Browser

When using the GUI import method, change the file type filter dropdown from "X.509 Certificate (*.cer, *.crt)" to **"All Files (*.*)"** to see `.pem` files.

::: details Windows Subsystem for Linux (WSL)
If you are running NectoProxy inside WSL, the certificate path will be within the WSL filesystem. To install it in the Windows certificate store, first copy the certificate to a Windows-accessible path:

```bash
# Inside WSL
cp ~/.nectoproxy/certs/ca.pem /mnt/c/Users/$USER/nectoproxy-ca.pem
```

Then import it from PowerShell on the Windows side:

```powershell
Import-Certificate -FilePath "C:\Users\$env:USERNAME\nectoproxy-ca.pem" `
  -CertStoreLocation Cert:\LocalMachine\Root
```
:::
