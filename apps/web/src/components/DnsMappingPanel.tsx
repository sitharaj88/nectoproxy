import { useEffect, useState, useCallback } from 'react';
import type { DnsMapping, DnsMappingCreateInput } from '@proxyscope/shared';
import {
  getDnsMappings,
  createDnsMapping,
  updateDnsMapping,
  toggleDnsMapping,
  deleteDnsMapping,
  resolveDnsMapping,
} from '@/services/api';

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
      <div className="bg-gray-800 rounded-lg shadow-xl w-[700px] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-white">DNS Spoofing</h2>
            <p className="text-xs text-gray-400 mt-1">
              Map domains to custom IP addresses for request resolution
            </p>
          </div>
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
              onClick={() => setError(null)}
              className="ml-2 text-red-300 hover:text-red-100"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-5">
          {/* Add new mapping form */}
          <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Add DNS Mapping</h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-gray-400 mb-1">Domain</label>
                  <input
                    type="text"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    placeholder="e.g., api.example.com or *.example.com"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-400 mb-1">Target IP</label>
                  <input
                    type="text"
                    value={newTargetIp}
                    onChange={(e) => setNewTargetIp(e.target.value)}
                    placeholder="e.g., 127.0.0.1"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-xs text-gray-400 mb-1">Description (optional)</label>
                  <input
                    type="text"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="e.g., Redirect to local dev server"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={handleAdd}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md whitespace-nowrap"
                >
                  Add Mapping
                </button>
              </div>
              {addError && (
                <p className="text-xs text-red-400">{addError}</p>
              )}
            </div>
          </div>

          {/* Mappings table */}
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-3">
              Active Mappings ({mappings.length})
            </h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-600 border-t-blue-500" />
              </div>
            ) : mappings.length === 0 ? (
              <div className="text-sm text-gray-500 p-4 bg-gray-900 rounded-lg text-center">
                No DNS mappings configured. Add one above to get started.
              </div>
            ) : (
              <div className="space-y-2">
                {mappings.map((mapping) => (
                  <div
                    key={mapping.id}
                    className={`p-3 bg-gray-900 rounded-lg border ${
                      mapping.enabled ? 'border-gray-700' : 'border-gray-800 opacity-60'
                    }`}
                  >
                    {editingId === mapping.id ? (
                      /* Edit mode */
                      <div className="space-y-2">
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <label className="block text-xs text-gray-400 mb-1">Domain</label>
                            <input
                              type="text"
                              value={editDomain}
                              onChange={(e) => setEditDomain(e.target.value)}
                              className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs text-gray-400 mb-1">Target IP</label>
                            <input
                              type="text"
                              value={editTargetIp}
                              onChange={(e) => setEditTargetIp(e.target.value)}
                              className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Description</label>
                          <input
                            type="text"
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={handleEditCancel}
                            className="px-3 py-1.5 text-xs text-gray-300 hover:text-white hover:bg-gray-700 rounded"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleEditSave}
                            className="px-3 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* View mode */
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono text-white truncate">
                              {mapping.domain}
                            </span>
                            <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                            <span className="text-sm font-mono text-blue-400 truncate">
                              {mapping.targetIp}
                            </span>
                          </div>
                          {mapping.description && (
                            <p className="text-xs text-gray-500 mt-1 truncate">
                              {mapping.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                          {/* Toggle switch */}
                          <button
                            onClick={() => handleToggle(mapping.id)}
                            className={`w-9 h-5 rounded-full transition-colors ${
                              mapping.enabled ? 'bg-blue-600' : 'bg-gray-600'
                            }`}
                            title={mapping.enabled ? 'Disable' : 'Enable'}
                          >
                            <span
                              className={`block w-3.5 h-3.5 bg-white rounded-full transform transition-transform ${
                                mapping.enabled ? 'translate-x-[18px]' : 'translate-x-[3px]'
                              }`}
                            />
                          </button>
                          {/* Edit button */}
                          <button
                            onClick={() => handleEditStart(mapping)}
                            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          {/* Delete button */}
                          <button
                            onClick={() => handleDelete(mapping.id)}
                            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded transition-colors"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Test resolve section */}
          <div className="border-t border-gray-700 pt-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Test Resolution</h3>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs text-gray-400 mb-1">Hostname</label>
                <input
                  type="text"
                  value={testHostname}
                  onChange={(e) => setTestHostname(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleTestResolve();
                  }}
                  placeholder="e.g., api.example.com"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                onClick={handleTestResolve}
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-md whitespace-nowrap"
              >
                Resolve
              </button>
            </div>
            {testResult && (
              <div className={`mt-2 p-3 rounded-md text-sm ${
                testResult.matched
                  ? 'bg-green-900/20 border border-green-800'
                  : 'bg-gray-900 border border-gray-700'
              }`}>
                {testResult.matched ? (
                  <span className="text-green-400">
                    {testResult.hostname} resolves to{' '}
                    <span className="font-mono font-medium">{testResult.resolvedIp}</span>
                  </span>
                ) : (
                  <span className="text-gray-400">
                    {testResult.hostname} -- no matching DNS mapping (will use default resolution)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
