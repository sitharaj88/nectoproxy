import forge from 'node-forge';

export interface CAConfig {
  commonName: string;
  organizationName: string;
  validityDays: number;
  keySize: number;
}

export interface CACertificate {
  cert: string;
  key: string;
  fingerprint: string;
}

const DEFAULT_CA_CONFIG: CAConfig = {
  commonName: 'NectoProxy CA',
  organizationName: 'NectoProxy',
  validityDays: 3650, // 10 years
  keySize: 2048,
};

export class CAGenerator {
  private config: CAConfig;

  constructor(config: Partial<CAConfig> = {}) {
    this.config = { ...DEFAULT_CA_CONFIG, ...config };
  }

  async generate(): Promise<CACertificate> {
    // Generate RSA key pair
    const keys = forge.pki.rsa.generateKeyPair(this.config.keySize);

    // Create certificate
    const cert = forge.pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = this.generateSerialNumber();

    // Set validity period
    const now = new Date();
    cert.validity.notBefore = now;
    cert.validity.notAfter = new Date(
      now.getTime() + this.config.validityDays * 24 * 60 * 60 * 1000
    );

    // Set subject and issuer (same for self-signed CA)
    const attrs = [
      { name: 'commonName', value: this.config.commonName },
      { name: 'organizationName', value: this.config.organizationName },
    ];
    cert.setSubject(attrs);
    cert.setIssuer(attrs);

    // Set extensions for CA certificate
    cert.setExtensions([
      {
        name: 'basicConstraints',
        cA: true,
        critical: true,
      },
      {
        name: 'keyUsage',
        keyCertSign: true,
        cRLSign: true,
        digitalSignature: true,
        critical: true,
      },
      {
        name: 'subjectKeyIdentifier',
      },
    ]);

    // Sign the certificate with SHA-256
    cert.sign(keys.privateKey, forge.md.sha256.create());

    // Calculate fingerprint
    const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(cert));
    const md = forge.md.sha256.create();
    md.update(certDer.getBytes());
    const fingerprint = md
      .digest()
      .toHex()
      .toUpperCase()
      .match(/.{2}/g)!
      .join(':');

    return {
      cert: forge.pki.certificateToPem(cert),
      key: forge.pki.privateKeyToPem(keys.privateKey),
      fingerprint,
    };
  }

  private generateSerialNumber(): string {
    // Generate a random 16-byte serial number
    const bytes = forge.random.getBytesSync(16);
    // Ensure it's positive by clearing the high bit
    const firstByte = bytes.charCodeAt(0) & 0x7f;
    return (
      firstByte.toString(16).padStart(2, '0') +
      forge.util.bytesToHex(bytes.slice(1))
    );
  }
}
