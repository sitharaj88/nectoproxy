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
import { Button, Input, Switch, Badge } from './ui';

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
      <Button variant="ghost" size="md" onClick={onClose}>
        Close
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="SSL Passthrough"
      titleIcon={<Shield className="w-5 h-5 text-accent" aria-hidden="true" />}
      size="md"
      footer={footer}
    >
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center h-32 gap-2 text-ink-muted" role="status">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading domains…</span>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="p-3 rounded-md bg-danger/12 border border-danger/25 text-danger text-sm" role="alert">
                {error}
              </div>
            )}

            <p className="text-xs text-ink-muted">
              Domains listed here will bypass MITM interception. Their SSL/TLS traffic
              will pass through the proxy without being decrypted. Use wildcards like
              *.example.com to match all subdomains.
            </p>

            <div className="space-y-2">
              <label htmlFor={domainId} className="sr-only">Domain</label>
              <div className="flex gap-2">
                <Input
                  id={domainId}
                  type="text"
                  sizeVariant="md"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAdd();
                    }
                  }}
                  placeholder="e.g., *.google.com or youtube.com"
                  className="flex-1"
                />
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleAdd}
                  disabled={adding || !newDomain.trim()}
                >
                  {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" aria-hidden="true" />}
                  Add
                </Button>
              </div>
              <label htmlFor={reasonId} className="sr-only">Reason (optional)</label>
              <Input
                id={reasonId}
                type="text"
                sizeVariant="md"
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
                placeholder="Reason (optional)"
              />
            </div>

            <div className="border-t border-edge pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-warn" aria-hidden="true" />
                <span className="text-sm font-medium text-ink">Quick Add</span>
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
                      className={`px-2 py-1 text-xs rounded border transition-colors ${
                        alreadyAdded
                          ? 'bg-surface-raised border-edge text-ink-faint'
                          : 'bg-surface-raised border-edge text-ink-secondary hover:bg-surface-overlay hover:border-edge-strong'
                      }`}
                    >
                      {cd.domain}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-edge pt-4">
              <h4 className="text-sm font-medium text-ink mb-2">
                Passthrough Domains ({domains.length})
              </h4>
              {domains.length === 0 ? (
                <p className="text-sm text-ink-muted py-4 text-center">
                  No passthrough domains configured. Add domains above to bypass SSL interception.
                </p>
              ) : (
                <div className="space-y-2">
                  {domains.map((domain) => (
                    <div
                      key={domain.id}
                      className="flex items-center justify-between p-3 bg-canvas border border-edge-subtle rounded-md"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono text-ink truncate">
                            {domain.domain}
                          </span>
                          {!domain.enabled && (
                            <Badge tone="neutral">disabled</Badge>
                          )}
                        </div>
                        {domain.reason && (
                          <p className="text-xs text-ink-muted mt-0.5 truncate">
                            {domain.reason}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-2 shrink-0">
                        <Switch
                          checked={domain.enabled}
                          aria-label={`${domain.enabled ? 'Disable' : 'Enable'} ${domain.domain}`}
                          onCheckedChange={() => handleToggle(domain.id)}
                        />
                        <button
                          type="button"
                          onClick={() => handleDelete(domain.id)}
                          aria-label={`Delete ${domain.domain}`}
                          className="p-1 text-ink-muted hover:text-danger rounded transition-colors"
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
