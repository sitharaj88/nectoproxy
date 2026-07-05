---
title: Mobile Device Capture
description: Capture HTTPS traffic from iOS and Android devices with a one-tap CA install served by the proxy itself at http://necto.setup.
---

# Mobile Device Capture

NectoProxy makes it easy to capture and decrypt traffic from phones and tablets. Point the device's HTTP proxy at your machine, then install the CA certificate through a setup page **served by the proxy itself** -- so it works even when the Web UI is bound to localhost.

## Why `necto.setup`

By default the [control-plane Web UI](./security) binds to `127.0.0.1`, so a phone on your LAN **cannot** reach `http://<your-ip>:8889`. To solve this, the proxy serves a device-setup page on a magic host: **`http://necto.setup`**. Because the request flows through the proxy, NectoProxy intercepts it and returns the setup page directly -- no UI port access required.

::: tip Recognized setup hosts
`necto.setup` is the primary host. `nectoproxy.local` and `necto.it` also resolve to the same setup page.
:::

## Step 1: Point the Device's Proxy at Your Machine

Set the device's Wi-Fi HTTP proxy to your computer's LAN IP and the proxy port (default `8888`). NectoProxy prints the exact address at startup, e.g. `192.168.1.42:8888`.

### iOS (iPhone / iPad)

1. **Settings > Wi-Fi**, tap the **(i)** next to your network.
2. Scroll to **Configure Proxy** and choose **Manual**.
3. **Server:** your computer's IP (e.g. `192.168.1.42`), **Port:** `8888`.
4. Tap **Save**.

### Android

1. **Settings > Network & Internet > Wi-Fi**, long-press your network and choose **Modify network**.
2. Expand **Advanced options** and set **Proxy** to **Manual**.
3. **Proxy hostname:** your computer's IP, **Proxy port:** `8888`.
4. Tap **Save**.

::: tip Same network required
The device and your computer must be on the same LAN, and the proxy must be reachable (`--host` defaults to `0.0.0.0`). Make sure your firewall allows inbound connections on the proxy port.
:::

## Step 2: Open `http://necto.setup`

On the device, open a browser and navigate to:

```
http://necto.setup
```

The proxy serves a small setup page with two install options -- one for iOS, one for Android/desktop.

### Scan the QR code instead

When you run `nectoproxy start`, the CLI prints a scannable **QR code** that encodes `http://necto.setup`. Point the device camera at it and open the link -- no typing required.

```
  Mobile Setup: http://necto.setup
  1. Set the device's HTTP proxy to 192.168.1.42:8888
  2. Open http://necto.setup on the device (or scan below) and install the CA.

  [QR code]
```

## Step 3: Install the CA Certificate

### iOS -- one-tap profile

1. On the setup page, tap **Install profile**. This downloads a signed `.mobileconfig` profile (`nectoproxy-ca.mobileconfig`).
2. iOS prompts to allow the profile download -- tap **Allow**.
3. Open **Settings**. A **Profile Downloaded** banner appears near the top -- tap it, then tap **Install** and enter your passcode.
4. **Enable full trust:** go to **Settings > General > About > Certificate Trust Settings** and toggle **on** the NectoProxy CA.

::: warning Both steps are required on iOS
Installing the profile is not enough. Apple requires you to also **enable full trust** under Certificate Trust Settings. Until you do, HTTPS interception will fail with certificate warnings.
:::

### Android / Desktop -- `.crt` download

1. On the setup page, tap **Download certificate**. This downloads a `nectoproxy-ca.crt` file.
2. Install it as a trusted CA:
   - **Android 11+:** Settings > Security > Encryption & credentials > Install a certificate > CA certificate, then select the file.
   - **Android 7-10:** Settings > Security > Install from storage, name it, and choose **VPN and apps**.

::: warning Android 7+ app traffic
Since Android 7 (Nougat), user-installed CAs are trusted by browsers but **not by apps** unless the app opts in via its network security configuration. Browser traffic works out of the box; native-app traffic may require a debug build, a rooted device, or an emulator with a writable system partition. See [Mobile Device Certificate Setup](/certificate/mobile) for the full details and workarounds.
:::

## Step 4: Browse and Capture

With the proxy set and the CA trusted, open any app or browser on the device. Traffic appears in the NectoProxy Web UI (on your computer) in real time, with full URLs, headers, and decrypted bodies.

## The `/setup` Page on the UI Server

The UI server also exposes a token-free `/setup` page (`http://localhost:8889/setup`) that renders the same device-setup landing content. This is convenient when you are working from the host machine, but for phones the `http://necto.setup` route is preferred because it does not require reaching the UI port.

## Cleaning Up

When you are done:

1. **Remove the proxy** from the device's Wi-Fi settings (set it back to **None/Off**), otherwise the device loses connectivity once NectoProxy stops.
2. Optionally remove the CA:
   - **iOS:** Settings > General > VPN & Device Management > NectoProxy CA > Remove Profile.
   - **Android:** Settings > Security > Encryption & credentials > Trusted credentials > User tab > NectoProxy CA > Remove.

## See Also

- [Mobile Device Certificate Setup](/certificate/mobile) -- detailed, version-by-version certificate instructions
- [Debugging Mobile Apps](/guides/debugging-mobile) -- an end-to-end tutorial
- [Security & Session Token](./security) -- why the UI is localhost-only by default
