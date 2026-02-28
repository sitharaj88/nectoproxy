import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CertificateManager } from '../CertificateManager.js';

describe('CertificateManager', () => {
  let tmpDir: string;
  let certManager: CertificateManager;

  beforeEach(async () => {
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'nectoproxy-test-'));
    certManager = new CertificateManager({
      certsDir: path.join(tmpDir, 'certs'),
      caName: 'Test CA',
      caValidityDays: 1,
      certValidityDays: 1,
      keySize: 2048,
    });
  });

  afterEach(async () => {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  });

  describe('initialize', () => {
    it('creates certs directory structure', async () => {
      await certManager.initialize();
      const certsDir = path.join(tmpDir, 'certs');
      const domainsDir = path.join(certsDir, 'domains');
      expect(fs.existsSync(certsDir)).toBe(true);
      expect(fs.existsSync(domainsDir)).toBe(true);
    });

    it('generates CA certificate on first run', async () => {
      await certManager.initialize();
      const caPath = path.join(tmpDir, 'certs', 'ca.pem');
      const keyPath = path.join(tmpDir, 'certs', 'ca-key.pem');
      expect(fs.existsSync(caPath)).toBe(true);
      expect(fs.existsSync(keyPath)).toBe(true);
    });

    it('loads existing CA certificate on second run', async () => {
      await certManager.initialize();
      const ca1 = certManager.getCACertificatePem();

      // Create new instance and initialize again
      const certManager2 = new CertificateManager({
        certsDir: path.join(tmpDir, 'certs'),
      });
      await certManager2.initialize();
      const ca2 = certManager2.getCACertificatePem();

      expect(ca1).toBe(ca2);
    });
  });

  describe('getCACertificate', () => {
    it('returns null before initialization', () => {
      expect(certManager.getCACertificate()).toBeNull();
    });

    it('returns CA certificate after initialization', async () => {
      await certManager.initialize();
      const ca = certManager.getCACertificate();
      expect(ca).not.toBeNull();
      expect(ca!.cert).toBeDefined();
      expect(ca!.key).toBeDefined();
    });
  });

  describe('getCACertificatePem', () => {
    it('throws before initialization', () => {
      expect(() => certManager.getCACertificatePem()).toThrow('Certificate manager not initialized');
    });

    it('returns PEM string after initialization', async () => {
      await certManager.initialize();
      const pem = certManager.getCACertificatePem();
      expect(pem).toContain('-----BEGIN CERTIFICATE-----');
    });
  });

  describe('getCertificateForDomain', () => {
    it('generates certificate for a domain', async () => {
      await certManager.initialize();
      const cert = await certManager.getCertificateForDomain('example.com');
      expect(cert.cert).toContain('-----BEGIN CERTIFICATE-----');
      expect(cert.key).toContain('-----BEGIN RSA PRIVATE KEY-----');
      expect(cert.domain).toBe('example.com');
    });

    it('returns cached certificate on second call', async () => {
      await certManager.initialize();
      const cert1 = await certManager.getCertificateForDomain('example.com');
      const cert2 = await certManager.getCertificateForDomain('example.com');
      expect(cert1.cert).toBe(cert2.cert);
    });

    it('normalizes domain (removes port, lowercases)', async () => {
      await certManager.initialize();
      const cert1 = await certManager.getCertificateForDomain('Example.COM:443');
      const cert2 = await certManager.getCertificateForDomain('example.com');
      expect(cert1.cert).toBe(cert2.cert);
    });

    it('generates different certificates for different domains', async () => {
      await certManager.initialize();
      const cert1 = await certManager.getCertificateForDomain('example.com');
      const cert2 = await certManager.getCertificateForDomain('other.com');
      expect(cert1.cert).not.toBe(cert2.cert);
    });

    it('caches domain cert to disk', async () => {
      await certManager.initialize();
      await certManager.getCertificateForDomain('test.com');
      const domainsDir = path.join(tmpDir, 'certs', 'domains');
      expect(fs.existsSync(path.join(domainsDir, 'test.com.pem'))).toBe(true);
      expect(fs.existsSync(path.join(domainsDir, 'test.com-key.pem'))).toBe(true);
    });
  });

  describe('clearDomainCache', () => {
    it('clears in-memory and disk cache', async () => {
      await certManager.initialize();
      await certManager.getCertificateForDomain('example.com');
      await certManager.clearDomainCache();

      const domainsDir = path.join(tmpDir, 'certs', 'domains');
      const files = await fs.promises.readdir(domainsDir);
      expect(files).toHaveLength(0);
    });
  });

  describe('getInstallInstructions', () => {
    it('returns non-empty instructions string', async () => {
      await certManager.initialize();
      const instructions = certManager.getInstallInstructions();
      expect(instructions).toContain('Certificate');
      expect(instructions.length).toBeGreaterThan(100);
    });
  });
});
