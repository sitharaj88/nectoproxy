import { useState, useEffect, useCallback } from 'react';
import { Globe, Lock, X, Save, Plus, Trash2 } from 'lucide-react';
import {
  getUpstreamProxyConfig,
  updateUpstreamProxyConfig,
  clearUpstreamProxy,
  type UpstreamProxyConfig as UpstreamProxyConfigType,
  type UpstreamProxyType,
} from '../services/api';

interface UpstreamProxyConfigProps {
  isOpen: boolean;
  onClose: () => void;
}

const PROXY_TYPES: { value: UpstreamProxyType; label: string }[] = [
  { value: 'http', label: 'HTTP' },
  { value: 'https', label: 'HTTPS' },
  { value: 'socks4', label: 'SOCKS4' },
  { value: 'socks5', label: 'SOCKS5' },
];

const DEFAULT_BYPASS_RULES = ['localhost', '127.0.0.1', '*.local'];

export function UpstreamProxyConfig({ isOpen, onClose }: UpstreamProxyConfigProps) {
  const [config, setConfig] = useState<UpstreamProxyConfigType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [enabled, setEnabled] = useState(false);
  const [type, setType] = useState<UpstreamProxyType>('http');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('8080');
  const [useAuth, setUseAuth] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [bypassRules, setBypassRules] = useState<string[]>(DEFAULT_BYPASS_RULES);
  const [newBypassRule, setNewBypassRule] = useState('');

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUpstreamProxyConfig();
      setConfig(data.config);

      if (data.config) {
        setEnabled(data.config.enabled);
        setType(data.config.type);
        setHost(data.config.host);
        setPort(String(data.config.port));
        setUseAuth(!!data.config.auth);
        setUsername(data.config.auth?.username || '');
        setPassword(data.config.auth?.password || '');
        setBypassRules(data.config.bypassRules);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen, loadConfig]);

  const handleSave = async () => {
    if (!host && enabled) {
      setError('Host is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const newConfig: Partial<UpstreamProxyConfigType> = {
        enabled,
        type,
        host,
        port: parseInt(port, 10) || 8080,
        bypassRules,
      };

      if (useAuth && username) {
        newConfig.auth = { username, password };
      }

      const data = await updateUpstreamProxyConfig(newConfig);
      setConfig(data.config);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    try {
      setSaving(true);
      setError(null);
      await clearUpstreamProxy();
      setConfig(null);
      setEnabled(false);
      setHost('');
      setPort('8080');
      setType('http');
      setUseAuth(false);
      setUsername('');
      setPassword('');
      setBypassRules(DEFAULT_BYPASS_RULES);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const addBypassRule = () => {
    if (newBypassRule && !bypassRules.includes(newBypassRule)) {
      setBypassRules([...bypassRules, newBypassRule]);
      setNewBypassRule('');
    }
  };

  const removeBypassRule = (rule: string) => {
    setBypassRules(bypassRules.filter((r) => r !== rule));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary-400" />
            Upstream Proxy Configuration
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-700 text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500" />
            </div>
          ) : (
            <div className="space-y-4">
              {error && (
                <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Enable toggle */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">
                  Enable Upstream Proxy
                </label>
                <button
                  onClick={() => setEnabled(!enabled)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    enabled ? 'bg-primary-600' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      enabled ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {/* Proxy Type */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Proxy Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as UpstreamProxyType)}
                  disabled={!enabled}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm disabled:opacity-50"
                >
                  {PROXY_TYPES.map((pt) => (
                    <option key={pt.value} value={pt.value}>
                      {pt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Host and Port */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Host
                  </label>
                  <input
                    type="text"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    disabled={!enabled}
                    placeholder="proxy.example.com"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Port
                  </label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    disabled={!enabled}
                    placeholder="8080"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Authentication */}
              <div className="border-t border-gray-700 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Lock className="w-4 h-4 text-gray-400" />
                  <label className="text-sm font-medium text-gray-300">
                    Authentication
                  </label>
                  <button
                    onClick={() => setUseAuth(!useAuth)}
                    disabled={!enabled}
                    className={`ml-auto px-2 py-1 text-xs rounded ${
                      useAuth
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-700 text-gray-400'
                    } disabled:opacity-50`}
                  >
                    {useAuth ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                {useAuth && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">
                        Username
                      </label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        disabled={!enabled}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={!enabled}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm disabled:opacity-50"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Bypass Rules */}
              <div className="border-t border-gray-700 pt-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Bypass Rules (Direct Connection)
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Requests matching these patterns will bypass the upstream proxy.
                  Use * for wildcard matching.
                </p>

                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newBypassRule}
                    onChange={(e) => setNewBypassRule(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addBypassRule()}
                    disabled={!enabled}
                    placeholder="*.internal.com"
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm disabled:opacity-50"
                  />
                  <button
                    onClick={addBypassRule}
                    disabled={!enabled || !newBypassRule}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-md disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {bypassRules.map((rule) => (
                    <span
                      key={rule}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-gray-700 rounded text-sm"
                    >
                      {rule}
                      <button
                        onClick={() => removeBypassRule(rule)}
                        disabled={!enabled}
                        className="text-gray-400 hover:text-red-400 disabled:opacity-50"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700">
          <button
            onClick={handleClear}
            disabled={loading || saving || !config}
            className="flex items-center gap-1 px-3 py-2 text-sm text-red-400 hover:text-red-300 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading || saving}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-primary-600 hover:bg-primary-500 disabled:opacity-50 rounded-md"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
