import { useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { useRulesStore } from '@/stores/rulesStore';
import { getRules } from '@/services/api';
import { subscribeToRules } from '@/services/socket';
import { RulesList } from './RulesList';
import { RuleEditor } from './RuleEditor';

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
    // Load initial rules
    setLoading(true);
    getRules()
      .then(({ rules }) => setRules(rules))
      .finally(() => setLoading(false));

    // Subscribe to rule events
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

  return (
    <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <h2 className="font-medium">Rules</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleNewRule}
            className="p-1 hover:bg-gray-700 rounded"
            title="Add Rule"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Rules List */}
      <div className="flex-1 overflow-auto">
        <RulesList rules={rules} />
      </div>

      {/* Empty State */}
      {rules.length === 0 && (
        <div className="flex-1 flex items-center justify-center p-4 text-gray-500 text-center">
          <div>
            <p>No rules configured</p>
            <button
              onClick={handleNewRule}
              className="mt-2 text-blue-400 hover:text-blue-300"
            >
              Create your first rule
            </button>
          </div>
        </div>
      )}

      {/* Rule Editor Modal */}
      {isEditorOpen && <RuleEditor />}
    </div>
  );
}
