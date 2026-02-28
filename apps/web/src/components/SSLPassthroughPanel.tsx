import { useState, useEffect, useCallback } from 'react';
import { Shield, X, Plus, Trash2, Zap } from 'lucide-react';
import {
  getSSLPassthroughDomains,
  addSSLPassthroughDomain,
  deleteSSLPassthroughDomain,
  toggleSSLPassthroughDomain,
  type SSLPassthroughDomain,
} from '../services/api';

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
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary-400" />
            SSL Passthrough
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

              {/* Description */}
              <p className="text-xs text-gray-500">
                Domains listed here will bypass MITM interception. Their SSL/TLS traffic
                will pass through the proxy without being decrypted. Use wildcards like
                *.example.com to match all subdomains.
              </p>

              {/* Add new domain */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    placeholder="e.g., *.google.com or youtube.com"
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm"
                  />
                  <button
                    onClick={handleAdd}
                    disabled={adding || !newDomain.trim()}
                    className="flex items-center gap-1 px-3 py-2 bg-primary-600 hover:bg-primary-500 rounded-md text-sm disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>
                <input
                  type="text"
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  placeholder="Reason (optional)"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm"
                />
              </div>

              {/* Quick add common domains */}
              <div className="border-t border-gray-700 pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-medium text-gray-300">Quick Add</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {COMMON_DOMAINS.map((cd) => {
                    const alreadyAdded = domains.some((d) => d.domain === cd.domain);
                    return (
                      <button
                        key={cd.domain}
                        onClick={() => handleQuickAdd(cd.domain, cd.reason)}
                        disabled={alreadyAdded}
                        className={`px-2 py-1 text-xs rounded border ${
                          alreadyAdded
                            ? 'bg-gray-700 border-gray-600 text-gray-500 cursor-not-allowed'
                            : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:border-gray-500'
                        }`}
                      >
                        {cd.domain}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Domain list */}
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
                          {/* Toggle */}
                          <button
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
                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(domain.id)}
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

        {/* Footer */}
        <div className="flex items-center justify-end px-4 py-3 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
