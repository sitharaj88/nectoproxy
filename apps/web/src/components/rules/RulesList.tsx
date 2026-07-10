import { Edit2, Trash2 } from 'lucide-react';
import type { Rule, RuleAction } from '@nectoproxy/shared';
import { useRulesStore } from '@/stores/rulesStore';
import { toggleRule, deleteRule } from '@/services/api';
import { Badge, IconButton, Switch, cn, type BadgeProps } from '@/components/ui';

interface RulesListProps {
  rules: Rule[];
}

const ACTION_TONES: Record<RuleAction, BadgeProps['tone']> = {
  mock: 'accent',
  'map-local': 'info',
  'map-remote': 'info',
  'modify-request': 'warn',
  'modify-response': 'warn',
  delay: 'warn',
  throttle: 'danger',
  block: 'danger',
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
    <div className="divide-y divide-edge">
      {rules.map((rule) => (
        <div
          key={rule.id}
          className={cn('p-3 hover:bg-surface-raised/50', !rule.enabled && 'opacity-50')}
        >
          <div className="flex items-center gap-2">
            {/* Toggle Switch */}
            <Switch
              checked={rule.enabled}
              onCheckedChange={() => handleToggle(rule)}
              aria-label={rule.enabled ? 'Disable rule' : 'Enable rule'}
            />

            {/* Action Badge */}
            <Badge tone={ACTION_TONES[rule.action]}>{ACTION_LABELS[rule.action]}</Badge>

            {/* Rule Name & Pattern */}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate text-ink">{rule.name}</div>
              <div className="text-xs text-ink-muted truncate" title={formatMatcher(rule)}>
                {formatMatcher(rule)}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <IconButton
                label="Edit"
                icon={<Edit2 className="w-4 h-4" />}
                onClick={() => handleEdit(rule)}
              />
              <IconButton
                label="Delete"
                icon={<Trash2 className="w-4 h-4" />}
                onClick={() => handleDelete(rule)}
                className="!text-danger hover:!text-danger"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
