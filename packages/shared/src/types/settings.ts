export interface Settings {
  proxy: ProxySettings;
  ui: UISettings;
  storage: StorageSettings;
  certificates: CertificateSettings;
}

export interface ProxySettings {
  port: number;
  sslPort: number;
  maxBodySize: number; // bytes
  timeout: number; // milliseconds
  keepAlive: boolean;
  upstreamProxy?: UpstreamProxyConfig;
}

export type UpstreamProxyType = 'http' | 'https' | 'socks4' | 'socks5';

export interface UpstreamProxyConfig {
  enabled: boolean;
  type: UpstreamProxyType;
  host: string;
  port: number;
  auth?: {
    username: string;
    password: string;
  };
  // Bypass rules - requests matching these patterns go direct
  bypassRules: string[];
}

export interface UISettings {
  port: number;
  autoOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  fontSize: number;
  maxTrafficDisplay: number;
  autoScroll: boolean;
}

export interface StorageSettings {
  dataDir: string;
  maxDatabaseSize: number; // bytes
  retentionDays: number;
  compressOldSessions: boolean;
}

export interface CertificateSettings {
  caName: string;
  caValidityDays: number;
  certValidityDays: number;
  keySize: number;
}

export const DEFAULT_SETTINGS: Settings = {
  proxy: {
    port: 8888,
    sslPort: 8889,
    maxBodySize: 10 * 1024 * 1024, // 10MB
    timeout: 30000,
    keepAlive: true,
  },
  ui: {
    port: 8889,
    autoOpen: true,
    theme: 'system',
    fontSize: 14,
    maxTrafficDisplay: 10000,
    autoScroll: true,
  },
  storage: {
    dataDir: '~/.nectoproxy',
    maxDatabaseSize: 1024 * 1024 * 1024, // 1GB
    retentionDays: 30,
    compressOldSessions: true,
  },
  certificates: {
    caName: 'NectoProxy CA',
    caValidityDays: 3650, // 10 years
    certValidityDays: 365,
    keySize: 2048,
  },
};
