// Network conditioning profiles

export interface NetworkProfile {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  // Bandwidth in bytes per second (0 = unlimited)
  downloadBandwidth: number;
  uploadBandwidth: number;
  // Latency in milliseconds
  latency: number;
  // Latency jitter (variation) in milliseconds
  latencyJitter: number;
  // Packet loss percentage (0-100)
  packetLoss: number;
  // Whether this is a preset or custom profile
  isPreset: boolean;
}

// Built-in network condition presets
export const NETWORK_PRESETS: Omit<NetworkProfile, 'id' | 'enabled'>[] = [
  {
    name: 'No Throttling',
    description: 'Full speed connection',
    downloadBandwidth: 0,
    uploadBandwidth: 0,
    latency: 0,
    latencyJitter: 0,
    packetLoss: 0,
    isPreset: true,
  },
  {
    name: 'Slow 2G',
    description: '280 Kbps download, 256 Kbps upload',
    downloadBandwidth: 35 * 1024, // 280 Kbps
    uploadBandwidth: 32 * 1024, // 256 Kbps
    latency: 1400,
    latencyJitter: 400,
    packetLoss: 1,
    isPreset: true,
  },
  {
    name: 'Regular 2G',
    description: '450 Kbps download, 150 Kbps upload',
    downloadBandwidth: 56 * 1024, // 450 Kbps
    uploadBandwidth: 19 * 1024, // 150 Kbps
    latency: 800,
    latencyJitter: 200,
    packetLoss: 0.5,
    isPreset: true,
  },
  {
    name: 'Good 2G',
    description: '900 Kbps download, 280 Kbps upload',
    downloadBandwidth: 112 * 1024, // 900 Kbps
    uploadBandwidth: 35 * 1024, // 280 Kbps
    latency: 650,
    latencyJitter: 150,
    packetLoss: 0.2,
    isPreset: true,
  },
  {
    name: 'Slow 3G',
    description: '780 Kbps download, 330 Kbps upload',
    downloadBandwidth: 97 * 1024, // 780 Kbps
    uploadBandwidth: 41 * 1024, // 330 Kbps
    latency: 400,
    latencyJitter: 100,
    packetLoss: 0,
    isPreset: true,
  },
  {
    name: 'Regular 3G',
    description: '1.5 Mbps download, 750 Kbps upload',
    downloadBandwidth: 192 * 1024, // 1.5 Mbps
    uploadBandwidth: 94 * 1024, // 750 Kbps
    latency: 300,
    latencyJitter: 100,
    packetLoss: 0,
    isPreset: true,
  },
  {
    name: 'Good 3G',
    description: '4 Mbps download, 1.5 Mbps upload',
    downloadBandwidth: 512 * 1024, // 4 Mbps
    uploadBandwidth: 192 * 1024, // 1.5 Mbps
    latency: 170,
    latencyJitter: 40,
    packetLoss: 0,
    isPreset: true,
  },
  {
    name: 'Regular 4G',
    description: '9 Mbps download, 4 Mbps upload',
    downloadBandwidth: 1152 * 1024, // 9 Mbps
    uploadBandwidth: 512 * 1024, // 4 Mbps
    latency: 50,
    latencyJitter: 10,
    packetLoss: 0,
    isPreset: true,
  },
  {
    name: 'DSL',
    description: '2 Mbps download, 1 Mbps upload',
    downloadBandwidth: 256 * 1024, // 2 Mbps
    uploadBandwidth: 128 * 1024, // 1 Mbps
    latency: 50,
    latencyJitter: 10,
    packetLoss: 0,
    isPreset: true,
  },
  {
    name: 'WiFi',
    description: '30 Mbps download, 15 Mbps upload',
    downloadBandwidth: 3840 * 1024, // 30 Mbps
    uploadBandwidth: 1920 * 1024, // 15 Mbps
    latency: 10,
    latencyJitter: 5,
    packetLoss: 0,
    isPreset: true,
  },
  {
    name: 'Offline',
    description: 'Simulates no network connection',
    downloadBandwidth: 1, // Effectively block traffic
    uploadBandwidth: 1,
    latency: 30000, // 30 second timeout
    latencyJitter: 0,
    packetLoss: 100,
    isPreset: true,
  },
];

export interface NetworkConditioningState {
  activeProfile: NetworkProfile | null;
  profiles: NetworkProfile[];
}
