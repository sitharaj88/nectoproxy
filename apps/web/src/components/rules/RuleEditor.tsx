import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { RuleAction, RuleCreateInput, RuleMatcher } from '@nectoproxy/shared';
import { useRulesStore } from '@/stores/rulesStore';
import { createRule, updateRule } from '@/services/api';

const ACTIONS: { value: RuleAction; label: string; description: string }[] = [
  { value: 'mock', label: 'Mock Response', description: 'Return a custom response without forwarding' },
  { value: 'map-local', label: 'Map to Local', description: 'Serve files from local filesystem' },
  { value: 'map-remote', label: 'Map to Remote', description: 'Redirect to a different URL' },
  { value: 'modify-request', label: 'Modify Request', description: 'Change headers/body before forwarding' },
  { value: 'modify-response', label: 'Modify Response', description: 'Change response before returning' },
  { value: 'delay', label: 'Add Delay', description: 'Add latency to requests' },
  { value: 'throttle', label: 'Throttle', description: 'Limit bandwidth' },
  { value: 'block', label: 'Block', description: 'Block the request entirely' },
];

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

export function RuleEditor() {
  const { editingRule, setEditorOpen, addRule, updateRule: updateRuleInStore } = useRulesStore();

  const [name, setName] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [priority, setPriority] = useState(0);
  const [action, setAction] = useState<RuleAction>('mock');
  const [match, setMatch] = useState<RuleMatcher>({});
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingRule) {
      setName(editingRule.name);
      setEnabled(editingRule.enabled);
      setPriority(editingRule.priority);
      setAction(editingRule.action);
      setMatch(editingRule.match);
      setConfig((editingRule.config as Record<string, unknown>) || {});
    } else {
      setName('');
      setEnabled(true);
      setPriority(0);
      setAction('mock');
      setMatch({});
      setConfig({ status: 200 });
    }
  }, [editingRule]);

  const handleClose = () => {
    setEditorOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const input: RuleCreateInput = {
        name,
        enabled,
        priority,
        action,
        match,
        config: Object.keys(config).length > 0 ? config : undefined,
      };

      if (editingRule) {
        const updated = await updateRule(editingRule.id, input);
        updateRuleInStore(updated);
      } else {
        const created = await createRule(input);
        addRule(created);
      }

      handleClose();
    } catch (error) {
      console.error('Failed to save rule:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderActionConfig = () => {
    switch (action) {
      case 'mock':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Status Code</label>
              <input
                type="number"
                value={(config.status as number) || 200}
                onChange={(e) => setConfig({ ...config, status: parseInt(e.target.value) })}
                className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Response Body</label>
              <textarea
                value={(config.body as string) || ''}
                onChange={(e) => setConfig({ ...config, body: e.target.value })}
                placeholder="Response body content..."
                className="w-full bg-gray-700 rounded px-3 py-2 text-sm h-24 font-mono"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Content-Type Header</label>
              <input
                type="text"
                value={(config.headers as Record<string, string>)?.['content-type'] || ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    headers: { ...(config.headers as Record<string, string>), 'content-type': e.target.value },
                  })
                }
                placeholder="application/json"
                className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
              />
            </div>
          </div>
        );

      case 'map-local':
        return (
          <div>
            <label className="block text-sm text-gray-400 mb-1">Local Path</label>
            <input
              type="text"
              value={(config.localPath as string) || ''}
              onChange={(e) => setConfig({ ...config, localPath: e.target.value })}
              placeholder="/path/to/local/files"
              className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
            />
          </div>
        );

      case 'map-remote':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Target URL</label>
              <input
                type="text"
                value={(config.targetUrl as string) || ''}
                onChange={(e) => setConfig({ ...config, targetUrl: e.target.value })}
                placeholder="https://example.com"
                className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={(config.preservePath as boolean) || false}
                  onChange={(e) => setConfig({ ...config, preservePath: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Preserve Path</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={(config.preserveQuery as boolean) || false}
                  onChange={(e) => setConfig({ ...config, preserveQuery: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Preserve Query</span>
              </label>
            </div>
          </div>
        );

      case 'delay':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Delay (ms)</label>
              <input
                type="number"
                value={(config.delay as number) || 1000}
                onChange={(e) => setConfig({ ...config, delay: parseInt(e.target.value) })}
                className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Variance (ms)</label>
              <input
                type="number"
                value={(config.variance as number) || 0}
                onChange={(e) => setConfig({ ...config, variance: parseInt(e.target.value) })}
                className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
              />
            </div>
          </div>
        );

      case 'throttle':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Bytes per Second</label>
              <input
                type="number"
                value={(config.bytesPerSecond as number) || 50000}
                onChange={(e) => setConfig({ ...config, bytesPerSecond: parseInt(e.target.value) })}
                className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Latency (ms)</label>
              <input
                type="number"
                value={(config.latency as number) || 0}
                onChange={(e) => setConfig({ ...config, latency: parseInt(e.target.value) })}
                className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
              />
            </div>
          </div>
        );

      case 'block':
        return (
          <p className="text-sm text-gray-400">
            This rule will block matching requests and return a 403 Forbidden response.
          </p>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg w-[500px] max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="font-medium">{editingRule ? 'Edit Rule' : 'Create Rule'}</h3>
          <button onClick={handleClose} className="p-1 hover:bg-gray-700 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Rule name"
              className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
              required
            />
          </div>

          {/* Match Conditions */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-300">Match Conditions</h4>

            <div>
              <label className="block text-sm text-gray-400 mb-1">URL Pattern</label>
              <input
                type="text"
                value={(match.url as string) || ''}
                onChange={(e) => setMatch({ ...match, url: e.target.value || undefined })}
                placeholder="*api.example.com* or /regex/"
                className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Methods</label>
              <div className="flex flex-wrap gap-2">
                {METHODS.map((method) => {
                  const selected = Array.isArray(match.method)
                    ? match.method.includes(method)
                    : match.method === method;
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => {
                        const current = Array.isArray(match.method)
                          ? match.method
                          : match.method
                            ? [match.method]
                            : [];
                        const updated = selected
                          ? current.filter((m) => m !== method)
                          : [...current, method];
                        setMatch({ ...match, method: updated.length > 0 ? updated : undefined });
                      }}
                      className={`px-2 py-1 text-xs rounded ${
                        selected ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'
                      }`}
                    >
                      {method}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Host</label>
              <input
                type="text"
                value={(match.host as string) || ''}
                onChange={(e) => setMatch({ ...match, host: e.target.value || undefined })}
                placeholder="api.example.com"
                className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Action */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Action</label>
            <select
              value={action}
              onChange={(e) => {
                setAction(e.target.value as RuleAction);
                setConfig({});
              }}
              className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
            >
              {ACTIONS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label} - {a.description}
                </option>
              ))}
            </select>
          </div>

          {/* Action Config */}
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2">Action Configuration</h4>
            {renderActionConfig()}
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Priority (lower = higher priority)</label>
            <input
              type="number"
              value={priority}
              onChange={(e) => setPriority(parseInt(e.target.value))}
              className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
            />
          </div>

          {/* Enabled */}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Enabled</span>
          </label>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-gray-700">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm bg-gray-700 rounded hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !name}
            className="px-4 py-2 text-sm bg-blue-500 rounded hover:bg-blue-400 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
