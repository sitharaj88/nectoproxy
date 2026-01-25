import { useState, type RefObject } from 'react';
import { X, Regex, FileText, ChevronDown, Clock, HardDrive, AlertCircle } from 'lucide-react';
import { useTrafficStore, useHasActiveFilters, type AdvancedFilter } from '@/stores/trafficStore';
import { BUILT_IN_FILTER_PRESETS } from '@proxyscope/shared';
import { SearchAutocomplete } from './SearchAutocomplete';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];
const STATUS_GROUPS = ['2xx', '3xx', '4xx', '5xx'];
const PROTOCOLS: Array<'http' | 'https' | 'ws' | 'wss'> = ['http', 'https', 'ws', 'wss'];

interface FilterBarProps {
  searchInputRef?: RefObject<HTMLInputElement>;
}

export function FilterBar({ searchInputRef }: FilterBarProps) {
  const filter = useTrafficStore((state) => state.filter);
  const setFilter = useTrafficStore((state) => state.setFilter);
  const resetFilter = useTrafficStore((state) => state.resetFilter);
  const hasActiveFilters = useHasActiveFilters();

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPresets, setShowPresets] = useState(false);

  const toggleMethod = (method: string) => {
    const methods = filter.methods.includes(method)
      ? filter.methods.filter((m) => m !== method)
      : [...filter.methods, method];
    setFilter({ methods });
  };

  const toggleStatus = (status: string) => {
    const statuses = filter.statuses.includes(status)
      ? filter.statuses.filter((s) => s !== status)
      : [...filter.statuses, status];
    setFilter({ statuses });
  };

  const toggleProtocol = (protocol: 'http' | 'https' | 'ws' | 'wss') => {
    const protocols = filter.protocols.includes(protocol)
      ? filter.protocols.filter((p) => p !== protocol)
      : [...filter.protocols, protocol];
    setFilter({ protocols });
  };

  const applyPreset = (preset: typeof BUILT_IN_FILTER_PRESETS[0]) => {
    // Reset current filters and apply preset
    resetFilter();

    const newFilter: Partial<AdvancedFilter> = {};

    if (preset.filter.contentTypes) {
      // Content types aren't directly supported in AdvancedFilter,
      // but we can use body search for now
      newFilter.bodySearch = preset.filter.contentTypes.join('|');
      newFilter.bodySearchRegex = true;
    }

    if (preset.filter.statusCodes) {
      // Convert status codes to status groups
      const groups = new Set<string>();
      for (const code of preset.filter.statusCodes) {
        groups.add(`${Math.floor(code / 100)}xx`);
      }
      newFilter.statuses = Array.from(groups);
    }

    if (preset.filter.minDuration) {
      newFilter.minDuration = preset.filter.minDuration;
    }

    if (preset.filter.protocols) {
      newFilter.protocols = preset.filter.protocols;
    }

    if (preset.filter.hasError !== undefined) {
      newFilter.hasError = preset.filter.hasError;
    }

    setFilter(newFilter);
    setShowPresets(false);
  };

  return (
    <div className="bg-gray-800 border-b border-gray-700 px-4 py-2">
      {/* Main filter row */}
      <div className="flex items-center gap-4">
        {/* Search with autocomplete */}
        <div className="flex-1 max-w-md flex items-center gap-2">
          <SearchAutocomplete
            ref={searchInputRef}
            value={filter.search}
            onChange={(value) => setFilter({ search: value })}
            onSearch={(value) => setFilter({ search: value })}
            placeholder={filter.searchRegex ? "Regex pattern..." : "Filter by URL or host..."}
            className="flex-1"
          />
          <button
            onClick={() => setFilter({ searchRegex: !filter.searchRegex })}
            className={`p-1.5 rounded transition-colors ${
              filter.searchRegex
                ? 'text-primary-400 bg-primary-500/20'
                : 'text-gray-500 hover:text-gray-400 bg-gray-700'
            }`}
            title={filter.searchRegex ? "Regex mode (click to disable)" : "Enable regex mode"}
          >
            <Regex className="w-4 h-4" />
          </button>
        </div>

        {/* Method filters */}
        <div className="flex items-center gap-1">
          {HTTP_METHODS.map((method) => (
            <button
              key={method}
              onClick={() => toggleMethod(method)}
              className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                filter.methods.includes(method)
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              {method}
            </button>
          ))}
        </div>

        {/* Status filters */}
        <div className="flex items-center gap-1">
          {STATUS_GROUPS.map((status) => {
            const colorClass = {
              '2xx': filter.statuses.includes(status) ? 'bg-green-600' : 'bg-gray-700 hover:bg-gray-600',
              '3xx': filter.statuses.includes(status) ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600',
              '4xx': filter.statuses.includes(status) ? 'bg-yellow-600' : 'bg-gray-700 hover:bg-gray-600',
              '5xx': filter.statuses.includes(status) ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600',
            }[status];

            return (
              <button
                key={status}
                onClick={() => toggleStatus(status)}
                className={`px-2 py-1 text-xs rounded font-medium transition-colors ${colorClass} ${
                  filter.statuses.includes(status) ? 'text-white' : 'text-gray-400'
                }`}
              >
                {status}
              </button>
            );
          })}
        </div>

        {/* Presets dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowPresets(!showPresets)}
            className="flex items-center gap-1 px-2 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md transition-colors"
          >
            Presets
            <ChevronDown className="w-3 h-3" />
          </button>

          {showPresets && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowPresets(false)}
              />
              <div className="absolute right-0 mt-1 w-56 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-20">
                {BUILT_IN_FILTER_PRESETS.map((preset, index) => (
                  <button
                    key={index}
                    onClick={() => applyPreset(preset)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700 transition-colors first:rounded-t-md last:rounded-b-md"
                  >
                    <div className="font-medium text-gray-200">{preset.name}</div>
                    {preset.description && (
                      <div className="text-xs text-gray-500">{preset.description}</div>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Advanced toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`px-2 py-1.5 text-xs rounded-md transition-colors ${
            showAdvanced
              ? 'bg-primary-600 text-white'
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          }`}
        >
          Advanced
        </button>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            onClick={resetFilter}
            className="p-1.5 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-400 transition-colors"
            title="Clear all filters"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Advanced filters row */}
      {showAdvanced && (
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-700">
          {/* Body search */}
          <div className="relative flex-1 max-w-xs">
            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={filter.bodySearchRegex ? "Body regex..." : "Search in body..."}
              value={filter.bodySearch}
              onChange={(e) => setFilter({ bodySearch: e.target.value })}
              className={`w-full pl-9 pr-16 py-1.5 bg-gray-900 border rounded-md text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500 ${
                filter.bodySearchRegex ? 'border-primary-500' : 'border-gray-700'
              }`}
            />
            <button
              onClick={() => setFilter({ bodySearchRegex: !filter.bodySearchRegex })}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded transition-colors ${
                filter.bodySearchRegex
                  ? 'text-primary-400 bg-primary-500/20'
                  : 'text-gray-500 hover:text-gray-400'
              }`}
              title={filter.bodySearchRegex ? "Regex mode (click to disable)" : "Enable regex mode"}
            >
              <Regex className="w-4 h-4" />
            </button>
          </div>

          {/* Protocol filters */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500 mr-1">Protocol:</span>
            {PROTOCOLS.map((protocol) => (
              <button
                key={protocol}
                onClick={() => toggleProtocol(protocol)}
                className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                  filter.protocols.includes(protocol)
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
              >
                {protocol.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Duration filter */}
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <input
              type="number"
              placeholder="Min ms"
              value={filter.minDuration ?? ''}
              onChange={(e) => setFilter({ minDuration: e.target.value ? Number(e.target.value) : null })}
              className="w-20 px-2 py-1 bg-gray-900 border border-gray-700 rounded-md text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500"
            />
            <span className="text-gray-500">-</span>
            <input
              type="number"
              placeholder="Max ms"
              value={filter.maxDuration ?? ''}
              onChange={(e) => setFilter({ maxDuration: e.target.value ? Number(e.target.value) : null })}
              className="w-20 px-2 py-1 bg-gray-900 border border-gray-700 rounded-md text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500"
            />
          </div>

          {/* Size filter */}
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-gray-500" />
            <input
              type="number"
              placeholder="Min KB"
              value={filter.minSize !== null ? filter.minSize / 1024 : ''}
              onChange={(e) => setFilter({ minSize: e.target.value ? Number(e.target.value) * 1024 : null })}
              className="w-20 px-2 py-1 bg-gray-900 border border-gray-700 rounded-md text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500"
            />
            <span className="text-gray-500">-</span>
            <input
              type="number"
              placeholder="Max KB"
              value={filter.maxSize !== null ? filter.maxSize / 1024 : ''}
              onChange={(e) => setFilter({ maxSize: e.target.value ? Number(e.target.value) * 1024 : null })}
              className="w-20 px-2 py-1 bg-gray-900 border border-gray-700 rounded-md text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500"
            />
          </div>

          {/* Error filter */}
          <button
            onClick={() =>
              setFilter({
                hasError:
                  filter.hasError === null
                    ? true
                    : filter.hasError === true
                    ? false
                    : null,
              })
            }
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded font-medium transition-colors ${
              filter.hasError === true
                ? 'bg-red-600 text-white'
                : filter.hasError === false
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
            title={
              filter.hasError === true
                ? 'Showing errors only'
                : filter.hasError === false
                ? 'Hiding errors'
                : 'Show all'
            }
          >
            <AlertCircle className="w-3 h-3" />
            {filter.hasError === true
              ? 'Errors'
              : filter.hasError === false
              ? 'No Errors'
              : 'All'}
          </button>
        </div>
      )}
    </div>
  );
}
