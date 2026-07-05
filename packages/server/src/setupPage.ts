/**
 * A self-contained, token-free device-setup landing page. A phone that scans the
 * QR printed by the CLI lands here and can install the CA in a couple of taps.
 * No secrets are exposed — it only links to the (auth-exempt) CA download
 * endpoints and shows platform instructions.
 */
export function buildSetupPage(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>NectoProxy — Device Setup</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #0b0f17; color: #e6edf3; line-height: 1.55; }
  @media (prefers-color-scheme: light) { body { background: #f6f8fa; color: #1f2328; } }
  .wrap { max-width: 640px; margin: 0 auto; padding: 24px 20px 64px; }
  h1 { font-size: 1.5rem; margin: 8px 0 4px; }
  .sub { opacity: .7; margin: 0 0 24px; }
  .card { border: 1px solid rgba(128,128,128,.28); border-radius: 14px; padding: 18px 18px 20px; margin: 14px 0; background: rgba(128,128,128,.06); }
  .card h2 { font-size: 1.05rem; margin: 0 0 8px; display: flex; align-items: center; gap: 8px; }
  ol { margin: 10px 0 0; padding-left: 20px; }
  li { margin: 4px 0; }
  a.btn { display: inline-block; margin-top: 12px; padding: 11px 18px; border-radius: 10px;
    background: #2f81f7; color: #fff; text-decoration: none; font-weight: 600; }
  a.btn.secondary { background: rgba(128,128,128,.22); color: inherit; }
  code { background: rgba(128,128,128,.18); padding: 1px 6px; border-radius: 5px; font-size: .9em; }
  .note { font-size: .85rem; opacity: .7; margin-top: 18px; }
</style>
</head>
<body>
<div class="wrap">
  <h1>NectoProxy — Device Setup</h1>
  <p class="sub">Install the NectoProxy CA so HTTPS traffic can be inspected. First set this device's HTTP proxy to this machine, then install the certificate below.</p>

  <div class="card">
    <h2>iPhone / iPad</h2>
    <ol>
      <li>Tap <b>Install profile</b> and confirm the download.</li>
      <li>Open <b>Settings → Profile Downloaded</b> and tap <b>Install</b>.</li>
      <li>Go to <b>Settings → General → About → Certificate Trust Settings</b> and enable full trust for <b>NectoProxy CA</b>.</li>
    </ol>
    <a class="btn" href="/api/certificates/mobileconfig">Install profile</a>
  </div>

  <div class="card">
    <h2>Android</h2>
    <ol>
      <li>Tap <b>Download certificate</b>.</li>
      <li>Open <b>Settings → Security → Encryption &amp; credentials → Install a certificate → CA certificate</b> and select the downloaded file.</li>
      <li>Note: many apps ignore user CAs; a rooted device or per-app config may be required for app traffic.</li>
    </ol>
    <a class="btn secondary" href="/api/certificates/download">Download certificate</a>
  </div>

  <div class="card">
    <h2>macOS / Desktop</h2>
    <ol>
      <li>Download the certificate, then add it to your system trust store as a trusted root.</li>
    </ol>
    <a class="btn secondary" href="/api/certificates/download">Download certificate</a>
    &nbsp;
    <a class="btn secondary" href="/api/certificates/mobileconfig">Profile (.mobileconfig)</a>
  </div>

  <p class="note">Only install this certificate on devices you own and control. It lets NectoProxy decrypt this device's HTTPS traffic.</p>
</div>
</body>
</html>`;
}
