import { Router, type Router as RouterType } from 'express';
import { v4 as uuid } from 'uuid';
import { networkInterfaces } from 'node:os';
import type { NetworkProfile } from '@proxyscope/shared';
import { NETWORK_PRESETS } from '@proxyscope/shared';

const router: RouterType = Router();

// In-memory state for network conditioning
let activeProfile: NetworkProfile | null = null;
const customProfiles: NetworkProfile[] = [];

// Callback for profile changes (to notify ProxyServer)
let profileChangeCallback: ((profile: NetworkProfile | null) => void) | null = null;

export function setProfileChangeCallback(callback: (profile: NetworkProfile | null) => void): void {
  profileChangeCallback = callback;
}

function notifyProfileChange(): void {
  if (profileChangeCallback) {
    profileChangeCallback(activeProfile);
  }
}

// Initialize presets with IDs
const presetProfiles: NetworkProfile[] = NETWORK_PRESETS.map((preset, index) => ({
  ...preset,
  id: `preset-${index}`,
  enabled: false,
}));

// Get all profiles (presets + custom)
router.get('/profiles', (_req, res) => {
  const allProfiles = [...presetProfiles, ...customProfiles];
  res.json({
    profiles: allProfiles,
    activeProfile,
  });
});

// Get active profile
router.get('/active', (_req, res) => {
  res.json({ activeProfile });
});

// Activate a profile
router.post('/activate/:id', (req, res) => {
  const { id } = req.params;

  // Find profile
  const allProfiles = [...presetProfiles, ...customProfiles];
  const profile = allProfiles.find((p) => p.id === id);

  if (!profile) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }

  // Activate profile
  activeProfile = { ...profile, enabled: true };
  notifyProfileChange();

  res.json({ activeProfile });
});

// Deactivate network conditioning
router.post('/deactivate', (_req, res) => {
  activeProfile = null;
  notifyProfileChange();
  res.json({ activeProfile: null });
});

// Create a custom profile
router.post('/profiles', (req, res) => {
  const input = req.body as Omit<NetworkProfile, 'id' | 'isPreset'>;

  if (!input.name) {
    res.status(400).json({ error: 'Profile name is required' });
    return;
  }

  const profile: NetworkProfile = {
    id: uuid(),
    name: input.name,
    description: input.description || '',
    enabled: false,
    downloadBandwidth: input.downloadBandwidth || 0,
    uploadBandwidth: input.uploadBandwidth || 0,
    latency: input.latency || 0,
    latencyJitter: input.latencyJitter || 0,
    packetLoss: input.packetLoss || 0,
    isPreset: false,
  };

  customProfiles.push(profile);

  res.json(profile);
});

// Update a custom profile
router.put('/profiles/:id', (req, res) => {
  const { id } = req.params;
  const input = req.body as Partial<NetworkProfile>;

  // Find custom profile
  const index = customProfiles.findIndex((p) => p.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'Profile not found or is a preset' });
    return;
  }

  // Update profile
  customProfiles[index] = {
    ...customProfiles[index],
    ...input,
    id, // Preserve ID
    isPreset: false, // Preserve preset status
  };

  // Update active profile if it was this one
  if (activeProfile?.id === id) {
    activeProfile = { ...customProfiles[index], enabled: true };
  }

  res.json(customProfiles[index]);
});

// Delete a custom profile
router.delete('/profiles/:id', (req, res) => {
  const { id } = req.params;

  const index = customProfiles.findIndex((p) => p.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'Profile not found or is a preset' });
    return;
  }

  // Deactivate if active
  if (activeProfile?.id === id) {
    activeProfile = null;
  }

  customProfiles.splice(index, 1);

  res.json({ success: true });
});

// Get local IP addresses for mobile configuration
router.get('/local-ips', (_req, res) => {
  const interfaces = networkInterfaces();
  const addresses: { name: string; address: string; family: string }[] = [];

  for (const [name, nets] of Object.entries(interfaces)) {
    if (!nets) continue;
    for (const net of nets) {
      // Skip internal/loopback addresses
      if (net.internal) continue;
      // Only include IPv4 for simplicity
      if (net.family === 'IPv4') {
        addresses.push({
          name,
          address: net.address,
          family: net.family,
        });
      }
    }
  }

  res.json({ addresses });
});

// Get the singleton active profile for the throttle service
export function getActiveNetworkProfile(): NetworkProfile | null {
  return activeProfile;
}

export function setActiveNetworkProfile(profile: NetworkProfile | null): void {
  activeProfile = profile;
}

export default router;
