import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { RuleAction, RuleCreateInput, RuleMatcher } from '@nectoproxy/shared';
import { useRulesStore } from '@/stores/rulesStore';
import { createRule, updateRule } from '@/services/api';
import { Button, Input, Select, Switch, IconButton, cn } from '@/components/ui';

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

const textareaClass =
  'w-full bg-canvas text-ink placeholder:text-ink-faint rounded-md border border-edge ' +
  'px-2.5 py-2 text-sm transition-colors focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50';

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
              <label className="block text-sm text-ink-secondary mb-1">Status Code</label>
              <Input
                type="number"
                sizeVariant="md"
                value={(config.status as number) || 200}
                onChange={(e) => setConfig({ ...config, status: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm text-ink-secondary mb-1">Response Body</label>
              <textarea
                value={(config.body as string) || ''}
                onChange={(e) => setConfig({ ...config, body: e.target.value })}
                placeholder="Response body content..."
                className={cn(textareaClass, 'h-24 font-mono')}
              />
            </div>
            <div>
              <label className="block text-sm text-ink-secondary mb-1">Content-Type Header</label>
              <Input
                type="text"
                sizeVariant="md"
                value={(config.headers as Record<string, string>)?.['content-type'] || ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    headers: { ...(config.headers as Record<string, string>), 'content-type': e.target.value },
                  })
                }
                placeholder="application/json"
              />
            </div>
          </div>
        );

      case 'map-local':
        return (
          <div>
            <label className="block text-sm text-ink-secondary mb-1">Local Path</label>
            <Input
              type="text"
              sizeVariant="md"
              value={(config.localPath as string) || ''}
              onChange={(e) => setConfig({ ...config, localPath: e.target.value })}
              placeholder="/path/to/local/files"
            />
          </div>
        );

      case 'map-remote':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-ink-secondary mb-1">Target URL</label>
              <Input
                type="text"
                sizeVariant="md"
                value={(config.targetUrl as string) || ''}
                onChange={(e) => setConfig({ ...config, targetUrl: e.target.value })}
                placeholder="https://example.com"
              />
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2">
                <Switch
                  checked={(config.preservePath as boolean) || false}
                  aria-label="Preserve Path"
                  onCheckedChange={(v) => setConfig({ ...config, preservePath: v })}
                />
                <span className="text-sm text-ink">Preserve Path</span>
              </label>
              <label className="flex items-center gap-2">
                <Switch
                  checked={(config.preserveQuery as boolean) || false}
                  aria-label="Preserve Query"
                  onCheckedChange={(v) => setConfig({ ...config, preserveQuery: v })}
                />
                <span className="text-sm text-ink">Preserve Query</span>
              </label>
            </div>
          </div>
        );

      case 'delay':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-ink-secondary mb-1">Delay (ms)</label>
              <Input
                type="number"
                sizeVariant="md"
                value={(config.delay as number) || 1000}
                onChange={(e) => setConfig({ ...config, delay: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm text-ink-secondary mb-1">Variance (ms)</label>
              <Input
                type="number"
                sizeVariant="md"
                value={(config.variance as number) || 0}
                onChange={(e) => setConfig({ ...config, variance: parseInt(e.target.value) })}
              />
            </div>
          </div>
        );

      case 'throttle':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-ink-secondary mb-1">Bytes per Second</label>
              <Input
                type="number"
                sizeVariant="md"
                value={(config.bytesPerSecond as number) || 50000}
                onChange={(e) => setConfig({ ...config, bytesPerSecond: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm text-ink-secondary mb-1">Latency (ms)</label>
              <Input
                type="number"
                sizeVariant="md"
                value={(config.latency as number) || 0}
                onChange={(e) => setConfig({ ...config, latency: parseInt(e.target.value) })}
              />
            </div>
          </div>
        );

      case 'block':
        return (
          <p className="text-sm text-ink-secondary">
            This rule will block matching requests and return a 403 Forbidden response.
          </p>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-overlay border border-edge rounded-lg shadow-popover w-[500px] max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-edge">
          <h3 className="font-medium text-ink">{editingRule ? 'Edit Rule' : 'Create Rule'}</h3>
          <IconButton label="Close" icon={<X className="w-5 h-5" />} onClick={handleClose} />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm text-ink-secondary mb-1">Name</label>
            <Input
              type="text"
              sizeVariant="md"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Rule name"
              required
            />
          </div>

          {/* Match Conditions */}
          <div className="space-y-3">
            <h4 className="text-xs font-medium uppercase tracking-wide text-ink-muted">Match Conditions</h4>

            <div>
              <label className="block text-sm text-ink-secondary mb-1">URL Pattern</label>
              <Input
                type="text"
                sizeVariant="md"
                value={(match.url as string) || ''}
                onChange={(e) => setMatch({ ...match, url: e.target.value || undefined })}
                placeholder="*api.example.com* or /regex/"
              />
            </div>

            <div>
              <label className="block text-sm text-ink-secondary mb-1">Methods</label>
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
                      className={cn(
                        'px-2 py-1 text-xs rounded border transition-colors',
                        selected
                          ? 'bg-accent/12 border-accent/25 text-accent'
                          : 'bg-surface-raised border-edge text-ink-secondary hover:bg-surface-overlay'
                      )}
                    >
                      {method}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm text-ink-secondary mb-1">Host</label>
              <Input
                type="text"
                sizeVariant="md"
                value={(match.host as string) || ''}
                onChange={(e) => setMatch({ ...match, host: e.target.value || undefined })}
                placeholder="api.example.com"
              />
            </div>
          </div>

          {/* Action */}
          <div>
            <label className="block text-sm text-ink-secondary mb-1">Action</label>
            <Select
              sizeVariant="md"
              value={action}
              onChange={(e) => {
                setAction(e.target.value as RuleAction);
                setConfig({});
              }}
              className="w-full"
            >
              {ACTIONS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label} - {a.description}
                </option>
              ))}
            </Select>
          </div>

          {/* Action Config */}
          <div>
            <h4 className="text-xs font-medium uppercase tracking-wide text-ink-muted mb-2">Action Configuration</h4>
            {renderActionConfig()}
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm text-ink-secondary mb-1">Priority (lower = higher priority)</label>
            <Input
              type="number"
              sizeVariant="md"
              value={priority}
              onChange={(e) => setPriority(parseInt(e.target.value))}
            />
          </div>

          {/* Enabled */}
          <label className="flex items-center gap-2">
            <Switch
              checked={enabled}
              aria-label="Enabled"
              onCheckedChange={setEnabled}
            />
            <span className="text-sm text-ink">Enabled</span>
          </label>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-edge">
          <Button variant="secondary" size="md" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            disabled={isSubmitting || !name}
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}
