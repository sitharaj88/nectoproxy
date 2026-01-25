import { Router, type Router as RouterType } from 'express';
import type { UpstreamProxyConfig } from '@proxyscope/shared';

const router: RouterType = Router();

// In-memory state for upstream proxy
let upstreamProxyConfig: UpstreamProxyConfig | null = null;

// Callback for config changes (to notify ProxyServer)
let configChangeCallback: ((config: UpstreamProxyConfig | null) => void) | null = null;

export function setUpstreamProxyChangeCallback(
  callback: (config: UpstreamProxyConfig | null) => void
): void {
  configChangeCallback = callback;
}

function notifyConfigChange(): void {
  if (configChangeCallback) {
    configChangeCallback(upstreamProxyConfig);
  }
}

// Get current upstream proxy config
router.get('/', (_req, res) => {
  res.json({ config: upstreamProxyConfig });
});

// Update upstream proxy config
router.put('/', (req, res) => {
  const input = req.body as UpstreamProxyConfig;

  if (!input.host && input.enabled) {
    res.status(400).json({ error: 'Host is required when proxy is enabled' });
    return;
  }

  if (!input.port && input.enabled) {
    res.status(400).json({ error: 'Port is required when proxy is enabled' });
    return;
  }

  upstreamProxyConfig = {
    enabled: input.enabled ?? false,
    type: input.type ?? 'http',
    host: input.host ?? '',
    port: input.port ?? 8080,
    auth: input.auth,
    bypassRules: input.bypassRules ?? ['localhost', '127.0.0.1', '*.local'],
  };

  notifyConfigChange();

  res.json({ config: upstreamProxyConfig });
});

// Enable upstream proxy
router.post('/enable', (_req, res) => {
  if (!upstreamProxyConfig) {
    res.status(400).json({ error: 'No proxy configured' });
    return;
  }

  upstreamProxyConfig.enabled = true;
  notifyConfigChange();

  res.json({ config: upstreamProxyConfig });
});

// Disable upstream proxy
router.post('/disable', (_req, res) => {
  if (upstreamProxyConfig) {
    upstreamProxyConfig.enabled = false;
  }
  notifyConfigChange();

  res.json({ config: upstreamProxyConfig });
});

// Clear upstream proxy config
router.delete('/', (_req, res) => {
  upstreamProxyConfig = null;
  notifyConfigChange();

  res.json({ config: null });
});

// Get current config (for ProxyServer)
export function getUpstreamProxyConfig(): UpstreamProxyConfig | null {
  return upstreamProxyConfig;
}

export default router;
