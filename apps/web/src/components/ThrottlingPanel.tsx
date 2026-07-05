import { useState, useEffect, useCallback, useMemo } from 'react';
import { Modal } from './ui/Modal';
import {
  X,
  Plus,
  Trash2,
  Gauge,
  Clock,
  Zap,
  Activity,
  Signal,
  SignalLow,
  SignalMedium,
  Wifi,
  ChevronDown,
} from 'lucide-react';
import { useRulesStore } from '@/stores/rulesStore';
import {
  getRules,
  createRule,
  toggleRule,
  deleteRule,
} from '@/services/api';
import { subscribeToRules } from '@/services/socket';
import type { Rule, ThrottleConfig, DelayConfig } from '@nectoproxy/shared';

interface ThrottlingPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ThrottlePreset {
  name: string;
  bytesPerSecond: number;
  latency: number;
  description: string;
  icon: 'gprs' | 'edge' | '3g' | '4g' | 'slow-wifi' | 'fast-wifi' | 'custom';
}

const THROTTLE_PRESETS: ThrottlePreset[] = [
  { name: 'GPRS', bytesPerSecond: 6250, latency: 500, description: '50 kbps', icon: 'gprs' },
  { name: 'Edge', bytesPerSecond: 30000, latency: 300, description: '240 kbps', icon: 'edge' },
  { name: '3G', bytesPerSecond: 93750, latency: 200, description: '750 kbps', icon: '3g' },
  { name: '4G', bytesPerSecond: 500000, latency: 50, description: '4 Mbps', icon: '4g' },
  { name: 'Slow WiFi', bytesPerSecond: 125000, latency: 80, description: '1 Mbps', icon: 'slow-wifi' },
  { name: 'Fast WiFi', bytesPerSecond: 3750000, latency: 10, description: '30 Mbps', icon: 'fast-wifi' },
  { name: 'Custom', bytesPerSecond: 0, latency: 0, description: 'Set your own values', icon: 'custom' },
];

function getPresetIcon(icon: ThrottlePreset['icon']) {
  switch (icon) {
    case 'gprs':
      return <SignalLow className="w-4 h-4 text-red-400" />;
    case 'edge':
      return <SignalLow className="w-4 h-4 text-orange-400" />;
    case '3g':
      return <SignalMedium className="w-4 h-4 text-yellow-400" />;
    case '4g':
      return <Signal className="w-4 h-4 text-green-400" />;
    case 'slow-wifi':
      return <Wifi className="w-4 h-4 text-yellow-400" />;
    case 'fast-wifi':
      return <Wifi className="w-4 h-4 text-green-400" />;
    case 'custom':
      return <Zap className="w-4 h-4 text-purple-400" />;
  }
}

function formatBandwidth(bytesPerSecond: number): string {
  if (bytesPerSecond === 0) return '0 B/s';
  if (bytesPerSecond >= 1000000) return `${(bytesPerSecond / 1000000).toFixed(1)} MB/s`;
  if (bytesPerSecond >= 1000) return `${(bytesPerSecond / 1000).toFixed(0)} KB/s`;
  return `${bytesPerSecond} B/s`;
}

function formatBandwidthBits(bytesPerSecond: number): string {
  if (bytesPerSecond === 0) return '0 bps';
  const bps = bytesPerSecond * 8;
  if (bps >= 1000000) return `${(bps / 1000000).toFixed(1)} Mbps`;
  if (bps >= 1000) return `${(bps / 1000).toFixed(0)} kbps`;
  return `${bps} bps`;
}

function getBandwidthPercent(bytesPerSecond: number): number {
  // Logarithmic scale: 6250 (GPRS) to 3750000 (Fast WiFi)
  if (bytesPerSecond <= 0) return 0;
  const minLog = Math.log10(6250);
  const maxLog = Math.log10(50000000); // 50 MB/s cap
  const currentLog = Math.log10(Math.min(bytesPerSecond, 50000000));
  return Math.max(0, Math.min(100, ((currentLog - minLog) / (maxLog - minLog)) * 100));
}

function getBandwidthColor(bytesPerSecond: number): string {
  if (bytesPerSecond <= 30000) return 'bg-red-500';
  if (bytesPerSecond <= 125000) return 'bg-orange-500';
  if (bytesPerSecond <= 500000) return 'bg-yellow-500';
  return 'bg-green-500';
}

function isThrottleRule(rule: Rule): boolean {
  return rule.action === 'throttle' || rule.action === 'delay';
}

function getUrlPattern(rule: Rule): string {
  if (rule.match.url) return String(rule.match.url);
  if (rule.match.host) return rule.match.host;
  if (rule.match.path) return String(rule.match.path);
  return 'All requests';
}

function getRuleSpeed(rule: Rule): string {
  if (rule.action === 'throttle') {
    const config = rule.config as ThrottleConfig;
    return formatBandwidthBits(config?.bytesPerSecond || 0);
  }
  if (rule.action === 'delay') {
    const config = rule.config as DelayConfig;
    return `${config?.delay || 0}ms delay`;
  }
  return '';
}

function getRuleLatency(rule: Rule): string {
  if (rule.action === 'throttle') {
    const config = rule.config as ThrottleConfig;
    return config?.latency ? `${config.latency}ms` : '-';
  }
  if (rule.action === 'delay') {
    const config = rule.config as DelayConfig;
    return config?.variance ? `+/-${config.variance}ms` : '-';
  }
  return '-';
}

export function ThrottlingPanel({ isOpen, onClose }: ThrottlingPanelProps) {
  const {
    rules,
    setRules,
    addRule,
    updateRule: updateRuleInStore,
    removeRule,
    setLoading,
  } = useRulesStore();

  const [showAddForm, setShowAddForm] = useState(false);
  const [urlPattern, setUrlPattern] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<ThrottlePreset>(THROTTLE_PRESETS[2]); // Default to 3G
  const [customBytesPerSecond, setCustomBytesPerSecond] = useState(93750);
  const [customLatency, setCustomLatency] = useState(200);
  const [customVariance, setCustomVariance] = useState(0);
  const [ruleType, setRuleType] = useState<'throttle' | 'delay'>('throttle');
  const [delayMs, setDelayMs] = useState(1000);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bandwidthUnit, setBandwidthUnit] = useState<'kbps' | 'mbps'>('kbps');
  const [showPresetDropdown, setShowPresetDropdown] = useState(false);

  // Load rules on open
  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    getRules()
      .then(({ rules }) => setRules(rules))
      .finally(() => setLoading(false));

    const unsubscribe = subscribeToRules(
      (rule) => addRule(rule),
      (rule) => updateRuleInStore(rule),
      (id) => removeRule(id),
      (rule) => updateRuleInStore(rule),
      (rules) => setRules(rules)
    );

    return unsubscribe;
  }, [isOpen]);

  // Filter throttle/delay rules
  const throttleRules = useMemo(
    () => rules.filter(isThrottleRule),
    [rules]
  );

  const handlePresetSelect = useCallback((preset: ThrottlePreset) => {
    setSelectedPreset(preset);
    if (preset.name !== 'Custom') {
      setCustomBytesPerSecond(preset.bytesPerSecond);
      setCustomLatency(preset.latency);
    }
    setShowPresetDropdown(false);
  }, []);

  const handleBandwidthInputChange = useCallback((value: string) => {
    const num = parseFloat(value) || 0;
    if (bandwidthUnit === 'mbps') {
      setCustomBytesPerSecond(Math.round((num * 1000000) / 8));
    } else {
      setCustomBytesPerSecond(Math.round((num * 1000) / 8));
    }
  }, [bandwidthUnit]);

  const getBandwidthInputValue = useCallback((): string => {
    if (customBytesPerSecond === 0) return '0';
    if (bandwidthUnit === 'mbps') {
      return ((customBytesPerSecond * 8) / 1000000).toFixed(1);
    }
    return ((customBytesPerSecond * 8) / 1000).toFixed(0);
  }, [customBytesPerSecond, bandwidthUnit]);

  const handleAddRule = useCallback(async () => {
    if (!urlPattern.trim()) {
      setError('URL pattern is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (ruleType === 'throttle') {
        const bytesPerSecond = selectedPreset.name === 'Custom'
          ? customBytesPerSecond
          : selectedPreset.bytesPerSecond;
        const latency = selectedPreset.name === 'Custom'
          ? customLatency
          : selectedPreset.latency;

        const created = await createRule({
          name: `Throttle: ${urlPattern}`,
          match: { url: urlPattern },
          action: 'throttle',
          config: {
            bytesPerSecond,
            latency,
          } as ThrottleConfig,
          enabled: true,
        });
        addRule(created);
      } else {
        const created = await createRule({
          name: `Delay: ${urlPattern}`,
          match: { url: urlPattern },
          action: 'delay',
          config: {
            delay: delayMs,
            variance: customVariance > 0 ? customVariance : undefined,
          } as DelayConfig,
          enabled: true,
        });
        addRule(created);
      }

      // Reset form
      setUrlPattern('');
      setShowAddForm(false);
      setSelectedPreset(THROTTLE_PRESETS[2]);
      setCustomBytesPerSecond(93750);
      setCustomLatency(200);
      setDelayMs(1000);
      setCustomVariance(0);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    urlPattern, ruleType, selectedPreset, customBytesPerSecond, customLatency,
    delayMs, customVariance, addRule,
  ]);

  const handleToggle = useCallback(async (rule: Rule) => {
    try {
      const updated = await toggleRule(rule.id);
      updateRuleInStore(updated);
    } catch (err) {
      console.error('Failed to toggle rule:', err);
    }
  }, [updateRuleInStore]);

  const handleDelete = useCallback(async (rule: Rule) => {
    try {
      await deleteRule(rule.id);
      removeRule(rule.id);
    } catch (err) {
      console.error('Failed to delete rule:', err);
    }
  }, [removeRule]);

  if (!isOpen) return null;

  const activeBytesPerSecond = selectedPreset.name === 'Custom'
    ? customBytesPerSecond
    : selectedPreset.bytesPerSecond;

  const footer = (
    <div className="flex items-center justify-between text-sm text-gray-500">
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4" aria-hidden="true" />
        Per-URL throttling applies different speeds to specific URLs
      </div>
      <button
        type="button"
        onClick={onClose}
        className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-gray-300"
      >
        Close
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Per-URL Throttling"
      titleIcon={<Activity className="w-5 h-5 text-orange-400" aria-hidden="true" />}
      size="lg"
      footer={footer}
    >
      <>
        {throttleRules.filter((r) => r.enabled).length > 0 && (
          <div className="mx-4 mt-4 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center gap-3">
            <Activity className="w-5 h-5 text-orange-400 flex-shrink-0" />
            <div>
              <div className="font-medium text-orange-300">
                {throttleRules.filter((r) => r.enabled).length} throttle rule{throttleRules.filter((r) => r.enabled).length !== 1 ? 's' : ''} active
              </div>
              <div className="text-sm text-gray-400">
                Matching requests will be slowed down
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Existing Throttle Rules */}
          {throttleRules.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-400 mb-3">Active Throttle Rules</h4>
              <div className="space-y-2">
                {throttleRules.map((rule) => {
                  const bytesPerSec = rule.action === 'throttle'
                    ? (rule.config as ThrottleConfig)?.bytesPerSecond || 0
                    : 0;

                  return (
                    <div
                      key={rule.id}
                      className={`p-3 rounded-lg border transition-colors ${
                        rule.enabled
                          ? 'bg-gray-900 border-gray-700'
                          : 'bg-gray-900/50 border-gray-700/50 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Toggle Switch */}
                        <button
                          onClick={() => handleToggle(rule)}
                          className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
                            rule.enabled ? 'bg-orange-500' : 'bg-gray-600'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                              rule.enabled ? 'left-4.5 translate-x-0' : 'left-0.5'
                            }`}
                            style={{ left: rule.enabled ? '18px' : '2px' }}
                          />
                        </button>

                        {/* Action Badge */}
                        <span
                          className={`px-1.5 py-0.5 text-xs rounded flex-shrink-0 ${
                            rule.action === 'throttle'
                              ? 'bg-red-400 text-white'
                              : 'bg-amber-500 text-white'
                          }`}
                        >
                          {rule.action === 'throttle' ? 'Throttle' : 'Delay'}
                        </span>

                        {/* Rule Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono text-gray-200 truncate">
                              {getUrlPattern(rule)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Gauge className="w-3 h-3" />
                              {getRuleSpeed(rule)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {getRuleLatency(rule)}
                            </span>
                          </div>
                        </div>

                        {/* Bandwidth Meter */}
                        {rule.action === 'throttle' && bytesPerSec > 0 && (
                          <div className="w-20 flex-shrink-0">
                            <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${getBandwidthColor(bytesPerSec)}`}
                                style={{ width: `${getBandwidthPercent(bytesPerSec)}%` }}
                              />
                            </div>
                            <div className="text-[10px] text-gray-500 text-center mt-0.5">
                              {formatBandwidth(bytesPerSec)}
                            </div>
                          </div>
                        )}

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDelete(rule)}
                          className="p-1 hover:bg-gray-700 rounded text-red-400 flex-shrink-0"
                          title="Delete rule"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty State */}
          {throttleRules.length === 0 && !showAddForm && (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 mb-1">No throttle rules configured</p>
              <p className="text-sm text-gray-500 mb-4">
                Create rules to simulate slow network conditions for specific URLs
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-sm transition-colors"
              >
                Add Throttle Rule
              </button>
            </div>
          )}

          {/* Add Rule Form */}
          {showAddForm && (
            <div className="border border-gray-700 rounded-lg p-4 space-y-4 bg-gray-900/50">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-300">New Throttle Rule</h4>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setError(null);
                  }}
                  className="p-1 hover:bg-gray-700 rounded text-gray-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Error message */}
              {error && (
                <div className="p-2 bg-red-900/30 border border-red-500/20 text-red-400 text-sm rounded">
                  {error}
                </div>
              )}

              {/* Rule Type Toggle */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Rule Type</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setRuleType('throttle')}
                    className={`flex-1 py-2 px-3 text-sm rounded-md transition-colors ${
                      ruleType === 'throttle'
                        ? 'bg-red-500/20 border border-red-500/40 text-red-300'
                        : 'bg-gray-700 border border-gray-600 text-gray-400 hover:bg-gray-600'
                    }`}
                  >
                    <Gauge className="w-4 h-4 inline mr-1.5" />
                    Throttle Bandwidth
                  </button>
                  <button
                    onClick={() => setRuleType('delay')}
                    className={`flex-1 py-2 px-3 text-sm rounded-md transition-colors ${
                      ruleType === 'delay'
                        ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                        : 'bg-gray-700 border border-gray-600 text-gray-400 hover:bg-gray-600'
                    }`}
                  >
                    <Clock className="w-4 h-4 inline mr-1.5" />
                    Add Latency
                  </button>
                </div>
              </div>

              {/* URL Pattern */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">URL Pattern</label>
                <input
                  type="text"
                  value={urlPattern}
                  onChange={(e) => setUrlPattern(e.target.value)}
                  placeholder="*api.example.com* or *.example.com/api/*"
                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use * as wildcard. Supports glob patterns and /regex/ syntax.
                </p>
              </div>

              {ruleType === 'throttle' ? (
                <>
                  {/* Preset Selector */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Network Preset</label>
                    <div className="relative">
                      <button
                        onClick={() => setShowPresetDropdown(!showPresetDropdown)}
                        className="w-full flex items-center justify-between bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm hover:bg-gray-600 focus:outline-none focus:border-orange-500"
                      >
                        <div className="flex items-center gap-2">
                          {getPresetIcon(selectedPreset.icon)}
                          <span>{selectedPreset.name}</span>
                          <span className="text-gray-500">- {selectedPreset.description}</span>
                        </div>
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      </button>

                      {showPresetDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-700 border border-gray-600 rounded-md shadow-lg z-10 py-1">
                          {THROTTLE_PRESETS.map((preset) => (
                            <button
                              key={preset.name}
                              onClick={() => handlePresetSelect(preset)}
                              className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-600 text-left ${
                                selectedPreset.name === preset.name ? 'bg-gray-600' : ''
                              }`}
                            >
                              {getPresetIcon(preset.icon)}
                              <span className="font-medium">{preset.name}</span>
                              <span className="text-gray-400 text-xs">{preset.description}</span>
                              {preset.latency > 0 && (
                                <span className="text-gray-500 text-xs ml-auto">+{preset.latency}ms</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Custom Bandwidth & Latency (shown when Custom is selected or always) */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Bandwidth</label>
                      <div className="flex">
                        <input
                          type="number"
                          value={getBandwidthInputValue()}
                          onChange={(e) => handleBandwidthInputChange(e.target.value)}
                          disabled={selectedPreset.name !== 'Custom'}
                          className="flex-1 bg-gray-700 border border-gray-600 rounded-l-md px-3 py-2 text-sm disabled:opacity-50 focus:outline-none focus:border-orange-500"
                          min="0"
                        />
                        <select
                          value={bandwidthUnit}
                          onChange={(e) => setBandwidthUnit(e.target.value as 'kbps' | 'mbps')}
                          disabled={selectedPreset.name !== 'Custom'}
                          className="bg-gray-600 border border-gray-600 rounded-r-md px-2 py-2 text-sm disabled:opacity-50"
                        >
                          <option value="kbps">kbps</option>
                          <option value="mbps">Mbps</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Latency (ms)</label>
                      <input
                        type="number"
                        value={selectedPreset.name === 'Custom' ? customLatency : selectedPreset.latency}
                        onChange={(e) => setCustomLatency(parseInt(e.target.value) || 0)}
                        disabled={selectedPreset.name !== 'Custom'}
                        className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm disabled:opacity-50 focus:outline-none focus:border-orange-500"
                        min="0"
                      />
                    </div>
                  </div>

                  {/* Visual Bandwidth Meter */}
                  {activeBytesPerSecond > 0 && (
                    <div className="bg-gray-700/50 rounded-md p-3">
                      <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                        <span>Bandwidth Preview</span>
                        <span>{formatBandwidthBits(activeBytesPerSecond)} ({formatBandwidth(activeBytesPerSecond)})</span>
                      </div>
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${getBandwidthColor(activeBytesPerSecond)}`}
                          style={{ width: `${getBandwidthPercent(activeBytesPerSecond)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                        <span>50 kbps</span>
                        <span>1 Mbps</span>
                        <span>10 Mbps</span>
                        <span>100 Mbps</span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Delay Configuration */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Delay (ms)</label>
                      <input
                        type="number"
                        value={delayMs}
                        onChange={(e) => setDelayMs(parseInt(e.target.value) || 0)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                        min="0"
                        step="100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Variance (ms)</label>
                      <input
                        type="number"
                        value={customVariance}
                        onChange={(e) => setCustomVariance(parseInt(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                        min="0"
                      />
                      <p className="text-xs text-gray-500 mt-1">Random jitter +/- this value</p>
                    </div>
                  </div>

                  {/* Delay Preview */}
                  <div className="bg-gray-700/50 rounded-md p-3">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        Each matching request will be delayed by{' '}
                        <span className="text-amber-400 font-medium">{delayMs}ms</span>
                        {customVariance > 0 && (
                          <span> (+/- <span className="text-amber-400">{customVariance}ms</span>)</span>
                        )}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* Submit Button */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setError(null);
                  }}
                  className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-md text-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddRule}
                  disabled={isSubmitting || !urlPattern.trim()}
                  className="px-4 py-2 text-sm bg-orange-600 hover:bg-orange-700 rounded-md text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Creating...' : 'Create Rule'}
                </button>
              </div>
            </div>
          )}

          {/* Add Rule Button (when form is not shown and rules exist) */}
          {!showAddForm && throttleRules.length > 0 && (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-gray-600 rounded-lg text-sm text-gray-400 hover:text-gray-300 hover:border-gray-500 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Throttle Rule
            </button>
          )}
        </div>
      </>
    </Modal>
  );
}
