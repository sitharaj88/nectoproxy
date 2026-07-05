import { useEffect, useState, useId, useCallback } from 'react';
import { Globe, Smartphone, QrCode, Shield, Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useSettingsStore } from '@/stores/settingsStore';
import { getSettings, updateSettings, resetSettings, getLocalIPs, type AppSettings, type LocalIPAddress } from '@/services/api';
import { UpstreamProxyConfig } from './UpstreamProxyConfig';
import { SSLPassthroughPanel } from './SSLPassthroughPanel';
import { Modal } from './ui/Modal';
import { SettingsSkeleton } from './ui/Skeleton';
import { CopyButton } from './ui/CopyButton';
import { toast } from './ui/Toaster';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const PORT_MIN = 1;
const PORT_MAX = 65535;
const TIMEOUT_MIN = 0;
const BODY_SIZE_MIN = 1024;

function clampInt(value: string, min: number, max?: number): number | null {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) return null;
  if (parsed < min) return min;
  if (max !== undefined && parsed > max) return max;
  return parsed;
}

function validateSettings(s: AppSettings): string | null {
  if (s.proxyPort < PORT_MIN || s.proxyPort > PORT_MAX) return `Proxy Port must be between ${PORT_MIN} and ${PORT_MAX}.`;
  if (s.uiPort < PORT_MIN || s.uiPort > PORT_MAX) return `UI Port must be between ${PORT_MIN} and ${PORT_MAX}.`;
  if (s.proxyPort === s.uiPort) return 'Proxy Port and UI Port must differ.';
  if (s.requestTimeout < 0) return 'Request Timeout cannot be negative.';
  if (s.maxBodySize < BODY_SIZE_MIN) return `Max Body Size must be at least ${BODY_SIZE_MIN} bytes.`;
  if (s.breakpointTimeout < 0) return 'Breakpoint Timeout cannot be negative.';
  return null;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const { settings, setSettings, setLoading, setError } = useSettingsStore();
  const [localSettings, setLocalSettings] = useState<AppSettings | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setLocalError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showUpstreamProxy, setShowUpstreamProxy] = useState(false);
  const [showSSLPassthrough, setShowSSLPassthrough] = useState(false);
  const [localIPs, setLocalIPs] = useState<LocalIPAddress[]>([]);
  const [selectedQRIP, setSelectedQRIP] = useState<string>('');

  const proxyPortId = useId();
  const uiPortId = useId();
  const timeoutId = useId();
  const bodySizeId = useId();
  const breakpointTimeoutId = useId();
  const themeId = useId();
  const qrSelectId = useId();

  useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      try {
        const [settingsResponse, ipsResponse] = await Promise.all([
          getSettings(),
          getLocalIPs(),
        ]);
        setSettings(settingsResponse.settings);
        setLocalSettings(settingsResponse.settings);
        setLocalIPs(ipsResponse.addresses);
        if (ipsResponse.addresses.length > 0) {
          setSelectedQRIP(ipsResponse.addresses[0].address);
        }
      } catch (err) {
        setError((err as Error).message);
        setLocalError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen, setSettings, setLoading, setError]);

  useEffect(() => {
    if (settings && localSettings) {
      const changed = JSON.stringify(settings) !== JSON.stringify(localSettings);
      setHasChanges(changed);
      setValidationError(changed ? validateSettings(localSettings) : null);
    }
  }, [settings, localSettings]);

  const handleChange = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    if (localSettings) {
      setLocalSettings({ ...localSettings, [key]: value });
    }
  };

  const handleSave = async () => {
    if (!localSettings || !hasChanges) return;
    const invalid = validateSettings(localSettings);
    if (invalid) {
      setValidationError(invalid);
      return;
    }

    setSaving(true);
    setLocalError(null);
    try {
      const response = await updateSettings(localSettings);
      setSettings(response.settings);
      setHasChanges(false);
      toast.success('Settings saved');
    } catch (err) {
      setLocalError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (hasChanges && !window.confirm('Reset all settings to defaults? Unsaved changes will be lost.')) {
      return;
    }
    setSaving(true);
    setLocalError(null);
    try {
      const response = await resetSettings();
      setSettings(response.settings);
      setLocalSettings(response.settings);
      setHasChanges(false);
      toast.success('Settings reset to defaults');
    } catch (err) {
      setLocalError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const guardClose = useCallback(() => {
    if (hasChanges) {
      return window.confirm('Close without saving? Unsaved changes will be discarded.');
    }
    return true;
  }, [hasChanges]);

  const footer = (
    <div className="flex justify-between items-center">
      <button
        type="button"
        onClick={handleReset}
        disabled={saving}
        className="px-3 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded-md disabled:opacity-50"
      >
        Reset to Defaults
      </button>
      <div className="flex items-center gap-2">
        {hasChanges && !validationError && (
          <span className="text-xs text-gray-500" aria-live="polite">Unsaved changes</span>
        )}
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded-md"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!hasChanges || saving || !!validationError}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={hasChanges ? 'Settings *' : 'Settings'}
        size="md"
        maxHeight="85vh"
        beforeClose={guardClose}
        footer={footer}
      >
        {(error || validationError) && (
          <div
            className="mx-4 mt-4 p-3 rounded bg-red-900/30 border border-red-700/40 text-red-400 text-sm"
            role="alert"
          >
            {validationError ?? error}
            {error && !validationError && (
              <button
                type="button"
                onClick={() => setLocalError(null)}
                className="ml-2 underline text-red-300 hover:text-red-100"
              >
                Dismiss
              </button>
            )}
          </div>
        )}

        <div className="p-4 space-y-6">
          {localSettings ? (
            <>
              {/* Proxy Settings */}
              <section aria-labelledby="proxy-heading">
                <h3 id="proxy-heading" className="text-sm font-medium text-gray-300 mb-3">
                  Proxy Settings
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <label htmlFor={proxyPortId} className="text-sm text-gray-300">
                        Proxy Port
                      </label>
                      <p className="text-xs text-gray-500">Port for the proxy server (1–65535)</p>
                    </div>
                    <input
                      id={proxyPortId}
                      type="number"
                      min={PORT_MIN}
                      max={PORT_MAX}
                      value={localSettings.proxyPort}
                      onChange={(e) => handleChange('proxyPort', clampInt(e.target.value, PORT_MIN, PORT_MAX) ?? localSettings.proxyPort)}
                      className="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <label htmlFor={uiPortId} className="text-sm text-gray-300">UI Port</label>
                      <p className="text-xs text-gray-500">Port for the Web UI (1–65535)</p>
                    </div>
                    <input
                      id={uiPortId}
                      type="number"
                      min={PORT_MIN}
                      max={PORT_MAX}
                      value={localSettings.uiPort}
                      onChange={(e) => handleChange('uiPort', clampInt(e.target.value, PORT_MIN, PORT_MAX) ?? localSettings.uiPort)}
                      className="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <label htmlFor={timeoutId} className="text-sm text-gray-300">Request Timeout</label>
                      <p className="text-xs text-gray-500">Max time to wait for response (ms)</p>
                    </div>
                    <input
                      id={timeoutId}
                      type="number"
                      min={TIMEOUT_MIN}
                      value={localSettings.requestTimeout}
                      onChange={(e) => handleChange('requestTimeout', clampInt(e.target.value, TIMEOUT_MIN) ?? localSettings.requestTimeout)}
                      className="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <label htmlFor={bodySizeId} className="text-sm text-gray-300">Max Body Size</label>
                      <p className="text-xs text-gray-500">Maximum request/response body size (bytes)</p>
                    </div>
                    <input
                      id={bodySizeId}
                      type="number"
                      min={BODY_SIZE_MIN}
                      value={localSettings.maxBodySize}
                      onChange={(e) => handleChange('maxBodySize', clampInt(e.target.value, BODY_SIZE_MIN) ?? localSettings.maxBodySize)}
                      className="w-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <span className="text-sm text-gray-300">Upstream Proxy</span>
                      <p className="text-xs text-gray-500">Route traffic through another proxy server</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowUpstreamProxy(true)}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-md text-white text-sm"
                    >
                      <Globe className="w-4 h-4" aria-hidden="true" />
                      Configure
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <span className="text-sm text-gray-300">SSL Passthrough</span>
                      <p className="text-xs text-gray-500">Bypass MITM for specified domains</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowSSLPassthrough(true)}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-md text-white text-sm"
                    >
                      <Shield className="w-4 h-4" aria-hidden="true" />
                      Configure
                    </button>
                  </div>
                </div>
              </section>

              {/* Behavior Settings */}
              <section aria-labelledby="behavior-heading" className="border-t border-gray-700 pt-6">
                <h3 id="behavior-heading" className="text-sm font-medium text-gray-300 mb-3">Behavior</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <span className="text-sm text-gray-300">Auto-record Traffic</span>
                      <p className="text-xs text-gray-500">Automatically record requests on startup</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={localSettings.recording}
                      aria-label="Auto-record traffic"
                      onClick={() => handleChange('recording', !localSettings.recording)}
                      className={`w-10 h-6 rounded-full transition-colors ${
                        localSettings.recording ? 'bg-blue-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`block w-4 h-4 bg-white rounded-full transform transition-transform ${
                          localSettings.recording ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <span className="text-sm text-gray-300">Auto-open Browser</span>
                      <p className="text-xs text-gray-500">Open Web UI in browser on startup</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={localSettings.autoOpenBrowser}
                      aria-label="Auto-open browser"
                      onClick={() => handleChange('autoOpenBrowser', !localSettings.autoOpenBrowser)}
                      className={`w-10 h-6 rounded-full transition-colors ${
                        localSettings.autoOpenBrowser ? 'bg-blue-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`block w-4 h-4 bg-white rounded-full transform transition-transform ${
                          localSettings.autoOpenBrowser ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <label htmlFor={breakpointTimeoutId} className="text-sm text-gray-300">Breakpoint Timeout</label>
                      <p className="text-xs text-gray-500">Auto-continue breakpoints after (ms)</p>
                    </div>
                    <input
                      id={breakpointTimeoutId}
                      type="number"
                      min={0}
                      value={localSettings.breakpointTimeout}
                      onChange={(e) => handleChange('breakpointTimeout', clampInt(e.target.value, 0) ?? localSettings.breakpointTimeout)}
                      className="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm"
                    />
                  </div>
                </div>
              </section>

              {/* Appearance Settings */}
              <section aria-labelledby="appearance-heading" className="border-t border-gray-700 pt-6">
                <h3 id="appearance-heading" className="text-sm font-medium text-gray-300 mb-3">Appearance</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <label htmlFor={themeId} className="text-sm text-gray-300">Theme</label>
                      <p className="text-xs text-gray-500">Color theme for the UI</p>
                    </div>
                    <select
                      id={themeId}
                      value={localSettings.theme}
                      onChange={(e) => handleChange('theme', e.target.value as AppSettings['theme'])}
                      className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm"
                    >
                      <option value="dark">Dark</option>
                      <option value="light">Light</option>
                      <option value="system">System</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* Mobile Configuration */}
              <section aria-labelledby="mobile-heading" className="border-t border-gray-700 pt-6">
                <h3 id="mobile-heading" className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                  <Smartphone className="w-4 h-4" aria-hidden="true" />
                  Mobile Configuration
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  Use these IP addresses to configure your mobile device to use this proxy.
                  Make sure your mobile device is on the same network.
                </p>
                <div className="space-y-2">
                  {localIPs.length > 0 ? (
                    localIPs.map((ip) => {
                      const value = `${ip.address}:${localSettings.proxyPort}`;
                      return (
                        <div
                          key={`${ip.name}-${ip.address}`}
                          className="flex items-center justify-between p-3 bg-gray-900 rounded-md"
                        >
                          <div>
                            <span className="text-sm text-white font-mono">{ip.address}</span>
                            <span className="text-xs text-gray-500 ml-2">({ip.name})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Port: {localSettings.proxyPort}</span>
                            <CopyButton text={value} label="Address" />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-sm text-gray-500 p-3 bg-gray-900 rounded-md">
                      No network interfaces found
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-3">
                  Configure your mobile WiFi proxy settings with the IP address and port shown above.
                  Don't forget to install the CA certificate for HTTPS traffic.
                </p>

                {localIPs.length > 0 && selectedQRIP && (
                  <div className="mt-5 p-4 bg-gray-900 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                      <QrCode className="w-4 h-4" aria-hidden="true" />
                      Certificate QR Code
                    </h4>
                    <p className="text-xs text-gray-500 mb-3">
                      Scan this QR code with your phone camera to download the CA certificate.
                    </p>

                    {localIPs.length > 1 && (
                      <>
                        <label htmlFor={qrSelectId} className="sr-only">Network interface for QR code</label>
                        <select
                          id={qrSelectId}
                          value={selectedQRIP}
                          onChange={(e) => setSelectedQRIP(e.target.value)}
                          className="w-full mb-3 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm"
                        >
                          {localIPs.map((ip) => (
                            <option key={`${ip.name}-${ip.address}`} value={ip.address}>
                              {ip.address} ({ip.name})
                            </option>
                          ))}
                        </select>
                      </>
                    )}

                    <div className="flex flex-col items-center gap-3">
                      <div className="p-3 bg-white rounded-lg">
                        <QRCodeSVG
                          value={`http://${selectedQRIP}:${localSettings.uiPort}/api/certificates/download`}
                          size={180}
                          level="M"
                        />
                      </div>
                      <code className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">
                        http://{selectedQRIP}:{localSettings.uiPort}/api/certificates/download
                      </code>
                    </div>
                  </div>
                )}
              </section>
            </>
          ) : (
            <SettingsSkeleton />
          )}
        </div>
      </Modal>

      <UpstreamProxyConfig
        isOpen={showUpstreamProxy}
        onClose={() => setShowUpstreamProxy(false)}
      />

      <SSLPassthroughPanel
        isOpen={showSSLPassthrough}
        onClose={() => setShowSSLPassthrough(false)}
      />
    </>
  );
}
