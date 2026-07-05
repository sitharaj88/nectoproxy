import { describe, it, expect, beforeAll } from 'vitest';
import { X509Certificate } from 'node:crypto';
import { CAGenerator, type CACertificate } from '../CAGenerator.js';
import { DomainCertGenerator } from '../DomainCertGenerator.js';

/**
 * Regression tests for the certificate chain. A leaf must be verifiably issued
 * by the CA (issuer DN + Authority Key Identifier referencing the CA's Subject
 * Key Identifier) so strict clients — OpenSSL, `curl --cacert`, Node with
 * NODE_EXTRA_CA_CERTS — can build the chain. Previously the leaf's AKI was
 * derived from its own key, breaking verification with "unable to get local
 * issuer certificate".
 */
describe('DomainCertGenerator — certificate chain', () => {
  let ca: CACertificate;
  let gen: DomainCertGenerator;
  let caX: X509Certificate;

  beforeAll(async () => {
    ca = await new CAGenerator().generate();
    gen = new DomainCertGenerator(ca.cert, ca.key);
    caX = new X509Certificate(ca.cert);
  });

  it('issues a leaf that verifiably chains to the CA (hostname)', async () => {
    const leaf = await gen.generate('example.com');
    const leafX = new X509Certificate(leaf.cert);
    expect(leafX.checkIssued(caX)).toBe(true);
  });

  it('issues a leaf that verifiably chains to the CA (IP address)', async () => {
    const leaf = await gen.generate('127.0.0.1');
    const leafX = new X509Certificate(leaf.cert);
    expect(leafX.checkIssued(caX)).toBe(true);
  });

  it('sets Subject Alternative Names for the domain and wildcard', async () => {
    const leaf = await gen.generate('example.com');
    const leafX = new X509Certificate(leaf.cert);
    expect(leafX.subjectAltName).toContain('example.com');
    expect(leafX.subjectAltName).toContain('*.example.com');
  });
});
