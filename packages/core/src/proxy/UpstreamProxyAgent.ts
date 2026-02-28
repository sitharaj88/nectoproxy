import http from 'node:http';
import https from 'node:https';
import dns from 'node:dns';
import net from 'node:net';
import { URL } from 'node:url';
import type { UpstreamProxyConfig } from '@proxyscope/shared';

export interface UpstreamProxyAgentOptions {
  config: UpstreamProxyConfig;
}

/**
 * Agent that routes requests through an upstream proxy server.
 * Supports HTTP, HTTPS, SOCKS4, and SOCKS5 proxies.
 */
export class UpstreamProxyAgent {
  private config: UpstreamProxyConfig;
  private bypassPatterns: RegExp[] = [];

  constructor(options: UpstreamProxyAgentOptions) {
    this.config = options.config;
    this.compileBypassRules();
  }

  private compileBypassRules(): void {
    this.bypassPatterns = this.config.bypassRules.map((rule) => {
      // Convert glob-like patterns to regex
      // Supports: *.example.com, localhost, 192.168.*
      const pattern = rule
        .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex chars except *
        .replace(/\*/g, '.*'); // Convert * to .*
      return new RegExp(`^${pattern}$`, 'i');
    });
  }

  /**
   * Check if a host should bypass the upstream proxy
   */
  shouldBypass(host: string): boolean {
    if (!this.config.enabled) return true;

    return this.bypassPatterns.some((pattern) => pattern.test(host));
  }

  /**
   * Create an HTTP(S) request through the upstream proxy
   */
  async createConnection(
    targetHost: string,
    targetPort: number,
    isSecure: boolean
  ): Promise<net.Socket> {
    if (this.shouldBypass(targetHost)) {
      // Direct connection
      return this.createDirectConnection(targetHost, targetPort, isSecure);
    }

    switch (this.config.type) {
      case 'http':
      case 'https':
        return this.createHttpProxyConnection(targetHost, targetPort);
      case 'socks4':
        return this.createSocks4Connection(targetHost, targetPort);
      case 'socks5':
        return this.createSocks5Connection(targetHost, targetPort);
      default:
        return this.createDirectConnection(targetHost, targetPort, isSecure);
    }
  }

  private createDirectConnection(
    host: string,
    port: number,
    _isSecure: boolean
  ): Promise<net.Socket> {
    return new Promise((resolve, reject) => {
      const socket = net.connect(port, host, () => {
        resolve(socket);
      });
      socket.on('error', reject);
    });
  }

  /**
   * Connect through an HTTP/HTTPS proxy using CONNECT method
   */
  private createHttpProxyConnection(
    targetHost: string,
    targetPort: number
  ): Promise<net.Socket> {
    return new Promise((resolve, reject) => {
      const headers: Record<string, string> = {
        Host: `${targetHost}:${targetPort}`,
      };

      // Add proxy authentication if configured
      if (this.config.auth) {
        const auth = Buffer.from(
          `${this.config.auth.username}:${this.config.auth.password}`
        ).toString('base64');
        headers['Proxy-Authorization'] = `Basic ${auth}`;
      }

      const proxyOptions: http.RequestOptions = {
        hostname: this.config.host,
        port: this.config.port,
        method: 'CONNECT',
        path: `${targetHost}:${targetPort}`,
        headers,
      };

      const proxyModule = this.config.type === 'https' ? https : http;

      const req = proxyModule.request(proxyOptions);

      req.on('connect', (res, socket) => {
        if (res.statusCode === 200) {
          resolve(socket);
        } else {
          socket.destroy();
          reject(
            new Error(
              `Proxy CONNECT failed: ${res.statusCode} ${res.statusMessage}`
            )
          );
        }
      });

      req.on('error', reject);
      req.end();
    });
  }

  /**
   * Connect through a SOCKS4 proxy
   */
  private createSocks4Connection(
    targetHost: string,
    targetPort: number
  ): Promise<net.Socket> {
    return new Promise((resolve, reject) => {
      const socket = net.connect(this.config.port, this.config.host);

      socket.once('connect', async () => {
        try {
          // Resolve hostname to IP for SOCKS4 (SOCKS4a supports domain names)
          const ip = await this.resolveHost(targetHost);

          // SOCKS4 request
          const request = Buffer.alloc(9);
          request[0] = 0x04; // SOCKS version
          request[1] = 0x01; // CONNECT command
          request.writeUInt16BE(targetPort, 2); // Port
          request.writeUInt8(parseInt(ip.split('.')[0]), 4);
          request.writeUInt8(parseInt(ip.split('.')[1]), 5);
          request.writeUInt8(parseInt(ip.split('.')[2]), 6);
          request.writeUInt8(parseInt(ip.split('.')[3]), 7);
          request[8] = 0x00; // Null-terminated user ID

          socket.write(request);

          // Wait for response
          socket.once('data', (response) => {
            if (response[0] === 0x00 && response[1] === 0x5a) {
              resolve(socket);
            } else {
              socket.destroy();
              reject(new Error(`SOCKS4 connection failed: status ${response[1]}`));
            }
          });
        } catch (err) {
          socket.destroy();
          reject(err);
        }
      });

      socket.on('error', reject);
    });
  }

  /**
   * Connect through a SOCKS5 proxy
   */
  private createSocks5Connection(
    targetHost: string,
    targetPort: number
  ): Promise<net.Socket> {
    return new Promise((resolve, reject) => {
      const socket = net.connect(this.config.port, this.config.host);

      socket.once('connect', async () => {
        try {
          // Step 1: Send greeting with auth methods
          const hasAuth = !!this.config.auth;
          const greeting = hasAuth
            ? Buffer.from([0x05, 0x02, 0x00, 0x02]) // Version 5, 2 methods: no auth, username/password
            : Buffer.from([0x05, 0x01, 0x00]); // Version 5, 1 method: no auth

          socket.write(greeting);

          // Wait for method selection
          const methodResponse = await this.waitForData(socket, 2);
          if (methodResponse[0] !== 0x05) {
            throw new Error('Invalid SOCKS5 response');
          }

          const selectedMethod = methodResponse[1];

          // Step 2: Authenticate if required
          if (selectedMethod === 0x02 && this.config.auth) {
            const username = Buffer.from(this.config.auth.username);
            const password = Buffer.from(this.config.auth.password);
            const authRequest = Buffer.concat([
              Buffer.from([0x01, username.length]),
              username,
              Buffer.from([password.length]),
              password,
            ]);

            socket.write(authRequest);

            const authResponse = await this.waitForData(socket, 2);
            if (authResponse[1] !== 0x00) {
              throw new Error('SOCKS5 authentication failed');
            }
          } else if (selectedMethod === 0xff) {
            throw new Error('SOCKS5 no acceptable auth method');
          }

          // Step 3: Send connection request
          const hostBuffer = Buffer.from(targetHost);
          const request = Buffer.concat([
            Buffer.from([
              0x05, // Version
              0x01, // CONNECT command
              0x00, // Reserved
              0x03, // Address type: domain name
              hostBuffer.length,
            ]),
            hostBuffer,
            Buffer.from([
              (targetPort >> 8) & 0xff,
              targetPort & 0xff,
            ]),
          ]);

          socket.write(request);

          // Wait for connection response
          const response = await this.waitForData(socket, 4);
          if (response[0] !== 0x05 || response[1] !== 0x00) {
            throw new Error(`SOCKS5 connection failed: status ${response[1]}`);
          }

          // Skip the bound address in response
          const addressType = response[3];
          if (addressType === 0x01) {
            // IPv4
            await this.waitForData(socket, 4 + 2);
          } else if (addressType === 0x03) {
            // Domain
            const lengthBuf = await this.waitForData(socket, 1);
            await this.waitForData(socket, lengthBuf[0] + 2);
          } else if (addressType === 0x04) {
            // IPv6
            await this.waitForData(socket, 16 + 2);
          }

          resolve(socket);
        } catch (err) {
          socket.destroy();
          reject(err);
        }
      });

      socket.on('error', reject);
    });
  }

  private waitForData(socket: net.Socket, length: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      let totalLength = 0;

      const onData = (chunk: Buffer) => {
        chunks.push(chunk);
        totalLength += chunk.length;

        if (totalLength >= length) {
          socket.removeListener('data', onData);
          socket.removeListener('error', onError);
          resolve(Buffer.concat(chunks).slice(0, length));
        }
      };

      const onError = (err: Error) => {
        socket.removeListener('data', onData);
        reject(err);
      };

      socket.on('data', onData);
      socket.once('error', onError);
    });
  }

  private resolveHost(hostname: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Check if it's already an IP
      if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
        resolve(hostname);
        return;
      }

      // Resolve DNS
      dns.resolve4(hostname, (err: Error | null, addresses: string[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(addresses[0]);
        }
      });
    });
  }

  /**
   * Get HTTP agent options for requests through the proxy
   */
  getHttpAgentOptions(targetHost: string): http.RequestOptions | null {
    if (this.shouldBypass(targetHost)) {
      return null;
    }

    if (this.config.type !== 'http' && this.config.type !== 'https') {
      // For SOCKS proxies, use createConnection instead
      return null;
    }

    const proxyUrl = new URL(
      `${this.config.type}://${this.config.host}:${this.config.port}`
    );

    if (this.config.auth) {
      proxyUrl.username = this.config.auth.username;
      proxyUrl.password = this.config.auth.password;
    }

    return {
      host: this.config.host,
      port: this.config.port,
      headers: this.config.auth
        ? {
            'Proxy-Authorization': `Basic ${Buffer.from(
              `${this.config.auth.username}:${this.config.auth.password}`
            ).toString('base64')}`,
          }
        : undefined,
    };
  }

  getConfig(): UpstreamProxyConfig {
    return this.config;
  }

  setConfig(config: UpstreamProxyConfig): void {
    this.config = config;
    this.compileBypassRules();
  }
}
