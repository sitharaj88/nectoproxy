import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { CAGenerator, type CACertificate } from './CAGenerator.js';
import { DomainCertGenerator, type DomainCertificate } from './DomainCertGenerator.js';

export interface CertificateManagerConfig {
  certsDir: string;
  caName: string;
  caValidityDays: number;
  certValidityDays: number;
  keySize: number;
}

const DEFAULT_CONFIG: CertificateManagerConfig = {
  certsDir: path.join(os.homedir(), '.nectoproxy', 'certs'),
  caName: 'NectoProxy CA',
  caValidityDays: 3650,
  certValidityDays: 365,
  keySize: 2048,
};

export class CertificateManager {
  private config: CertificateManagerConfig;
  private caCert: CACertificate | null = null;
  private domainGenerator: DomainCertGenerator | null = null;
  private domainCache: Map<string, DomainCertificate> = new Map();
  private pendingGenerations: Map<string, Promise<DomainCertificate>> = new Map();

  constructor(config: Partial<CertificateManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async initialize(): Promise<void> {
    // Ensure certs directory exists
    await fs.promises.mkdir(this.config.certsDir, { recursive: true });
    await fs.promises.mkdir(path.join(this.config.certsDir, 'domains'), {
      recursive: true,
    });

    // Load or generate CA certificate
    await this.loadOrGenerateCA();

    // Initialize domain generator
    this.domainGenerator = new DomainCertGenerator(
      this.caCert!.cert,
      this.caCert!.key,
      {
        validityDays: this.config.certValidityDays,
        keySize: this.config.keySize,
      }
    );

    // Load cached domain certificates
    await this.loadCachedDomains();
  }

  private async loadOrGenerateCA(): Promise<void> {
    const certPath = path.join(this.config.certsDir, 'ca.pem');
    const keyPath = path.join(this.config.certsDir, 'ca-key.pem');

    try {
      // Try to load existing CA
      const [cert, key] = await Promise.all([
        fs.promises.readFile(certPath, 'utf-8'),
        fs.promises.readFile(keyPath, 'utf-8'),
      ]);

      this.caCert = {
        cert,
        key,
        fingerprint: '', // Will be calculated on demand if needed
      };

      console.log('Loaded existing CA certificate');
    } catch {
      // Generate new CA
      console.log('Generating new CA certificate...');
      const generator = new CAGenerator({
        commonName: this.config.caName,
        validityDays: this.config.caValidityDays,
        keySize: this.config.keySize,
      });

      this.caCert = await generator.generate();

      // Save CA certificate and key
      await Promise.all([
        fs.promises.writeFile(certPath, this.caCert.cert, { mode: 0o644 }),
        fs.promises.writeFile(keyPath, this.caCert.key, { mode: 0o600 }),
      ]);

      console.log(`CA certificate generated with fingerprint: ${this.caCert.fingerprint}`);
    }
  }

  private async loadCachedDomains(): Promise<void> {
    const domainsDir = path.join(this.config.certsDir, 'domains');

    try {
      const files = await fs.promises.readdir(domainsDir);
      const certFiles = files.filter((f) => f.endsWith('.pem') && !f.endsWith('-key.pem'));

      for (const certFile of certFiles) {
        const domain = certFile.replace('.pem', '');
        const keyFile = `${domain}-key.pem`;

        try {
          const [cert, key] = await Promise.all([
            fs.promises.readFile(path.join(domainsDir, certFile), 'utf-8'),
            fs.promises.readFile(path.join(domainsDir, keyFile), 'utf-8'),
          ]);

          this.domainCache.set(domain, { cert, key, domain });
        } catch {
          // Skip invalid cache entries
        }
      }

      console.log(`Loaded ${this.domainCache.size} cached domain certificates`);
    } catch {
      // No cached domains
    }
  }

  async getCertificateForDomain(domain: string): Promise<DomainCertificate> {
    // Normalize domain (remove port if present)
    const normalizedDomain = domain.split(':')[0].toLowerCase();

    // Check cache first
    if (this.domainCache.has(normalizedDomain)) {
      return this.domainCache.get(normalizedDomain)!;
    }

    // Check if generation is already in progress
    if (this.pendingGenerations.has(normalizedDomain)) {
      return this.pendingGenerations.get(normalizedDomain)!;
    }

    // Generate new certificate
    const generationPromise = this.generateAndCacheDomainCert(normalizedDomain);
    this.pendingGenerations.set(normalizedDomain, generationPromise);

    try {
      const cert = await generationPromise;
      return cert;
    } finally {
      this.pendingGenerations.delete(normalizedDomain);
    }
  }

  private async generateAndCacheDomainCert(domain: string): Promise<DomainCertificate> {
    if (!this.domainGenerator) {
      throw new Error('Certificate manager not initialized');
    }

    const cert = await this.domainGenerator.generate(domain);

    // Cache in memory
    this.domainCache.set(domain, cert);

    // Cache to disk
    const domainsDir = path.join(this.config.certsDir, 'domains');
    const safeDomain = domain.replace(/[^a-zA-Z0-9.-]/g, '_');

    await Promise.all([
      fs.promises.writeFile(
        path.join(domainsDir, `${safeDomain}.pem`),
        cert.cert,
        { mode: 0o644 }
      ),
      fs.promises.writeFile(
        path.join(domainsDir, `${safeDomain}-key.pem`),
        cert.key,
        { mode: 0o600 }
      ),
    ]);

    return cert;
  }

  getCACertificate(): CACertificate | null {
    return this.caCert;
  }

  getCACertificatePem(): string {
    if (!this.caCert) {
      throw new Error('Certificate manager not initialized');
    }
    return this.caCert.cert;
  }

  getCACertificatePath(): string {
    return path.join(this.config.certsDir, 'ca.pem');
  }

  getCertsDirectory(): string {
    return this.config.certsDir;
  }

  async clearDomainCache(): Promise<void> {
    this.domainCache.clear();

    const domainsDir = path.join(this.config.certsDir, 'domains');
    try {
      const files = await fs.promises.readdir(domainsDir);
      await Promise.all(
        files.map((f) => fs.promises.unlink(path.join(domainsDir, f)))
      );
    } catch {
      // Directory might not exist
    }
  }

  getInstallInstructions(): string {
    const certPath = this.getCACertificatePath();
    const platform = process.platform;

    let instructions = `
NectoProxy CA Certificate Installation Instructions
===================================================

Certificate location: ${certPath}

`;

    switch (platform) {
      case 'darwin':
        instructions += `
macOS:
------
1. Double-click the certificate file, or run:
   sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain "${certPath}"

2. Open Keychain Access, find "NectoProxy CA", and set it to "Always Trust"

Or use the command line:
   open "${certPath}"
`;
        break;

      case 'win32':
        instructions += `
Windows:
--------
1. Double-click the certificate file
2. Click "Install Certificate"
3. Select "Local Machine" and click Next
4. Select "Place all certificates in the following store"
5. Click "Browse" and select "Trusted Root Certification Authorities"
6. Click Next, then Finish

Or use PowerShell (as Administrator):
   Import-Certificate -FilePath "${certPath}" -CertStoreLocation Cert:\\LocalMachine\\Root
`;
        break;

      default:
        instructions += `
Linux:
------
Ubuntu/Debian:
   sudo cp "${certPath}" /usr/local/share/ca-certificates/nectoproxy-ca.crt
   sudo update-ca-certificates

Fedora/RHEL/CentOS:
   sudo cp "${certPath}" /etc/pki/ca-trust/source/anchors/nectoproxy-ca.pem
   sudo update-ca-trust

Arch Linux:
   sudo trust anchor "${certPath}"

For Firefox (all platforms):
   1. Open Firefox Settings > Privacy & Security
   2. Scroll to Certificates and click "View Certificates"
   3. Go to "Authorities" tab and click "Import"
   4. Select the certificate file and check "Trust this CA to identify websites"
`;
    }

    instructions += `
Chrome/Edge:
------------
Chrome and Edge use the system certificate store on most platforms.
On Linux, you may need to import manually:
   1. Open chrome://settings/certificates
   2. Go to "Authorities" tab
   3. Click "Import" and select the certificate file
`;

    return instructions;
  }
}
