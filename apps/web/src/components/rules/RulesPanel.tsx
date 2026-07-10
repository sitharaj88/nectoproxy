import { useEffect } from 'react';
import { Plus, X, ListFilter } from 'lucide-react';
import { useRulesStore } from '@/stores/rulesStore';
import { getRules } from '@/services/api';
import { subscribeToRules } from '@/services/socket';
import { RulesList } from './RulesList';
import { RuleEditor } from './RuleEditor';
import { Button, IconButton, EmptyState } from '@/components/ui';

interface RulesPanelProps {
  onClose: () => void;
}

export function RulesPanel({ onClose }: RulesPanelProps) {
  const {
    rules,
    isEditorOpen,
    setRules,
    addRule,
    updateRule,
    removeRule,
    setEditingRule,
    setEditorOpen,
    setLoading,
  } = useRulesStore();

  useEffect(() => {
    setLoading(true);
    getRules()
      .then(({ rules }) => setRules(rules))
      .finally(() => setLoading(false));

    const unsubscribe = subscribeToRules(
      (rule) => addRule(rule),
      (rule) => updateRule(rule),
      (id) => removeRule(id),
      (rule) => updateRule(rule),
      (rules) => setRules(rules)
    );

    return unsubscribe;
  }, []);

  const handleNewRule = () => {
    setEditingRule(null);
    setEditorOpen(true);
  };

  const hasRules = rules.length > 0;

  return (
    <aside
      className="w-80 bg-surface border-l border-edge flex flex-col"
      aria-label="Rules panel"
    >
      <div className="flex items-center justify-between p-3 border-b border-edge">
        <h2 className="font-medium text-ink">Rules</h2>
        <div className="flex items-center gap-2">
          <IconButton
            label="Add rule"
            icon={<Plus className="w-5 h-5" aria-hidden="true" />}
            onClick={handleNewRule}
          />
          <IconButton
            label="Close rules panel"
            icon={<X className="w-5 h-5" aria-hidden="true" />}
            onClick={onClose}
          />
        </div>
      </div>

      {hasRules ? (
        <div className="flex-1 overflow-auto">
          <RulesList rules={rules} />
        </div>
      ) : (
        <EmptyState
          icon={ListFilter}
          title="No rules yet"
          description={
            <div className="space-y-2 text-left">
              <p>
                Rules let you intercept matching requests and apply actions like
                mock, block, redirect, modify headers/body, or throttle.
              </p>
              <ul className="text-xs text-ink-muted list-disc list-inside space-y-0.5">
                <li>Mock — return a custom response</li>
                <li>Block — reject the request</li>
                <li>Map Local / Remote — redirect</li>
                <li>Modify — rewrite headers or body</li>
                <li>Delay / Throttle — slow it down</li>
              </ul>
            </div>
          }
          action={
            <Button variant="primary" onClick={handleNewRule}>
              <Plus className="w-4 h-4" aria-hidden="true" />
              Create your first rule
            </Button>
          }
        />
      )}

      {isEditorOpen && <RuleEditor />}
    </aside>
  );
}
