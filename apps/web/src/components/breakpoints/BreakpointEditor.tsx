import { useState } from 'react';
import { X } from 'lucide-react';
import { Button, Input, Select, Switch, IconButton, Badge, cn } from '@/components/ui';
import type {
  Breakpoint,
  BreakpointCondition,
  BreakpointConditionField,
  BreakpointConditionLogic,
  BreakpointConditionOperator,
  BreakpointCreateInput,
  BreakpointType,
} from '@nectoproxy/shared';

const CONDITION_FIELDS: { value: BreakpointConditionField; label: string }[] = [
  { value: 'status', label: 'Status' },
  { value: 'url', label: 'URL' },
  { value: 'method', label: 'Method' },
  { value: 'header', label: 'Header' },
  { value: 'requestBody', label: 'Request Body' },
  { value: 'responseBody', label: 'Response Body' },
  { value: 'duration', label: 'Duration (ms)' },
  { value: 'host', label: 'Host' },
];

const TEXT_OPERATORS: { value: BreakpointConditionOperator; label: string }[] = [
  { value: 'equals', label: 'Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'startsWith', label: 'Starts with' },
  { value: 'endsWith', label: 'Ends with' },
  { value: 'matches', label: 'Matches (regex)' },
];

const NUMERIC_OPERATORS: { value: BreakpointConditionOperator; label: string }[] = [
  { value: 'equals', label: 'Equals' },
  { value: 'greaterThan', label: 'Greater than' },
  { value: 'lessThan', label: 'Less than' },
];

function isNumericField(field: BreakpointConditionField): boolean {
  return field === 'status' || field === 'duration';
}

function getOperatorsForField(field: BreakpointConditionField) {
  return isNumericField(field) ? NUMERIC_OPERATORS : TEXT_OPERATORS;
}

interface BreakpointEditorProps {
  breakpoint: Breakpoint | null;
  onSave: (input: BreakpointCreateInput) => void;
  onClose: () => void;
}

export function BreakpointEditor({ breakpoint, onSave, onClose }: BreakpointEditorProps) {
  const [name, setName] = useState(breakpoint?.name || '');
  const [type, setType] = useState<BreakpointType>(breakpoint?.type || 'request');
  const [url, setUrl] = useState(getUrlString(breakpoint?.match.url) || '');
  const [method, setMethod] = useState(getMethodString(breakpoint?.match.method) || '');
  const [host, setHost] = useState(breakpoint?.match.host || '');
  const [path, setPath] = useState(getPathString(breakpoint?.match.path) || '');
  const [enabled, setEnabled] = useState(breakpoint?.enabled ?? true);
  const [conditions, setConditions] = useState<BreakpointCondition[]>(
    breakpoint?.conditions || []
  );
  const [conditionLogic, setConditionLogic] = useState<BreakpointConditionLogic>(
    breakpoint?.conditionLogic || 'and'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const input: BreakpointCreateInput = {
      name: name || 'Unnamed Breakpoint',
      type,
      enabled,
      match: {
        ...(url && { url }),
        ...(method && { method }),
        ...(host && { host }),
        ...(path && { path }),
      },
      ...(conditions.length > 0 && { conditions, conditionLogic }),
    };

    onSave(input);
  };

  function getUrlString(value: string | RegExp | undefined): string {
    if (!value) return '';
    return typeof value === 'string' ? value : value.source;
  }

  function getMethodString(value: string | string[] | undefined): string {
    if (!value) return '';
    return Array.isArray(value) ? value[0] : value;
  }

  function getPathString(value: string | RegExp | undefined): string {
    if (!value) return '';
    return typeof value === 'string' ? value : value.source;
  }

  const addCondition = () => {
    setConditions([
      ...conditions,
      { field: 'url', operator: 'contains', value: '' },
    ]);
  };

  const updateCondition = (index: number, updates: Partial<BreakpointCondition>) => {
    setConditions(conditions.map((c, i) => {
      if (i !== index) return c;

      const updated = { ...c, ...updates };

      // If field changed, reset operator to a valid one for the new field
      if (updates.field !== undefined && updates.field !== c.field) {
        const validOperators = getOperatorsForField(updates.field);
        const isCurrentOperatorValid = validOperators.some((op) => op.value === updated.operator);
        if (!isCurrentOperatorValid) {
          updated.operator = validOperators[0].value;
        }
        // Clear headerName if field is no longer 'header'
        if (updates.field !== 'header') {
          delete updated.headerName;
        }
      }

      return updated;
    }));
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50">
      <div className="bg-surface-overlay border border-edge rounded-lg shadow-popover w-[560px] max-h-[80vh] overflow-auto">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-edge">
            <h3 className="text-lg font-semibold text-ink">
              {breakpoint ? 'Edit Breakpoint' : 'New Breakpoint'}
            </h3>
            <IconButton label="Close" icon={<X className="w-5 h-5" />} onClick={onClose} />
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-ink mb-1">
                Name
              </label>
              <Input
                type="text"
                sizeVariant="md"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter breakpoint name"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-ink mb-1">
                Type
              </label>
              <div className="flex gap-4">
                {(['request', 'response', 'both'] as BreakpointType[]).map((t) => (
                  <label key={t} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      value={t}
                      checked={type === t}
                      onChange={(e) => setType(e.target.value as BreakpointType)}
                      className="accent-accent bg-surface-raised border-edge"
                    />
                    <span className="text-sm text-ink-secondary capitalize">{t}</span>
                  </label>
                ))}
              </div>
              <p className="mt-1 text-xs text-ink-muted">
                {type === 'request' && 'Pause before sending the request to the server'}
                {type === 'response' && 'Pause after receiving the response from the server'}
                {type === 'both' && 'Pause on both request and response'}
              </p>
            </div>

            {/* Matcher settings */}
            <div className="border-t border-edge pt-4">
              <h4 className="text-xs font-medium uppercase tracking-wide text-ink-muted mb-3">Match Criteria</h4>
              <p className="text-xs text-ink-muted mb-3">
                Leave fields empty to match all. Supports wildcards (*) and regex patterns.
              </p>

              <div className="space-y-3">
                {/* URL Pattern */}
                <div>
                  <label className="block text-sm text-ink-secondary mb-1">
                    URL Pattern
                  </label>
                  <Input
                    type="text"
                    sizeVariant="md"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="*api/users*"
                  />
                </div>

                {/* Method */}
                <div>
                  <label className="block text-sm text-ink-secondary mb-1">
                    HTTP Method
                  </label>
                  <Select
                    sizeVariant="md"
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="w-full"
                  >
                    <option value="">Any method</option>
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="PATCH">PATCH</option>
                    <option value="DELETE">DELETE</option>
                    <option value="OPTIONS">OPTIONS</option>
                    <option value="HEAD">HEAD</option>
                  </Select>
                </div>

                {/* Host Pattern */}
                <div>
                  <label className="block text-sm text-ink-secondary mb-1">
                    Host Pattern
                  </label>
                  <Input
                    type="text"
                    sizeVariant="md"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="*.example.com"
                  />
                </div>

                {/* Path Pattern */}
                <div>
                  <label className="block text-sm text-ink-secondary mb-1">
                    Path Pattern
                  </label>
                  <Input
                    type="text"
                    sizeVariant="md"
                    value={path}
                    onChange={(e) => setPath(e.target.value)}
                    placeholder="/api/*"
                  />
                </div>
              </div>
            </div>

            {/* Conditions */}
            <div className="border-t border-edge pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-medium uppercase tracking-wide text-ink-muted flex items-center">
                  Conditions
                  {conditions.length > 0 && (
                    <Badge tone="accent" className="ml-2 normal-case">
                      {conditions.length}
                    </Badge>
                  )}
                </h4>
                <Button variant="ghost" size="xs" onClick={addCondition} className="!text-accent hover:!bg-accent/12">
                  + Add Condition
                </Button>
              </div>

              {conditions.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs text-ink-muted">
                    Breakpoint will only trigger when conditions are met.
                  </p>

                  {/* AND/OR toggle */}
                  {conditions.length > 1 && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-ink-secondary">Combine with:</span>
                      <div className="flex rounded-md overflow-hidden border border-edge">
                        <button
                          type="button"
                          onClick={() => setConditionLogic('and')}
                          className={cn(
                            'px-3 py-1 text-xs font-medium transition-colors',
                            conditionLogic === 'and'
                              ? 'bg-accent text-accent-fg'
                              : 'bg-surface-raised text-ink-secondary hover:text-ink'
                          )}
                        >
                          AND
                        </button>
                        <button
                          type="button"
                          onClick={() => setConditionLogic('or')}
                          className={cn(
                            'px-3 py-1 text-xs font-medium transition-colors',
                            conditionLogic === 'or'
                              ? 'bg-accent text-accent-fg'
                              : 'bg-surface-raised text-ink-secondary hover:text-ink'
                          )}
                        >
                          OR
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Condition rows */}
                  {conditions.map((condition, index) => (
                    <div
                      key={index}
                      className="p-3 bg-surface-raised border border-edge rounded-md space-y-2"
                    >
                      {/* Separator label between conditions */}
                      {index > 0 && (
                        <div className="text-xs text-ink-muted uppercase font-semibold -mt-1 mb-1">
                          {conditionLogic === 'and' ? 'AND' : 'OR'}
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        {/* Field select */}
                        <Select
                          value={condition.field}
                          onChange={(e) =>
                            updateCondition(index, {
                              field: e.target.value as BreakpointConditionField,
                            })
                          }
                        >
                          {CONDITION_FIELDS.map((f) => (
                            <option key={f.value} value={f.value}>
                              {f.label}
                            </option>
                          ))}
                        </Select>

                        {/* Operator select */}
                        <Select
                          value={condition.operator}
                          onChange={(e) =>
                            updateCondition(index, {
                              operator: e.target.value as BreakpointConditionOperator,
                            })
                          }
                        >
                          {getOperatorsForField(condition.field).map((op) => (
                            <option key={op.value} value={op.value}>
                              {op.label}
                            </option>
                          ))}
                        </Select>

                        {/* Value input */}
                        <Input
                          type={isNumericField(condition.field) ? 'number' : 'text'}
                          value={condition.value}
                          onChange={(e) =>
                            updateCondition(index, { value: e.target.value })
                          }
                          placeholder={getPlaceholder(condition.field)}
                          className="flex-1"
                        />

                        {/* Remove button */}
                        <IconButton
                          label="Remove condition"
                          variant="danger"
                          icon={<X className="w-4 h-4" />}
                          onClick={() => removeCondition(index)}
                        />
                      </div>

                      {/* Header name input (only for header field) */}
                      {condition.field === 'header' && (
                        <div>
                          <Input
                            type="text"
                            value={condition.headerName || ''}
                            onChange={(e) =>
                              updateCondition(index, { headerName: e.target.value })
                            }
                            placeholder="Header name (e.g. Content-Type)"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Enabled toggle */}
            <div className="flex items-center gap-3 pt-2">
              <Switch
                checked={enabled}
                aria-label={enabled ? 'Enabled' : 'Disabled'}
                onCheckedChange={setEnabled}
              />
              <span className="text-sm text-ink-secondary">
                {enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-4 border-t border-edge">
            <Button variant="ghost" size="md" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md">
              {breakpoint ? 'Save Changes' : 'Create Breakpoint'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function getPlaceholder(field: BreakpointConditionField): string {
  switch (field) {
    case 'status':
      return 'e.g. 404';
    case 'url':
      return 'e.g. /api/users';
    case 'method':
      return 'e.g. POST';
    case 'header':
      return 'Header value';
    case 'requestBody':
      return 'e.g. "error"';
    case 'responseBody':
      return 'e.g. "success"';
    case 'duration':
      return 'e.g. 1000';
    case 'host':
      return 'e.g. api.example.com';
    default:
      return 'Value';
  }
}
