import { useEffect, useState } from 'react';
import { Globe, Copy, Check, Smartphone, QrCode, Shield } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useSettingsStore } from '@/stores/settingsStore';
import { getSettings, updateSettings, resetSettings, getLocalIPs, type AppSettings, type LocalIPAddress } from '@/services/api';
import { copyToClipboard } from '@/utils/clipboard';
import { UpstreamProxyConfig } from './UpstreamProxyConfig';
import { SSLPassthroughPanel } from './SSLPassthroughPanel';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const { settings, setSettings, setLoading, setError } = useSettingsStore();
  const [localSettings, setLocalSettings] = useState<AppSettings | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setLocalError] = useState<string | null>(null);
  const [showUpstreamProxy, setShowUpstreamProxy] = useState(false);
  const [showSSLPassthrough, setShowSSLPassthrough] = useState(false);
  const [localIPs, setLocalIPs] = useState<LocalIPAddress[]>([]);
  const [copiedIP, setCopiedIP] = useState<string | null>(null);
  const [selectedQRIP, setSelectedQRIP] = useState<string>('');

  // Load settings and IPs on mount
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

  const handleCopyIP = async (text: string) => {
    await copyToClipboard(text);
    setCopiedIP(text);
    setTimeout(() => setCopiedIP(null), 2000);
  };

  // Track changes
  useEffect(() => {
    if (settings && localSettings) {
      const changed = JSON.stringify(settings) !== JSON.stringify(localSettings);
      setHasChanges(changed);
    }
  }, [settings, localSettings]);

  const handleChange = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    if (localSettings) {
      setLocalSettings({ ...localSettings, [key]: value });
    }
  };

  const handleSave = async () => {
    if (!localSettings || !hasChanges) return;

    setSaving(true);
    setLocalError(null);
    try {
      const response = await updateSettings(localSettings);
      setSettings(response.settings);
      setHasChanges(false);
    } catch (err) {
      setLocalError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    setLocalError(null);
    try {
      const response = await resetSettings();
      setSettings(response.settings);
      setLocalSettings(response.settings);
      setHasChanges(false);
    } catch (err) {
      setLocalError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-[600px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-900/30 text-red-400 text-sm">
            {error}
            <button
              onClick={() => setLocalError(null)}
              className="ml-2 text-red-300 hover:text-red-100"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-6">
          {localSettings ? (
            <>
              {/* Proxy Settings */}
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3">Proxy Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm text-gray-300">Proxy Port</label>
                      <p className="text-xs text-gray-500">Port for the proxy server</p>
                    </div>
                    <input
                      type="number"
                      value={localSettings.proxyPort}
                      onChange={(e) => handleChange('proxyPort', parseInt(e.target.value, 10))}
                      className="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm text-gray-300">UI Port</label>
                      <p className="text-xs text-gray-500">Port for the Web UI</p>
                    </div>
                    <input
                      type="number"
                      value={localSettings.uiPort}
                      onChange={(e) => handleChange('uiPort', parseInt(e.target.value, 10))}
                      className="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm text-gray-300">Request Timeout</label>
                      <p className="text-xs text-gray-500">Max time to wait for response (ms)</p>
                    </div>
                    <input
                      type="number"
                      value={localSettings.requestTimeout}
                      onChange={(e) => handleChange('requestTimeout', parseInt(e.target.value, 10))}
                      className="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm text-gray-300">Max Body Size</label>
                      <p className="text-xs text-gray-500">Maximum request/response body size (bytes)</p>
                    </div>
                    <input
                      type="number"
                      value={localSettings.maxBodySize}
                      onChange={(e) => handleChange('maxBodySize', parseInt(e.target.value, 10))}
                      className="w-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm text-gray-300">Upstream Proxy</label>
                      <p className="text-xs text-gray-500">Route traffic through another proxy server</p>
                    </div>
                    <button
                      onClick={() => setShowUpstreamProxy(true)}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-md text-white text-sm"
                    >
                      <Globe className="w-4 h-4" />
                      Configure
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm text-gray-300">SSL Passthrough</label>
                      <p className="text-xs text-gray-500">Bypass MITM for specified domains</p>
                    </div>
                    <button
                      onClick={() => setShowSSLPassthrough(true)}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-md text-white text-sm"
                    >
                      <Shield className="w-4 h-4" />
                      Configure
                    </button>
                  </div>
                </div>
              </div>

              {/* Behavior Settings */}
              <div className="border-t border-gray-700 pt-6">
                <h3 className="text-sm font-medium text-gray-300 mb-3">Behavior</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm text-gray-300">Auto-record Traffic</label>
                      <p className="text-xs text-gray-500">Automatically record requests on startup</p>
                    </div>
                    <button
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

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm text-gray-300">Auto-open Browser</label>
                      <p className="text-xs text-gray-500">Open Web UI in browser on startup</p>
                    </div>
                    <button
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

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm text-gray-300">Breakpoint Timeout</label>
                      <p className="text-xs text-gray-500">Auto-continue breakpoints after (ms)</p>
                    </div>
                    <input
                      type="number"
                      value={localSettings.breakpointTimeout}
                      onChange={(e) => handleChange('breakpointTimeout', parseInt(e.target.value, 10))}
                      className="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Appearance Settings */}
              <div className="border-t border-gray-700 pt-6">
                <h3 className="text-sm font-medium text-gray-300 mb-3">Appearance</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm text-gray-300">Theme</label>
                      <p className="text-xs text-gray-500">Color theme for the UI</p>
                    </div>
                    <select
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
              </div>

              {/* Mobile Configuration */}
              <div className="border-t border-gray-700 pt-6">
                <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  Mobile Configuration
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  Use these IP addresses to configure your mobile device to use this proxy.
                  Make sure your mobile device is on the same network.
                </p>
                <div className="space-y-2">
                  {localIPs.length > 0 ? (
                    localIPs.map((ip) => (
                      <div
                        key={`${ip.name}-${ip.address}`}
                        className="flex items-center justify-between p-3 bg-gray-900 rounded-md"
                      >
                        <div>
                          <span className="text-sm text-white font-mono">{ip.address}</span>
                          <span className="text-xs text-gray-500 ml-2">({ip.name})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            Port: {localSettings.proxyPort}
                          </span>
                          <button
                            onClick={() => handleCopyIP(`${ip.address}:${localSettings.proxyPort}`)}
                            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                            title="Copy IP:Port"
                          >
                            {copiedIP === `${ip.address}:${localSettings.proxyPort}` ? (
                              <Check className="w-4 h-4 text-green-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))
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

                {/* QR Code for Certificate Download */}
                {localIPs.length > 0 && selectedQRIP && (
                  <div className="mt-5 p-4 bg-gray-900 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                      <QrCode className="w-4 h-4" />
                      Certificate QR Code
                    </h4>
                    <p className="text-xs text-gray-500 mb-3">
                      Scan this QR code with your phone camera to download the CA certificate.
                    </p>

                    {localIPs.length > 1 && (
                      <select
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
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-600 border-t-blue-500" />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between p-4 border-t border-gray-700">
          <button
            onClick={handleReset}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded-md disabled:opacity-50"
          >
            Reset to Defaults
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Upstream Proxy Configuration Modal */}
      <UpstreamProxyConfig
        isOpen={showUpstreamProxy}
        onClose={() => setShowUpstreamProxy(false)}
      />

      {/* SSL Passthrough Configuration Modal */}
      <SSLPassthroughPanel
        isOpen={showSSLPassthrough}
        onClose={() => setShowSSLPassthrough(false)}
      />
    </div>
  );
}
