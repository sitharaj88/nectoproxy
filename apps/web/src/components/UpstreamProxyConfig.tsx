import { useState, useEffect, useCallback, useId } from 'react';
import { Globe, Lock, Save, Plus, Trash2, Loader2 } from 'lucide-react';
import {
  getUpstreamProxyConfig,
  updateUpstreamProxyConfig,
  clearUpstreamProxy,
  type UpstreamProxyConfig as UpstreamProxyConfigType,
  type UpstreamProxyType,
} from '../services/api';
import { Modal } from './ui/Modal';
import { toast } from './ui/Toaster';

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

  const [enabled, setEnabled] = useState(false);
  const [type, setType] = useState<UpstreamProxyType>('http');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('8080');
  const [useAuth, setUseAuth] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [bypassRules, setBypassRules] = useState<string[]>(DEFAULT_BYPASS_RULES);
  const [newBypassRule, setNewBypassRule] = useState('');

  const typeId = useId();
  const hostId = useId();
  const portId = useId();
  const usernameId = useId();
  const passwordId = useId();
  const bypassId = useId();

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
      toast.success('Upstream proxy saved');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm('Clear upstream proxy configuration?')) return;
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
      toast.success('Upstream proxy cleared');
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

  const footer = (
    <div className="flex items-center justify-between">
      <button
        type="button"
        onClick={handleClear}
        disabled={loading || saving || !config}
        className="flex items-center gap-1 px-3 py-2 text-sm text-red-400 hover:text-red-300 disabled:opacity-50"
      >
        <Trash2 className="w-4 h-4" aria-hidden="true" />
        Clear
      </button>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-2 text-sm text-gray-400 hover:text-gray-300"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={loading || saving}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-primary-600 hover:bg-primary-500 disabled:opacity-50 rounded-md text-white"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" aria-hidden="true" />
          )}
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upstream Proxy Configuration"
      titleIcon={<Globe className="w-5 h-5 text-primary-400" aria-hidden="true" />}
      size="md"
      footer={footer}
    >
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center h-32 gap-2 text-gray-500" role="status">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading configuration…</span>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <div
                className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                role="alert"
              >
                {error}
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-300">
                Enable Upstream Proxy
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                aria-label="Enable upstream proxy"
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

            <div>
              <label htmlFor={typeId} className="block text-sm font-medium text-gray-300 mb-1">
                Proxy Type
              </label>
              <select
                id={typeId}
                value={type}
                onChange={(e) => setType(e.target.value as UpstreamProxyType)}
                disabled={!enabled}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm"
              >
                {PROXY_TYPES.map((pt) => (
                  <option key={pt.value} value={pt.value}>
                    {pt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label htmlFor={hostId} className="block text-sm font-medium text-gray-300 mb-1">
                  Host
                </label>
                <input
                  id={hostId}
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  disabled={!enabled}
                  placeholder="proxy.example.com"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm"
                />
              </div>
              <div>
                <label htmlFor={portId} className="block text-sm font-medium text-gray-300 mb-1">
                  Port
                </label>
                <input
                  id={portId}
                  type="number"
                  min={1}
                  max={65535}
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  disabled={!enabled}
                  placeholder="8080"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm"
                />
              </div>
            </div>

            <div className="border-t border-gray-700 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Lock className="w-4 h-4 text-gray-400" aria-hidden="true" />
                <span className="text-sm font-medium text-gray-300">Authentication</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={useAuth}
                  aria-label="Enable authentication"
                  onClick={() => setUseAuth(!useAuth)}
                  disabled={!enabled}
                  className={`ml-auto px-2 py-1 text-xs rounded ${
                    useAuth ? 'bg-primary-600 text-white' : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  {useAuth ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              {useAuth && (
                <div className="space-y-3">
                  <div>
                    <label htmlFor={usernameId} className="block text-sm text-gray-400 mb-1">
                      Username
                    </label>
                    <input
                      id={usernameId}
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={!enabled}
                      autoComplete="username"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor={passwordId} className="block text-sm text-gray-400 mb-1">
                      Password
                    </label>
                    <input
                      id={passwordId}
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={!enabled}
                      autoComplete="current-password"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-700 pt-4">
              <label htmlFor={bypassId} className="block text-sm font-medium text-gray-300 mb-2">
                Bypass Rules (Direct Connection)
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Requests matching these patterns will bypass the upstream proxy.
                Use * for wildcard matching.
              </p>

              <div className="flex gap-2 mb-2">
                <input
                  id={bypassId}
                  type="text"
                  value={newBypassRule}
                  onChange={(e) => setNewBypassRule(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addBypassRule();
                    }
                  }}
                  disabled={!enabled}
                  placeholder="*.internal.com"
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm"
                />
                <button
                  type="button"
                  onClick={addBypassRule}
                  disabled={!enabled || !newBypassRule}
                  aria-label="Add bypass rule"
                  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-md disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
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
                      type="button"
                      onClick={() => removeBypassRule(rule)}
                      disabled={!enabled}
                      aria-label={`Remove bypass rule ${rule}`}
                      className="text-gray-400 hover:text-red-400 disabled:opacity-50"
                    >
                      <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
