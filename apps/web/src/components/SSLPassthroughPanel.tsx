import { useState, useEffect, useCallback, useId } from 'react';
import { Shield, Plus, Trash2, Zap, Loader2 } from 'lucide-react';
import {
  getSSLPassthroughDomains,
  addSSLPassthroughDomain,
  deleteSSLPassthroughDomain,
  toggleSSLPassthroughDomain,
  type SSLPassthroughDomain,
} from '../services/api';
import { Modal } from './ui/Modal';
import { toast } from './ui/Toaster';

interface SSLPassthroughPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const COMMON_DOMAINS = [
  { domain: '*.google.com', reason: 'Google services' },
  { domain: 'youtube.com', reason: 'YouTube' },
  { domain: '*.youtube.com', reason: 'YouTube subdomains' },
  { domain: '*.apple.com', reason: 'Apple services' },
  { domain: '*.icloud.com', reason: 'iCloud services' },
  { domain: '*.microsoft.com', reason: 'Microsoft services' },
];

export function SSLPassthroughPanel({ isOpen, onClose }: SSLPassthroughPanelProps) {
  const [domains, setDomains] = useState<SSLPassthroughDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [newDomain, setNewDomain] = useState('');
  const [newReason, setNewReason] = useState('');
  const [adding, setAdding] = useState(false);

  const domainId = useId();
  const reasonId = useId();

  const loadDomains = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSSLPassthroughDomains();
      setDomains(data.domains);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadDomains();
    }
  }, [isOpen, loadDomains]);

  const handleAdd = async () => {
    if (!newDomain.trim()) return;

    try {
      setAdding(true);
      setError(null);
      const domain = await addSSLPassthroughDomain({
        domain: newDomain.trim(),
        reason: newReason.trim() || undefined,
      });
      setDomains([...domains, domain]);
      setNewDomain('');
      setNewReason('');
      toast.success(`Added ${domain.domain}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    const target = domains.find((d) => d.id === id);
    if (target && !window.confirm(`Remove SSL passthrough for ${target.domain}?`)) return;
    try {
      setError(null);
      await deleteSSLPassthroughDomain(id);
      setDomains(domains.filter((d) => d.id !== id));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      setError(null);
      const updated = await toggleSSLPassthroughDomain(id);
      setDomains(domains.map((d) => (d.id === id ? updated : d)));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleQuickAdd = async (domain: string, reason: string) => {
    // Skip if already added
    if (domains.some((d) => d.domain === domain)) return;

    try {
      setError(null);
      const created = await addSSLPassthroughDomain({ domain, reason });
      setDomains([...domains, created]);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const footer = (
    <div className="flex items-center justify-end">
      <button
        type="button"
        onClick={onClose}
        className="px-3 py-2 text-sm text-gray-400 hover:text-gray-300"
      >
        Close
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="SSL Passthrough"
      titleIcon={<Shield className="w-5 h-5 text-primary-400" aria-hidden="true" />}
      size="md"
      footer={footer}
    >
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center h-32 gap-2 text-gray-500" role="status">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading domains…</span>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-sm" role="alert">
                {error}
              </div>
            )}

            <p className="text-xs text-gray-500">
              Domains listed here will bypass MITM interception. Their SSL/TLS traffic
              will pass through the proxy without being decrypted. Use wildcards like
              *.example.com to match all subdomains.
            </p>

            <div className="space-y-2">
              <label htmlFor={domainId} className="sr-only">Domain</label>
              <div className="flex gap-2">
                <input
                  id={domainId}
                  type="text"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAdd();
                    }
                  }}
                  placeholder="e.g., *.google.com or youtube.com"
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm"
                />
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={adding || !newDomain.trim()}
                  className="flex items-center gap-1 px-3 py-2 bg-primary-600 hover:bg-primary-500 rounded-md text-sm disabled:opacity-50 text-white"
                >
                  {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" aria-hidden="true" />}
                  Add
                </button>
              </div>
              <label htmlFor={reasonId} className="sr-only">Reason (optional)</label>
              <input
                id={reasonId}
                type="text"
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
                placeholder="Reason (optional)"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm"
              />
            </div>

            <div className="border-t border-gray-700 pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-yellow-400" aria-hidden="true" />
                <span className="text-sm font-medium text-gray-300">Quick Add</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {COMMON_DOMAINS.map((cd) => {
                  const alreadyAdded = domains.some((d) => d.domain === cd.domain);
                  return (
                    <button
                      key={cd.domain}
                      type="button"
                      onClick={() => handleQuickAdd(cd.domain, cd.reason)}
                      disabled={alreadyAdded}
                      title={alreadyAdded ? 'Already added' : `Add ${cd.domain}`}
                      className={`px-2 py-1 text-xs rounded border ${
                        alreadyAdded
                          ? 'bg-gray-700 border-gray-600 text-gray-500'
                          : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:border-gray-500'
                      }`}
                    >
                      {cd.domain}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-gray-700 pt-4">
              <h4 className="text-sm font-medium text-gray-300 mb-2">
                Passthrough Domains ({domains.length})
              </h4>
              {domains.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">
                  No passthrough domains configured. Add domains above to bypass SSL interception.
                </p>
              ) : (
                <div className="space-y-2">
                  {domains.map((domain) => (
                    <div
                      key={domain.id}
                      className="flex items-center justify-between p-3 bg-gray-900 rounded-md"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono text-white truncate">
                            {domain.domain}
                          </span>
                          {!domain.enabled && (
                            <span className="text-xs px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded">
                              disabled
                            </span>
                          )}
                        </div>
                        {domain.reason && (
                          <p className="text-xs text-gray-500 mt-0.5 truncate">
                            {domain.reason}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-2 shrink-0">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={domain.enabled}
                          aria-label={`${domain.enabled ? 'Disable' : 'Enable'} ${domain.domain}`}
                          onClick={() => handleToggle(domain.id)}
                          className={`relative w-10 h-5 rounded-full transition-colors ${
                            domain.enabled ? 'bg-primary-600' : 'bg-gray-600'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                              domain.enabled ? 'left-5' : 'left-0.5'
                            }`}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(domain.id)}
                          aria-label={`Delete ${domain.domain}`}
                          className="p-1 text-gray-400 hover:text-red-400 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
