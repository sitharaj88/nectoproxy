import crypto from 'node:crypto';

export interface MobileConfigOptions {
  /** Reverse-DNS identifier prefix for the profile. */
  identifier?: string;
  /** Display name shown on the device when installing. */
  displayName?: string;
  /** Organization shown in the profile. */
  organization?: string;
}

const DEFAULTS = {
  identifier: 'in.sitharaj.nectoproxy',
  displayName: 'NectoProxy CA Certificate',
  organization: 'NectoProxy',
};

/** Strip PEM armor/whitespace to the raw base64 DER body used in a profile <data>. */
function pemToBase64Der(pem: string): string {
  return pem
    .replace(/-----BEGIN CERTIFICATE-----/g, '')
    .replace(/-----END CERTIFICATE-----/g, '')
    .replace(/\s+/g, '');
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Build an Apple `.mobileconfig` configuration profile that installs the
 * NectoProxy root CA as a trusted root. iOS/iPadOS/macOS users can download and
 * install this in a couple of taps instead of hand-copying a `.pem` — the same
 * one-tap setup competitors charge for. After install, iOS users must still
 * enable full trust under Settings → General → About → Certificate Trust
 * Settings (Apple requires this manual step for user-installed roots).
 */
export function buildMobileConfig(caPem: string, options: MobileConfigOptions = {}): string {
  const opts = { ...DEFAULTS, ...options };
  const der = pemToBase64Der(caPem);
  const certUuid = crypto.randomUUID().toUpperCase();
  const profileUuid = crypto.randomUUID().toUpperCase();

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadContent</key>
  <array>
    <dict>
      <key>PayloadCertificateFileName</key>
      <string>nectoproxy-ca.crt</string>
      <key>PayloadContent</key>
      <data>${der}</data>
      <key>PayloadDescription</key>
      <string>Installs the ${xmlEscape(opts.organization)} root certificate authority.</string>
      <key>PayloadDisplayName</key>
      <string>${xmlEscape(opts.organization)} CA</string>
      <key>PayloadIdentifier</key>
      <string>${xmlEscape(opts.identifier)}.ca</string>
      <key>PayloadType</key>
      <string>com.apple.security.root</string>
      <key>PayloadUUID</key>
      <string>${certUuid}</string>
      <key>PayloadVersion</key>
      <integer>1</integer>
    </dict>
  </array>
  <key>PayloadDescription</key>
  <string>Trust the ${xmlEscape(opts.organization)} CA so HTTPS traffic can be inspected.</string>
  <key>PayloadDisplayName</key>
  <string>${xmlEscape(opts.displayName)}</string>
  <key>PayloadIdentifier</key>
  <string>${xmlEscape(opts.identifier)}</string>
  <key>PayloadOrganization</key>
  <string>${xmlEscape(opts.organization)}</string>
  <key>PayloadRemovalDisallowed</key>
  <false/>
  <key>PayloadType</key>
  <string>Configuration</string>
  <key>PayloadUUID</key>
  <string>${profileUuid}</string>
  <key>PayloadVersion</key>
  <integer>1</integer>
</dict>
</plist>
`;
}
