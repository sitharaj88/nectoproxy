# Mobile Device Certificate Setup

This guide covers setting up the NectoProxy CA certificate on iOS and Android devices so you can inspect HTTPS traffic from mobile apps and browsers.

## Prerequisites

Before setting up a mobile device, ensure:

1. **NectoProxy is running** on your computer. NectoProxy binds to all interfaces by default, so mobile devices on the same network can connect:

    ```bash
    nectoproxy start
    ```

2. **Your mobile device and computer are on the same Wi-Fi network.**

3. **Know your computer's local IP address** (e.g., `192.168.1.100`). Find it with:

    ```bash
    # macOS
    ipconfig getifaddr en0

    # Linux
    hostname -I | awk '{print $1}'

    # Windows
    ipconfig
    ```

## iOS Setup

### Step 1: Configure the Wi-Fi Proxy

1. Open **Settings** on your iPhone or iPad.
2. Tap **Wi-Fi**.
3. Tap the **(i)** icon next to your connected Wi-Fi network.
4. Scroll down and tap **Configure Proxy**.
5. Select **Manual**.
6. Enter:
   - **Server**: Your computer's local IP address (e.g., `192.168.1.100`)
   - **Port**: `8888`
   - **Authentication**: Leave off
7. Tap **Save**.

### Step 2: Download the CA Certificate

1. Open **Safari** (you must use Safari -- other browsers will not trigger the certificate install flow).
2. Navigate to: `http://<your-computer-ip>:8889/cert`
   - For example: `http://192.168.1.100:8889/cert`
   - This URL is served by the NectoProxy Web UI and provides the CA certificate for download.

::: tip Alternative: Transfer the Certificate File
If the download URL does not work, you can transfer the `ca.pem` file to your iOS device via AirDrop, email, or iCloud Drive, then open it from the Files app.
:::

3. A prompt will appear: "This website is trying to download a configuration profile. Do you want to allow this?"
4. Tap **Allow**.

### Step 3: Install the Certificate Profile

1. Open **Settings**.
2. A new option appears near the top: **Profile Downloaded**. Tap it.
   - If you do not see this, go to Settings > General > VPN & Device Management (or "Profiles" on older iOS versions).
3. Tap **Install** in the top-right corner.
4. Enter your device passcode if prompted.
5. Tap **Install** again on the warning screen.
6. Tap **Done**.

### Step 4: Trust the Root Certificate

Installing the profile is not enough -- you must also explicitly trust the certificate for SSL/TLS:

1. Open **Settings > General > About > Certificate Trust Settings**.
2. Under "Enable Full Trust for Root Certificates", find the NectoProxy CA certificate.
3. Toggle the switch **on** to enable full trust.
4. Tap **Continue** on the warning dialog.

::: warning Both Steps Required
On iOS, you must both **install** the profile (Step 3) and **enable trust** (Step 4). Skipping either step will result in certificate warnings.
:::

### Verify on iOS

1. Open Safari and navigate to any HTTPS website.
2. The page should load without certificate warnings.
3. Check the NectoProxy Web UI on your computer to see the captured traffic.

### Remove on iOS

1. Go to Settings > General > VPN & Device Management (or Profiles).
2. Tap the NectoProxy profile.
3. Tap **Remove Profile** and confirm.
4. Remember to also reset your proxy settings: Settings > Wi-Fi > (i) > Configure Proxy > Off.

---

## Android Setup

### Step 1: Configure the Wi-Fi Proxy

1. Open **Settings** on your Android device.
2. Tap **Network & Internet** (or **Wi-Fi**, depending on your device).
3. Long-press your connected Wi-Fi network and select **Modify network** (or tap the gear icon).
4. Tap **Advanced options** to expand additional settings.
5. Under **Proxy**, select **Manual**.
6. Enter:
   - **Proxy hostname**: Your computer's local IP address (e.g., `192.168.1.100`)
   - **Proxy port**: `8888`
   - **Bypass proxy for**: Leave empty
7. Tap **Save**.

### Step 2: Download the CA Certificate

1. Open your browser (Chrome works well).
2. Navigate to: `http://<your-computer-ip>:8889/cert`
   - For example: `http://192.168.1.100:8889/cert`
3. The certificate file (`ca.pem` or `ca.crt`) will download to your device.

::: tip Alternative: Transfer the File
You can also transfer the `ca.pem` file to your device via USB, email, or cloud storage. Rename it to `nectoproxy-ca.crt` before transferring, as Android recognizes the `.crt` extension more reliably.
:::

### Step 3: Install the Certificate

The exact steps vary by Android version and manufacturer:

**Android 11 and later:**

1. Open **Settings > Security > More security settings > Encryption & credentials** (or Settings > Security > Advanced > Encryption & credentials).
2. Tap **Install a certificate** (or **Install from storage**).
3. Select **CA certificate**.
4. You will see a warning about CA certificates. Tap **Install anyway**.
5. Select the downloaded certificate file.
6. The certificate is installed.

**Android 7-10:**

1. Open **Settings > Security > Install from storage** (or Settings > Security & lock screen > Encryption & credentials > Install from storage).
2. Navigate to the downloaded certificate file and select it.
3. Give it a name (e.g., "NectoProxy CA").
4. Under **Credential use**, select **VPN and apps** or **Wi-Fi**.
5. Tap **OK**.

::: warning Android 7+ User Certificate Limitations
Starting with Android 7 (Nougat), Google changed how user-installed CA certificates work:

- **User-installed CA certificates are only trusted by the browser**, not by apps by default.
- Apps targeting API level 24+ (Android 7+) do **not** trust user-added CAs unless the app's `network_security_config.xml` explicitly allows it.
- This means you can inspect browser traffic without issues, but **native app traffic may not be interceptible** unless the app opts in.

**Workarounds for inspecting app traffic on Android 7+:**

1. **Debug builds**: If you control the app, add a network security configuration that trusts user CAs:

    ```xml
    <!-- res/xml/network_security_config.xml -->
    <network-security-config>
      <debug-overrides>
        <trust-anchors>
          <certificates src="user" />
        </trust-anchors>
      </debug-overrides>
    </network-security-config>
    ```

2. **Rooted device**: Install the certificate as a system CA in `/system/etc/security/cacerts/`.

3. **Android emulator**: Use an emulator with a writable system partition and install the certificate at the system level.
:::

### Verify on Android

1. Open Chrome and navigate to any HTTPS website.
2. The page should load without certificate warnings.
3. Check the NectoProxy Web UI on your computer to see the captured traffic.

### Remove on Android

1. Go to Settings > Security > Encryption & credentials > Trusted credentials.
2. Tap the **User** tab.
3. Find the NectoProxy CA certificate and tap it.
4. Tap **Remove** (or **Disable**).
5. Remember to also reset your proxy settings: Wi-Fi network settings > Proxy > None.

---

## Troubleshooting

### No Traffic Appearing in NectoProxy

- **Verify NectoProxy is listening on all interfaces**: Make sure you did not start NectoProxy with `--host 127.0.0.1`, which restricts access to localhost only. The default (`0.0.0.0`) allows LAN connections.
- **Same network**: Confirm your mobile device and computer are on the same Wi-Fi network.
- **Firewall**: Check that your computer's firewall allows incoming connections on port 8888 and 8889.
- **Correct IP**: Double-check the computer's IP address. It may change if you reconnect to Wi-Fi.

### Certificate Download URL Not Working

If `http://<ip>:8889/cert` does not work:

- Try accessing the NectoProxy Web UI directly: `http://<ip>:8889`. If this does not load, there is a network connectivity issue.
- Manually transfer the certificate file from `~/.nectoproxy/certs/ca.pem` to your mobile device.

### iOS: "Profile Downloaded" Not Appearing

- Make sure you opened the certificate URL in **Safari**, not Chrome or another browser.
- Go to Settings > General > VPN & Device Management to check if the profile is listed there.
- Try restarting the Settings app.

### Android: App Traffic Not Captured

This is expected behavior on Android 7+ due to network security configuration changes. See the [Android 7+ User Certificate Limitations](#android-setup) section above for workarounds.

::: details Testing with Android Emulator
For the most reliable Android debugging experience, use an Android emulator with Google APIs (not Google Play) image. These images have a writable system partition, allowing you to install the certificate at the system level:

```bash
# Push the certificate to the emulator's system CA store
adb root
adb remount
adb push ~/.nectoproxy/certs/ca.pem /system/etc/security/cacerts/nectoproxy.0
adb shell chmod 644 /system/etc/security/cacerts/nectoproxy.0
adb reboot
```

After reboot, the certificate will be a system-trusted CA, and all apps will trust it regardless of their network security configuration.
:::
