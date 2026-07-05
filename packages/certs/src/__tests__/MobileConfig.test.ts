import { describe, it, expect } from 'vitest';
import { buildMobileConfig } from '../MobileConfig.js';

// A syntactically-valid PEM body (content is arbitrary base64 for the test).
const SAMPLE_PEM = `-----BEGIN CERTIFICATE-----
MIIBFakeCertBodyLine1Base64Content==
MIIBFakeCertBodyLine2Base64Content==
-----END CERTIFICATE-----`;

describe('buildMobileConfig', () => {
  it('produces a valid plist configuration profile', () => {
    const profile = buildMobileConfig(SAMPLE_PEM);
    expect(profile).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(profile).toContain('<!DOCTYPE plist PUBLIC');
    expect(profile).toContain('<key>PayloadType</key>');
    expect(profile).toContain('<string>Configuration</string>');
  });

  it('embeds the CA as a root-trust payload with the DER stripped of PEM armor', () => {
    const profile = buildMobileConfig(SAMPLE_PEM);
    expect(profile).toContain('<string>com.apple.security.root</string>');
    // The base64 DER should be the PEM body with armor + whitespace removed.
    expect(profile).toContain(
      'MIIBFakeCertBodyLine1Base64Content==MIIBFakeCertBodyLine2Base64Content=='
    );
    expect(profile).not.toContain('BEGIN CERTIFICATE');
  });

  it('uses fresh UUIDs for the profile and the certificate payload', () => {
    const profile = buildMobileConfig(SAMPLE_PEM);
    const uuids = [...profile.matchAll(/<key>PayloadUUID<\/key>\s*<string>([0-9A-F-]+)<\/string>/g)].map(
      (m) => m[1]
    );
    expect(uuids).toHaveLength(2);
    expect(uuids[0]).not.toBe(uuids[1]);
    expect(uuids[0]).toMatch(/^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/);
  });

  it('honors custom identifier/display name and escapes XML', () => {
    const profile = buildMobileConfig(SAMPLE_PEM, {
      identifier: 'com.example.test',
      displayName: 'Acme & Co <Root>',
      organization: 'Acme',
    });
    expect(profile).toContain('<string>com.example.test</string>');
    expect(profile).toContain('Acme &amp; Co &lt;Root&gt;');
  });
});
