import { Edit2, Trash2 } from 'lucide-react';
import type { Rule, RuleAction } from '@nectoproxy/shared';
import { useRulesStore } from '@/stores/rulesStore';
import { toggleRule, deleteRule } from '@/services/api';

interface RulesListProps {
  rules: Rule[];
}

const ACTION_COLORS: Record<RuleAction, string> = {
  mock: 'bg-purple-500',
  'map-local': 'bg-blue-500',
  'map-remote': 'bg-cyan-500',
  'modify-request': 'bg-yellow-500',
  'modify-response': 'bg-orange-500',
  delay: 'bg-amber-500',
  throttle: 'bg-red-400',
  block: 'bg-red-600',
};

const ACTION_LABELS: Record<RuleAction, string> = {
  mock: 'Mock',
  'map-local': 'Local',
  'map-remote': 'Remote',
  'modify-request': 'Mod Req',
  'modify-response': 'Mod Res',
  delay: 'Delay',
  throttle: 'Throttle',
  block: 'Block',
};

export function RulesList({ rules }: RulesListProps) {
  const { setEditingRule, setEditorOpen, updateRule, removeRule } = useRulesStore();

  const handleToggle = async (rule: Rule) => {
    try {
      const updated = await toggleRule(rule.id);
      updateRule(updated);
    } catch (error) {
      console.error('Failed to toggle rule:', error);
    }
  };

  const handleEdit = (rule: Rule) => {
    setEditingRule(rule);
    setEditorOpen(true);
  };

  const handleDelete = async (rule: Rule) => {
    if (!confirm(`Delete rule "${rule.name}"?`)) return;

    try {
      await deleteRule(rule.id);
      removeRule(rule.id);
    } catch (error) {
      console.error('Failed to delete rule:', error);
    }
  };

  const formatMatcher = (rule: Rule): string => {
    const parts: string[] = [];
    if (rule.match.method) {
      const methods = Array.isArray(rule.match.method)
        ? rule.match.method.join('|')
        : rule.match.method;
      parts.push(methods);
    }
    if (rule.match.url) parts.push(String(rule.match.url));
    else if (rule.match.host) parts.push(rule.match.host);
    else if (rule.match.path) parts.push(String(rule.match.path));

    return parts.join(' ') || 'All requests';
  };

  return (
    <div className="divide-y divide-gray-700">
      {rules.map((rule) => (
        <div
          key={rule.id}
          className={`p-3 hover:bg-gray-700/50 ${!rule.enabled ? 'opacity-50' : ''}`}
        >
          <div className="flex items-center gap-2">
            {/* Toggle Switch */}
            <button
              onClick={() => handleToggle(rule)}
              className={`relative w-8 h-4 rounded-full transition-colors ${
                rule.enabled ? 'bg-green-500' : 'bg-gray-600'
              }`}
            >
              <span
                className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${
                  rule.enabled ? 'left-4' : 'left-0.5'
                }`}
              />
            </button>

            {/* Action Badge */}
            <span
              className={`px-1.5 py-0.5 text-xs rounded ${ACTION_COLORS[rule.action]} text-white`}
            >
              {ACTION_LABELS[rule.action]}
            </span>

            {/* Rule Name & Pattern */}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{rule.name}</div>
              <div className="text-xs text-gray-400 truncate" title={formatMatcher(rule)}>
                {formatMatcher(rule)}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleEdit(rule)}
                className="p-1 hover:bg-gray-600 rounded"
                title="Edit"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(rule)}
                className="p-1 hover:bg-gray-600 rounded text-red-400"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
