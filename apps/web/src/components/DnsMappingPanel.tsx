import { useEffect, useState, useCallback } from 'react';
import { X, Pencil, Trash2, ArrowRight } from 'lucide-react';
import type { DnsMapping, DnsMappingCreateInput } from '@nectoproxy/shared';
import {
  getDnsMappings,
  createDnsMapping,
  updateDnsMapping,
  toggleDnsMapping,
  deleteDnsMapping,
  resolveDnsMapping,
} from '@/services/api';
import { Button, Input, Switch, Card, IconButton } from './ui';

interface DnsMappingPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;
const DOMAIN_REGEX = /^(\*\.)?([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/;

function isValidIp(ip: string): boolean {
  if (!IP_REGEX.test(ip)) return false;
  const parts = ip.split('.');
  return parts.every((part) => {
    const num = parseInt(part, 10);
    return num >= 0 && num <= 255;
  });
}

function isValidDomain(domain: string): boolean {
  return DOMAIN_REGEX.test(domain);
}

export function DnsMappingPanel({ isOpen, onClose }: DnsMappingPanelProps) {
  const [mappings, setMappings] = useState<DnsMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add form state
  const [newDomain, setNewDomain] = useState('');
  const [newTargetIp, setNewTargetIp] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDomain, setEditDomain] = useState('');
  const [editTargetIp, setEditTargetIp] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Test resolve state
  const [testHostname, setTestHostname] = useState('');
  const [testResult, setTestResult] = useState<{
    hostname: string;
    resolvedIp: string | null;
    matched: boolean;
  } | null>(null);

  const loadMappings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getDnsMappings();
      setMappings(response.mappings);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadMappings();
    }
  }, [isOpen, loadMappings]);

  const handleAdd = async () => {
    setAddError(null);

    if (!newDomain.trim()) {
      setAddError('Domain is required');
      return;
    }

    if (!isValidDomain(newDomain.trim())) {
      setAddError('Invalid domain format (e.g., example.com or *.example.com)');
      return;
    }

    if (!newTargetIp.trim()) {
      setAddError('Target IP is required');
      return;
    }

    if (!isValidIp(newTargetIp.trim())) {
      setAddError('Invalid IP address format (e.g., 127.0.0.1)');
      return;
    }

    try {
      const input: DnsMappingCreateInput = {
        domain: newDomain.trim(),
        targetIp: newTargetIp.trim(),
        description: newDescription.trim() || undefined,
      };

      await createDnsMapping(input);
      setNewDomain('');
      setNewTargetIp('');
      setNewDescription('');
      await loadMappings();
    } catch (err) {
      setAddError((err as Error).message);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await toggleDnsMapping(id);
      await loadMappings();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDnsMapping(id);
      await loadMappings();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleEditStart = (mapping: DnsMapping) => {
    setEditingId(mapping.id);
    setEditDomain(mapping.domain);
    setEditTargetIp(mapping.targetIp);
    setEditDescription(mapping.description || '');
  };

  const handleEditSave = async () => {
    if (!editingId) return;

    if (!isValidDomain(editDomain.trim())) {
      setError('Invalid domain format');
      return;
    }

    if (!isValidIp(editTargetIp.trim())) {
      setError('Invalid IP address format');
      return;
    }

    try {
      await updateDnsMapping(editingId, {
        domain: editDomain.trim(),
        targetIp: editTargetIp.trim(),
        description: editDescription.trim() || undefined,
      });
      setEditingId(null);
      await loadMappings();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleEditCancel = () => {
    setEditingId(null);
  };

  const handleTestResolve = async () => {
    if (!testHostname.trim()) return;

    try {
      const result = await resolveDnsMapping(testHostname.trim());
      setTestResult(result);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-surface-overlay border border-edge rounded-lg shadow-popover w-[700px] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-edge">
          <div>
            <h2 className="text-lg font-semibold text-ink">DNS Spoofing</h2>
            <p className="text-xs text-ink-muted mt-1">
              Map domains to custom IP addresses for request resolution
            </p>
          </div>
          <IconButton label="Close" icon={<X className="w-5 h-5" />} onClick={onClose} />
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-danger/12 text-danger text-sm">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 underline text-danger hover:text-ink"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-5">
          {/* Add new mapping form */}
          <Card className="p-4">
            <h3 className="text-xs font-medium uppercase tracking-wide text-ink-muted mb-3">Add DNS Mapping</h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-ink-secondary mb-1">Domain</label>
                  <Input
                    type="text"
                    sizeVariant="md"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    placeholder="e.g., api.example.com or *.example.com"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-ink-secondary mb-1">Target IP</label>
                  <Input
                    type="text"
                    sizeVariant="md"
                    value={newTargetIp}
                    onChange={(e) => setNewTargetIp(e.target.value)}
                    placeholder="e.g., 127.0.0.1"
                  />
                </div>
              </div>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-xs text-ink-secondary mb-1">Description (optional)</label>
                  <Input
                    type="text"
                    sizeVariant="md"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="e.g., Redirect to local dev server"
                  />
                </div>
                <Button variant="primary" size="md" onClick={handleAdd} className="whitespace-nowrap">
                  Add Mapping
                </Button>
              </div>
              {addError && (
                <p className="text-xs text-danger">{addError}</p>
              )}
            </div>
          </Card>

          {/* Mappings table */}
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wide text-ink-muted mb-3">
              Active Mappings ({mappings.length})
            </h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-edge border-t-accent" />
              </div>
            ) : mappings.length === 0 ? (
              <div className="text-sm text-ink-muted p-4 bg-canvas border border-edge-subtle rounded-lg text-center">
                No DNS mappings configured. Add one above to get started.
              </div>
            ) : (
              <div className="space-y-2">
                {mappings.map((mapping) => (
                  <div
                    key={mapping.id}
                    className={`p-3 bg-canvas rounded-lg border ${
                      mapping.enabled ? 'border-edge-subtle' : 'border-edge-subtle opacity-60'
                    }`}
                  >
                    {editingId === mapping.id ? (
                      /* Edit mode */
                      <div className="space-y-2">
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <label className="block text-xs text-ink-secondary mb-1">Domain</label>
                            <Input
                              type="text"
                              value={editDomain}
                              onChange={(e) => setEditDomain(e.target.value)}
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs text-ink-secondary mb-1">Target IP</label>
                            <Input
                              type="text"
                              value={editTargetIp}
                              onChange={(e) => setEditTargetIp(e.target.value)}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-ink-secondary mb-1">Description</label>
                          <Input
                            type="text"
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="xs" onClick={handleEditCancel}>
                            Cancel
                          </Button>
                          <Button variant="primary" size="xs" onClick={handleEditSave}>
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* View mode */
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono text-ink truncate">
                              {mapping.domain}
                            </span>
                            <ArrowRight className="w-4 h-4 text-ink-muted flex-shrink-0" />
                            <span className="text-sm font-mono text-accent truncate">
                              {mapping.targetIp}
                            </span>
                          </div>
                          {mapping.description && (
                            <p className="text-xs text-ink-muted mt-1 truncate">
                              {mapping.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                          {/* Toggle switch */}
                          <Switch
                            checked={mapping.enabled}
                            aria-label={mapping.enabled ? 'Disable' : 'Enable'}
                            onCheckedChange={() => handleToggle(mapping.id)}
                          />
                          {/* Edit button */}
                          <IconButton
                            label="Edit"
                            icon={<Pencil className="w-4 h-4" />}
                            onClick={() => handleEditStart(mapping)}
                          />
                          {/* Delete button */}
                          <IconButton
                            label="Delete"
                            variant="danger"
                            icon={<Trash2 className="w-4 h-4" />}
                            onClick={() => handleDelete(mapping.id)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Test resolve section */}
          <div className="border-t border-edge pt-4">
            <h3 className="text-xs font-medium uppercase tracking-wide text-ink-muted mb-3">Test Resolution</h3>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs text-ink-secondary mb-1">Hostname</label>
                <Input
                  type="text"
                  sizeVariant="md"
                  value={testHostname}
                  onChange={(e) => setTestHostname(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleTestResolve();
                  }}
                  placeholder="e.g., api.example.com"
                />
              </div>
              <Button variant="secondary" size="md" onClick={handleTestResolve} className="whitespace-nowrap">
                Resolve
              </Button>
            </div>
            {testResult && (
              <div className={`mt-2 p-3 rounded-md text-sm ${
                testResult.matched
                  ? 'bg-success/12 border border-success/25'
                  : 'bg-canvas border border-edge-subtle'
              }`}>
                {testResult.matched ? (
                  <span className="text-success">
                    {testResult.hostname} resolves to{' '}
                    <span className="font-mono font-medium">{testResult.resolvedIp}</span>
                  </span>
                ) : (
                  <span className="text-ink-secondary">
                    {testResult.hostname} -- no matching DNS mapping (will use default resolution)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-edge">
          <Button variant="ghost" size="md" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
