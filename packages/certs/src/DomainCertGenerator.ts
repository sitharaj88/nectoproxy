import forge from 'node-forge';

export interface DomainCertConfig {
  validityDays: number;
  keySize: number;
}

export interface DomainCertificate {
  cert: string;
  key: string;
  domain: string;
}

const DEFAULT_DOMAIN_CONFIG: DomainCertConfig = {
  validityDays: 365,
  keySize: 2048,
};

export class DomainCertGenerator {
  private caCert: forge.pki.Certificate;
  private caKey: forge.pki.rsa.PrivateKey;
  private config: DomainCertConfig;

  constructor(
    caCertPem: string,
    caKeyPem: string,
    config: Partial<DomainCertConfig> = {}
  ) {
    this.caCert = forge.pki.certificateFromPem(caCertPem);
    this.caKey = forge.pki.privateKeyFromPem(caKeyPem) as forge.pki.rsa.PrivateKey;
    this.config = { ...DEFAULT_DOMAIN_CONFIG, ...config };
  }

  async generate(domain: string): Promise<DomainCertificate> {
    // Generate RSA key pair for the domain
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

    // Set subject for the domain
    const attrs = [
      { name: 'commonName', value: domain },
      { name: 'organizationName', value: 'ProxyScope Generated' },
    ];
    cert.setSubject(attrs);

    // Set issuer from CA certificate
    cert.setIssuer(this.caCert.subject.attributes);

    // Set extensions
    const altNames = this.generateAltNames(domain);
    cert.setExtensions([
      {
        name: 'basicConstraints',
        cA: false,
      },
      {
        name: 'keyUsage',
        digitalSignature: true,
        keyEncipherment: true,
        critical: true,
      },
      {
        name: 'extKeyUsage',
        serverAuth: true,
        clientAuth: true,
      },
      {
        name: 'subjectAltName',
        altNames,
      },
      {
        name: 'authorityKeyIdentifier',
        keyIdentifier: true,
        authorityCertIssuer: true,
        serialNumber: this.caCert.serialNumber,
      },
    ]);

    // Sign with CA's private key
    cert.sign(this.caKey, forge.md.sha256.create());

    return {
      cert: forge.pki.certificateToPem(cert),
      key: forge.pki.privateKeyToPem(keys.privateKey),
      domain,
    };
  }

  private generateAltNames(domain: string): Array<{ type: number; value?: string; ip?: string }> {
    const altNames: Array<{ type: number; value?: string; ip?: string }> = [];

    // Check if it's an IP address
    if (this.isIPAddress(domain)) {
      altNames.push({ type: 7, ip: domain }); // type 7 = IP address
    } else {
      altNames.push({ type: 2, value: domain }); // type 2 = DNS name

      // Add wildcard if it's a regular domain (not already a wildcard)
      if (!domain.startsWith('*.') && domain.includes('.')) {
        altNames.push({ type: 2, value: `*.${domain}` });
      }
    }

    return altNames;
  }

  private isIPAddress(str: string): boolean {
    // IPv4 pattern
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    // IPv6 pattern (simplified)
    const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;

    return ipv4Regex.test(str) || ipv6Regex.test(str);
  }

  private generateSerialNumber(): string {
    const bytes = forge.random.getBytesSync(16);
    const firstByte = bytes.charCodeAt(0) & 0x7f;
    return (
      firstByte.toString(16).padStart(2, '0') +
      forge.util.bytesToHex(bytes.slice(1))
    );
  }
}
