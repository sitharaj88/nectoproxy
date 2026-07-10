import { useState, useId, type RefObject } from 'react';
import { X, Regex, FileText, ChevronDown, Clock, HardDrive, AlertCircle, SlidersHorizontal } from 'lucide-react';
import { useTrafficStore, useHasActiveFilters, type AdvancedFilter } from '@/stores/trafficStore';
import { BUILT_IN_FILTER_PRESETS } from '@nectoproxy/shared';
import { SearchAutocomplete } from './SearchAutocomplete';
import { Input, IconButton, Tooltip, cn } from './ui';

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

  const minDurationId = useId();
  const maxDurationId = useId();
  const minSizeId = useId();
  const maxSizeId = useId();
  const bodySearchId = useId();

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
    <div className="bg-surface-raised border-b border-edge px-4 py-2">
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
          <Tooltip content={filter.searchRegex ? 'Regex mode (click to disable)' : 'Enable regex mode'}>
            <button
              type="button"
              onClick={() => setFilter({ searchRegex: !filter.searchRegex })}
              aria-pressed={filter.searchRegex}
              aria-label={filter.searchRegex ? 'Disable regex mode' : 'Enable regex mode'}
              className={cn(
                'inline-flex items-center justify-center h-7 w-7 rounded-md transition-colors',
                filter.searchRegex
                  ? 'text-accent bg-accent/15'
                  : 'text-ink-faint hover:text-ink-secondary bg-surface-raised border border-edge'
              )}
            >
              <Regex className="w-4 h-4" aria-hidden="true" />
            </button>
          </Tooltip>
        </div>

        {/* Method filters */}
        <div className="flex items-center gap-1" role="group" aria-label="Filter by HTTP method">
          {HTTP_METHODS.map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => toggleMethod(method)}
              aria-pressed={filter.methods.includes(method)}
              aria-label={`Toggle ${method} filter`}
              className={cn(
                'px-2 py-1 text-xs rounded font-medium border transition-colors',
                filter.methods.includes(method)
                  ? 'bg-accent/15 text-accent border-accent/25'
                  : 'bg-surface-raised text-ink-muted border-edge hover:bg-surface-overlay hover:text-ink'
              )}
            >
              {method}
            </button>
          ))}
        </div>

        {/* Status filters */}
        <div className="flex items-center gap-1" role="group" aria-label="Filter by HTTP status group">
          {STATUS_GROUPS.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => toggleStatus(status)}
              aria-pressed={filter.statuses.includes(status)}
              aria-label={`Toggle ${status} status filter`}
              className={cn(
                'px-2 py-1 text-xs rounded font-medium border transition-colors',
                filter.statuses.includes(status)
                  ? 'bg-accent/15 text-accent border-accent/25'
                  : 'bg-surface-raised text-ink-muted border-edge hover:bg-surface-overlay hover:text-ink'
              )}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Presets dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowPresets(!showPresets)}
            aria-haspopup="menu"
            aria-expanded={showPresets}
            className="flex items-center gap-1 px-2 h-7 text-xs bg-surface-raised border border-edge hover:bg-surface-overlay hover:text-ink text-ink-secondary rounded-md transition-colors"
          >
            Presets
            <ChevronDown className={cn('w-3 h-3 transition-transform', showPresets && 'rotate-180')} />
          </button>

          {showPresets && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowPresets(false)}
              />
              <div
                role="menu"
                className="absolute right-0 mt-1 w-56 bg-surface-overlay border border-edge rounded-md shadow-popover z-20 overflow-hidden"
              >
                {BUILT_IN_FILTER_PRESETS.map((preset, index) => (
                  <button
                    key={index}
                    type="button"
                    role="menuitem"
                    onClick={() => applyPreset(preset)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-surface-raised transition-colors"
                  >
                    <div className="font-medium text-ink">{preset.name}</div>
                    {preset.description && (
                      <div className="text-xs text-ink-muted">{preset.description}</div>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Advanced toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          aria-expanded={showAdvanced}
          aria-controls="filter-advanced-row"
          className={cn(
            'inline-flex items-center gap-1.5 px-2 h-7 text-xs rounded-md border transition-colors',
            showAdvanced
              ? 'bg-accent/15 text-accent border-accent/25'
              : 'bg-surface-raised text-ink-muted border-edge hover:bg-surface-overlay hover:text-ink'
          )}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
          Advanced
          <ChevronDown
            className={cn('w-3 h-3 transition-transform', showAdvanced && 'rotate-180')}
            aria-hidden="true"
          />
        </button>

        {/* Clear filters */}
        {hasActiveFilters && (
          <IconButton
            label="Clear all filters"
            icon={<X className="w-4 h-4" aria-hidden="true" />}
            onClick={resetFilter}
          />
        )}
      </div>

      {/* Advanced filters row */}
      {showAdvanced && (
        <div
          id="filter-advanced-row"
          className="flex items-center gap-4 mt-3 pt-3 border-t border-edge animate-fadeIn"
        >
          {/* Body search */}
          <div className="relative flex-1 max-w-xs">
            <label htmlFor={bodySearchId} className="sr-only">Search in body</label>
            <Input
              id={bodySearchId}
              type="text"
              sizeVariant="md"
              leftIcon={<FileText className="w-4 h-4" aria-hidden="true" />}
              placeholder={filter.bodySearchRegex ? 'Body regex...' : 'Search in body...'}
              value={filter.bodySearch}
              onChange={(e) => setFilter({ bodySearch: e.target.value })}
              className={cn('pr-9', filter.bodySearchRegex && 'border-accent')}
            />
            <Tooltip content={filter.bodySearchRegex ? 'Regex mode (click to disable)' : 'Enable regex mode'}>
              <button
                type="button"
                onClick={() => setFilter({ bodySearchRegex: !filter.bodySearchRegex })}
                aria-pressed={filter.bodySearchRegex}
                aria-label={filter.bodySearchRegex ? 'Disable body regex mode' : 'Enable body regex mode'}
                className={cn(
                  'absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded transition-colors',
                  filter.bodySearchRegex
                    ? 'text-accent bg-accent/15'
                    : 'text-ink-faint hover:text-ink-secondary'
                )}
              >
                <Regex className="w-4 h-4" aria-hidden="true" />
              </button>
            </Tooltip>
          </div>

          {/* Protocol filters */}
          <div className="flex items-center gap-1" role="group" aria-label="Filter by protocol">
            <span className="text-xs text-ink-muted mr-1" aria-hidden="true">Protocol:</span>
            {PROTOCOLS.map((protocol) => (
              <button
                key={protocol}
                type="button"
                onClick={() => toggleProtocol(protocol)}
                aria-pressed={filter.protocols.includes(protocol)}
                aria-label={`Toggle ${protocol.toUpperCase()} protocol filter`}
                className={cn(
                  'px-2 py-1 text-xs rounded font-medium border transition-colors',
                  filter.protocols.includes(protocol)
                    ? 'bg-accent/15 text-accent border-accent/25'
                    : 'bg-surface-raised text-ink-muted border-edge hover:bg-surface-overlay hover:text-ink'
                )}
              >
                {protocol.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Duration filter */}
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-ink-muted" aria-hidden="true" />
            <label htmlFor={minDurationId} className="sr-only">Minimum duration (ms)</label>
            <Input
              id={minDurationId}
              type="number"
              min={0}
              sizeVariant="md"
              placeholder="Min ms"
              title="Minimum duration (ms)"
              value={filter.minDuration ?? ''}
              onChange={(e) => setFilter({ minDuration: e.target.value ? Number(e.target.value) : null })}
              className="w-20"
            />
            <span className="text-ink-muted" aria-hidden="true">–</span>
            <label htmlFor={maxDurationId} className="sr-only">Maximum duration (ms)</label>
            <Input
              id={maxDurationId}
              type="number"
              min={0}
              sizeVariant="md"
              placeholder="Max ms"
              title="Maximum duration (ms)"
              value={filter.maxDuration ?? ''}
              onChange={(e) => setFilter({ maxDuration: e.target.value ? Number(e.target.value) : null })}
              className="w-20"
            />
          </div>

          {/* Size filter */}
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-ink-muted" aria-hidden="true" />
            <label htmlFor={minSizeId} className="sr-only">Minimum size (KB)</label>
            <Input
              id={minSizeId}
              type="number"
              min={0}
              sizeVariant="md"
              placeholder="Min KB"
              title="Minimum response size (KB)"
              value={filter.minSize !== null ? filter.minSize / 1024 : ''}
              onChange={(e) => setFilter({ minSize: e.target.value ? Number(e.target.value) * 1024 : null })}
              className="w-20"
            />
            <span className="text-ink-muted" aria-hidden="true">–</span>
            <label htmlFor={maxSizeId} className="sr-only">Maximum size (KB)</label>
            <Input
              id={maxSizeId}
              type="number"
              min={0}
              sizeVariant="md"
              placeholder="Max KB"
              title="Maximum response size (KB)"
              value={filter.maxSize !== null ? filter.maxSize / 1024 : ''}
              onChange={(e) => setFilter({ maxSize: e.target.value ? Number(e.target.value) * 1024 : null })}
              className="w-20"
            />
          </div>

          {/* Error filter */}
          <button
            type="button"
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
            aria-label={
              filter.hasError === true
                ? 'Currently showing errors only — click for no-errors'
                : filter.hasError === false
                ? 'Currently hiding errors — click to show all'
                : 'Currently showing all — click to filter errors only'
            }
            className={cn(
              'flex items-center gap-1 px-2 py-1 text-xs rounded font-medium border transition-colors',
              filter.hasError === true
                ? 'bg-danger/15 text-danger border-danger/25'
                : filter.hasError === false
                ? 'bg-success/15 text-success border-success/25'
                : 'bg-surface-raised text-ink-muted border-edge hover:bg-surface-overlay hover:text-ink'
            )}
            title={
              filter.hasError === true
                ? 'Showing errors only'
                : filter.hasError === false
                ? 'Hiding errors'
                : 'Show all'
            }
          >
            <AlertCircle className="w-3 h-3" aria-hidden="true" />
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
