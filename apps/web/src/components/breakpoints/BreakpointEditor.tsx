import { useState } from 'react';
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
      <div className="bg-gray-800 rounded-lg shadow-xl w-[560px] max-h-[80vh] overflow-auto">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white">
              {breakpoint ? 'Edit Breakpoint' : 'New Breakpoint'}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter breakpoint name"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
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
                      className="text-blue-600 focus:ring-blue-500 bg-gray-700 border-gray-600"
                    />
                    <span className="text-sm text-gray-300 capitalize">{t}</span>
                  </label>
                ))}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {type === 'request' && 'Pause before sending the request to the server'}
                {type === 'response' && 'Pause after receiving the response from the server'}
                {type === 'both' && 'Pause on both request and response'}
              </p>
            </div>

            {/* Matcher settings */}
            <div className="border-t border-gray-700 pt-4">
              <h4 className="text-sm font-medium text-gray-300 mb-3">Match Criteria</h4>
              <p className="text-xs text-gray-500 mb-3">
                Leave fields empty to match all. Supports wildcards (*) and regex patterns.
              </p>

              <div className="space-y-3">
                {/* URL Pattern */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    URL Pattern
                  </label>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="*api/users*"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>

                {/* Method */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    HTTP Method
                  </label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">Any method</option>
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="PATCH">PATCH</option>
                    <option value="DELETE">DELETE</option>
                    <option value="OPTIONS">OPTIONS</option>
                    <option value="HEAD">HEAD</option>
                  </select>
                </div>

                {/* Host Pattern */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Host Pattern
                  </label>
                  <input
                    type="text"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="*.example.com"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>

                {/* Path Pattern */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Path Pattern
                  </label>
                  <input
                    type="text"
                    value={path}
                    onChange={(e) => setPath(e.target.value)}
                    placeholder="/api/*"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Conditions */}
            <div className="border-t border-gray-700 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-300">
                  Conditions
                  {conditions.length > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 text-xs bg-blue-900/50 text-blue-400 rounded">
                      {conditions.length}
                    </span>
                  )}
                </h4>
                <button
                  type="button"
                  onClick={addCondition}
                  className="px-2 py-1 text-xs font-medium text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 rounded"
                >
                  + Add Condition
                </button>
              </div>

              {conditions.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">
                    Breakpoint will only trigger when conditions are met.
                  </p>

                  {/* AND/OR toggle */}
                  {conditions.length > 1 && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-400">Combine with:</span>
                      <div className="flex rounded-md overflow-hidden border border-gray-600">
                        <button
                          type="button"
                          onClick={() => setConditionLogic('and')}
                          className={`px-3 py-1 text-xs font-medium ${
                            conditionLogic === 'and'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-700 text-gray-400 hover:text-white'
                          }`}
                        >
                          AND
                        </button>
                        <button
                          type="button"
                          onClick={() => setConditionLogic('or')}
                          className={`px-3 py-1 text-xs font-medium ${
                            conditionLogic === 'or'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-700 text-gray-400 hover:text-white'
                          }`}
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
                      className="p-3 bg-gray-750 border border-gray-600 rounded-md space-y-2"
                    >
                      {/* Separator label between conditions */}
                      {index > 0 && (
                        <div className="text-xs text-gray-500 uppercase font-semibold -mt-1 mb-1">
                          {conditionLogic === 'and' ? 'AND' : 'OR'}
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        {/* Field select */}
                        <select
                          value={condition.field}
                          onChange={(e) =>
                            updateCondition(index, {
                              field: e.target.value as BreakpointConditionField,
                            })
                          }
                          className="px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {CONDITION_FIELDS.map((f) => (
                            <option key={f.value} value={f.value}>
                              {f.label}
                            </option>
                          ))}
                        </select>

                        {/* Operator select */}
                        <select
                          value={condition.operator}
                          onChange={(e) =>
                            updateCondition(index, {
                              operator: e.target.value as BreakpointConditionOperator,
                            })
                          }
                          className="px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {getOperatorsForField(condition.field).map((op) => (
                            <option key={op.value} value={op.value}>
                              {op.label}
                            </option>
                          ))}
                        </select>

                        {/* Value input */}
                        <input
                          type={isNumericField(condition.field) ? 'number' : 'text'}
                          value={condition.value}
                          onChange={(e) =>
                            updateCondition(index, { value: e.target.value })
                          }
                          placeholder={getPlaceholder(condition.field)}
                          className="flex-1 px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-xs placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />

                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={() => removeCondition(index)}
                          className="p-1 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded"
                          title="Remove condition"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      {/* Header name input (only for header field) */}
                      {condition.field === 'header' && (
                        <div>
                          <input
                            type="text"
                            value={condition.headerName || ''}
                            onChange={(e) =>
                              updateCondition(index, { headerName: e.target.value })
                            }
                            placeholder="Header name (e.g. Content-Type)"
                            className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-xs placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              <button
                type="button"
                onClick={() => setEnabled(!enabled)}
                className={`w-10 h-6 rounded-full transition-colors ${
                  enabled ? 'bg-blue-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`block w-4 h-4 bg-white rounded-full transform transition-transform ${
                    enabled ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="text-sm text-gray-300">
                {enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
            >
              {breakpoint ? 'Save Changes' : 'Create Breakpoint'}
            </button>
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
