# Debugging Mobile Apps

**Difficulty:** Intermediate | **Time:** 15 minutes

This tutorial shows you how to capture and inspect HTTP/HTTPS traffic from iOS and Android devices using NectoProxy. By routing your phone's traffic through NectoProxy, you can see every API call, debug network issues, and even mock or modify responses on the fly.

## Prerequisites

- NectoProxy installed on your computer
- Your computer and mobile device connected to the **same Wi-Fi network**
- Physical access to the mobile device you want to debug

## Step 1: Start NectoProxy

NectoProxy binds to all network interfaces (`0.0.0.0`) by default, so your phone can connect without any special flags:

```bash
nectoproxy start
```

NectoProxy will display your LAN IP address at startup (e.g., `http://192.168.1.42:8888`). Note this address -- you will need it to configure your phone.

::: danger Security Note
Since NectoProxy listens on all interfaces by default, it is accessible to your entire local network. Only use it on trusted networks (e.g., your home or office Wi-Fi). If you want to restrict to localhost only, use `--host 127.0.0.1`.
:::

## Step 2: Find Your Computer's IP Address

You need your computer's local IP address so your phone knows where to send traffic. NectoProxy shows available addresses in the Settings panel.

### Via the Web UI

1. Open the NectoProxy Web UI at `http://localhost:8889`.
2. Click the **gear icon** to open Settings.
3. Scroll down to the **Mobile Configuration** section.
4. Your computer's IP addresses and network interfaces are listed there (e.g., `192.168.1.42`).

### Via the Terminal

```bash
# macOS
ifconfig | grep "inet " | grep -v 127.0.0.1

# Linux
hostname -I

# Windows
ipconfig | findstr /i "IPv4"
```

Look for an address on your local network, typically starting with `192.168.`, `10.`, or `172.16-31.`.

::: tip
If you have multiple network interfaces (e.g., Ethernet and Wi-Fi), use the IP address of the interface that is on the same network as your phone.
:::

## Step 3: Configure Your Phone's Wi-Fi Proxy

### iOS (iPhone / iPad)

1. Open **Settings** on your iPhone.
2. Tap **Wi-Fi**.
3. Tap the **info button (i)** next to your connected Wi-Fi network.
4. Scroll down to **HTTP Proxy** and tap **Configure Proxy**.
5. Select **Manual**.
6. Enter:
   - **Server:** Your computer's IP address (e.g., `192.168.1.42`)
   - **Port:** `8888` (or your custom proxy port)
   - **Authentication:** Leave off
7. Tap **Save**.

### Android

1. Open **Settings** on your Android device.
2. Tap **Network & Internet** (or **Wi-Fi**, depending on your device).
3. Long-press on your connected Wi-Fi network, then tap **Modify network** (or tap the gear icon).
4. Tap **Advanced options** (or expand advanced settings).
5. Change **Proxy** from **None** to **Manual**.
6. Enter:
   - **Proxy hostname:** Your computer's IP address (e.g., `192.168.1.42`)
   - **Proxy port:** `8888`
   - **Bypass proxy for:** Leave empty
7. Tap **Save**.

::: warning
The exact steps vary slightly between Android manufacturers (Samsung, Pixel, OnePlus, etc.). The general flow is the same: Wi-Fi settings, select your network, set proxy to Manual, and enter the IP and port.
:::

## Step 4: Install the CA Certificate

Without the CA certificate, your phone will show security errors for all HTTPS traffic. Because the Web UI binds to localhost by default, the proxy serves a device-setup page on the magic host **`http://necto.setup`** -- it works even though the UI is not reachable from the phone.

### Method A: `http://necto.setup` (Recommended)

1. With the proxy already configured on your phone, open a browser and go to:

   ```
   http://necto.setup
   ```

2. The proxy returns a setup page with two options:
   - **iOS:** tap **Install profile** to download the one-tap `.mobileconfig`.
   - **Android / Desktop:** tap **Download certificate** to get the `.crt`.

### Method B: Scan the QR Code

When you run `nectoproxy start`, the CLI prints a scannable **QR code** that encodes `http://necto.setup`.

1. Point your phone's **Camera app** at the QR code in the terminal.
2. Tap the link that appears to open `http://necto.setup`.
3. Follow the prompts to download and install the certificate.

### Installing the Downloaded Certificate

#### iOS

1. After downloading, a prompt appears asking to install the profile. Tap **Allow**.
2. Go to **Settings** > **General** > **VPN & Device Management** (or **Profile & Device Management**).
3. Tap the **NectoProxy CA** profile and tap **Install**.
4. Enter your passcode if prompted, then tap **Install** again.
5. **Important:** Go to **Settings** > **General** > **About** > **Certificate Trust Settings**.
6. Toggle **Enable Full Trust** for the NectoProxy CA certificate.

::: danger
On iOS, you must complete both steps: installing the profile AND enabling full trust. The certificate will not work for HTTPS interception until full trust is enabled.
:::

#### Android

1. After downloading, you may see a prompt to install the certificate. If so, follow it.
2. If no prompt appears, go to **Settings** > **Security** (or **Security & Privacy**) > **Encryption & Credentials** > **Install a certificate** > **CA certificate**.
3. Select the downloaded certificate file.
4. Confirm the installation.

::: warning
On Android 7.0 (Nougat) and later, user-installed CA certificates are not trusted by apps by default. Apps must explicitly opt in via their network security configuration. System apps and browsers will work, but some apps may still reject the certificate. For those apps, add the domain to SSL passthrough in NectoProxy settings.
:::

## Step 5: Browse on Your Phone

With the proxy configured and the CA certificate installed, open any app or browser on your phone. You should see traffic appearing in the NectoProxy Web UI in real time.

Things to verify:

- HTTP requests appear immediately in the traffic list.
- HTTPS requests appear with full URL, headers, and bodies (not just the CONNECT tunnel).
- The phone's browser does not show certificate errors for standard websites.

::: tip
If traffic is not appearing, double-check:
1. Your phone is on the **same Wi-Fi network** as your computer.
2. The proxy settings are saved (try opening a website in the phone's browser).
3. NectoProxy is not restricted to localhost (avoid using `--host 127.0.0.1` when debugging mobile).
4. Your computer's firewall is not blocking port 8888.
:::

## Step 6: Using the QR Code Feature

The `nectoproxy start` output includes a scannable QR code that encodes `http://necto.setup`. This is the fastest way to reach the setup page from your phone:

1. Make sure the phone's proxy is already pointed at your machine (Step 3).
2. Point your phone's camera at the QR code printed in the terminal.
3. Tap the link to open `http://necto.setup`, then install the CA.

Because the setup page is served by the proxy itself, this works even though the Web UI binds to localhost by default.

## Cleaning Up

When you are done debugging, remember to:

1. **Remove the proxy settings** from your phone's Wi-Fi configuration (set proxy back to **None**).
2. **Optionally remove the CA certificate** from your phone if you no longer need it.

### Removing the CA Certificate

**iOS:** Settings > General > VPN & Device Management > NectoProxy CA > Remove Profile

**Android:** Settings > Security > Encryption & Credentials > Trusted Credentials > User tab > NectoProxy CA > Remove

::: warning
Leaving the proxy settings configured on your phone after stopping NectoProxy will cause your phone to lose internet connectivity, because it will try to route all traffic through a proxy that no longer exists.
:::

## Tips for Mobile Debugging

- **Use the filter bar** in NectoProxy to focus on traffic from your app's API domain, reducing noise from background system requests.
- **Create mock rules** for APIs your mobile app calls to test edge cases without modifying server code.
- **Use SSL Passthrough** for domains you do not need to inspect (e.g., analytics, crash reporting). This avoids certificate pinning issues with SDKs that do not trust user-installed CAs.
- **Check the WebSocket tab** if your mobile app uses real-time communications. WebSocket frames are captured alongside regular HTTP traffic.
