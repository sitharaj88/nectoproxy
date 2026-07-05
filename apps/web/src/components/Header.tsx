import { useState, useEffect } from 'react';
import { Play, Pause, Trash2, Download, Settings, Circle, ListFilter, Octagon, Gauge, Command, Search, List, BarChart3, Sun, Moon, PieChart, Activity } from 'lucide-react';
import { useTrafficStore, useActiveEntries } from '@/stores/trafficStore';
import { useBreakpointStore } from '@/stores/breakpointStore';
import { getCACertificateDownloadUrl, getActiveSession } from '@/services/api';
import { HarExportImport } from './HarExportImport';
import { CompareButton } from './compare';
import { useTheme } from '@/hooks/useTheme';
import type { ViewMode } from '@/stores/viewStore';
import type { Session } from '@nectoproxy/shared';

interface HeaderProps {
  isConnected: boolean;
  proxyPort?: number;
  onToggleRules?: () => void;
  showRules?: boolean;
  onToggleBreakpoints?: () => void;
  showBreakpoints?: boolean;
  onToggleSettings?: () => void;
  onToggleNetwork?: () => void;
  showNetwork?: boolean;
  hasActiveNetworkProfile?: boolean;
  onToggleThrottling?: () => void;
  hasActiveThrottleRules?: boolean;
  onOpenCommandPalette?: () => void;
  onOpenGlobalSearch?: () => void;
  onOpenCompare?: () => void;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
}

export function Header({ isConnected, onToggleRules, showRules, onToggleBreakpoints, showBreakpoints, onToggleSettings, onToggleNetwork, showNetwork, hasActiveNetworkProfile, onToggleThrottling, hasActiveThrottleRules, onOpenCommandPalette, onOpenGlobalSearch, onOpenCompare, viewMode, onViewModeChange }: HeaderProps) {
  const isPaused = useTrafficStore((state) => state.isPaused);
  const setPaused = useTrafficStore((state) => state.setPaused);
  const clearEntries = useTrafficStore((state) => state.clearEntries);
  const entries = useActiveEntries();
  const pendingHits = useBreakpointStore((state) => state.pendingHits);
  const [session, setSession] = useState<Session | null>(null);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    getActiveSession()
      .then(setSession)
      .catch(console.error);
  }, []);

  const handleDownloadCert = () => {
    window.location.href = getCACertificateDownloadUrl();
  };

  return (
    <header className="bg-gray-800 border-b border-gray-700 px-4 py-2">
      <div className="flex items-center gap-3 min-w-0">
        {/* Brand + Status */}
        <div className="flex items-center gap-3 shrink-0">
          <h1 className="text-lg font-bold text-white flex items-center gap-1.5">
            <span className="text-primary-400">Necto</span>
            <span>Proxy</span>
          </h1>

          <div className="flex items-center gap-1.5 text-xs">
            <Circle
              className={`w-2 h-2 ${
                isConnected ? 'fill-green-400 text-green-400' : 'fill-red-400 text-red-400'
              }`}
            />
            <span className="text-gray-400">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        <div className="w-px h-5 bg-gray-600 shrink-0" />

        <span className="text-xs text-gray-500 tabular-nums shrink-0">
          {entries.length} requests
        </span>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Capture Controls */}
        <div className="flex items-center gap-1 shrink-0" role="group" aria-label="Capture controls">
          <button
            type="button"
            onClick={() => setPaused(!isPaused)}
            aria-pressed={isPaused}
            aria-label={isPaused ? 'Resume capture' : 'Pause capture'}
            className={`p-1.5 rounded transition-colors ${
              isPaused
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
            title={isPaused ? 'Resume capture' : 'Pause capture'}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" aria-hidden="true" /> : <Pause className="w-3.5 h-3.5" aria-hidden="true" />}
          </button>

          <button
            type="button"
            onClick={clearEntries}
            aria-label="Clear all requests"
            className="p-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
            title="Clear all requests (⌘⇧X)"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

        <div className="w-px h-5 bg-gray-600 shrink-0" />

        {/* Feature Toggles */}
        <div className="flex items-center gap-1 shrink-0" role="group" aria-label="Panels">
          <button
            type="button"
            onClick={onToggleRules}
            aria-pressed={!!showRules}
            aria-label={showRules ? 'Hide rules panel' : 'Show rules panel'}
            className={`p-1.5 rounded transition-colors ${
              showRules
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
            title={`${showRules ? 'Hide' : 'Show'} Rules (⌘⇧R)`}
          >
            <ListFilter className="w-3.5 h-3.5" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={onToggleBreakpoints}
            aria-pressed={!!showBreakpoints}
            aria-label={showBreakpoints ? 'Hide breakpoints panel' : 'Show breakpoints panel'}
            className={`relative p-1.5 rounded transition-colors ${
              showBreakpoints
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
            title={`${showBreakpoints ? 'Hide' : 'Show'} Breakpoints (⌘⇧B)`}
          >
            <Octagon className="w-3.5 h-3.5" aria-hidden="true" />
            {pendingHits.length > 0 && (
              <span
                className="absolute -top-1 -right-1 flex items-center justify-center w-3.5 h-3.5 text-[10px] font-bold text-white bg-red-500 rounded-full"
                aria-label={`${pendingHits.length} pending breakpoint hits`}
              >
                {pendingHits.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onToggleNetwork}
            aria-pressed={!!showNetwork}
            aria-label={hasActiveNetworkProfile ? 'Network throttling active' : 'Network conditioning'}
            className={`relative p-1.5 rounded transition-colors ${
              hasActiveNetworkProfile
                ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                : showNetwork
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
            title={hasActiveNetworkProfile ? 'Network Throttling Active' : 'Network Conditioning'}
          >
            <Gauge className="w-3.5 h-3.5" aria-hidden="true" />
            {hasActiveNetworkProfile && (
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-yellow-400" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            onClick={onToggleThrottling}
            aria-label={hasActiveThrottleRules ? 'Per-URL throttling active' : 'Per-URL throttling'}
            className={`relative p-1.5 rounded transition-colors ${
              hasActiveThrottleRules
                ? 'bg-orange-600 hover:bg-orange-700 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
            title={hasActiveThrottleRules ? 'Per-URL Throttling Active' : 'Per-URL Throttling'}
          >
            <Activity className="w-3.5 h-3.5" aria-hidden="true" />
            {hasActiveThrottleRules && (
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-orange-400" aria-hidden="true" />
            )}
          </button>
        </div>

        <div className="w-px h-5 bg-gray-600 shrink-0" />

        {/* Data Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {session && (
            <HarExportImport
              sessionId={session.id}
              sessionName={session.name}
            />
          )}

          {onOpenCompare && <CompareButton onOpenCompare={onOpenCompare} />}
        </div>

        <div className="w-px h-5 bg-gray-600 shrink-0" />

        {/* View Mode Toggle */}
        {onViewModeChange && (
          <div className="flex items-center bg-gray-700 rounded shrink-0" role="group" aria-label="View mode">
            <button
              type="button"
              onClick={() => onViewModeChange('list')}
              aria-pressed={viewMode === 'list'}
              className={`p-1.5 rounded-l transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              title="List view"
              aria-label="List view"
            >
              <List className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('waterfall')}
              aria-pressed={viewMode === 'waterfall'}
              className={`p-1.5 transition-colors ${
                viewMode === 'waterfall'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              title="Waterfall view"
              aria-label="Waterfall view"
            >
              <BarChart3 className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('dashboard')}
              aria-pressed={viewMode === 'dashboard'}
              className={`p-1.5 rounded-r transition-colors ${
                viewMode === 'dashboard'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              title="Performance dashboard"
              aria-label="Performance dashboard"
            >
              <PieChart className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Utilities */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Command Palette */}
          {onOpenCommandPalette && (
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className="p-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
              title="Command palette (⌘K)"
              aria-label="Open command palette"
            >
              <Command className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}

          {/* Global Search */}
          {onOpenGlobalSearch && (
            <button
              type="button"
              onClick={onOpenGlobalSearch}
              className="p-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
              title="Search across all sessions (⌘⇧F)"
              aria-label="Open global search"
            >
              <Search className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}

          <button
            type="button"
            onClick={handleDownloadCert}
            className="p-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
            title="Download CA certificate"
            aria-label="Download CA certificate"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" aria-hidden="true" /> : <Moon className="w-3.5 h-3.5" aria-hidden="true" />}
          </button>

          <button
            type="button"
            onClick={onToggleSettings}
            className="p-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
            title="Settings (⌘,)"
            aria-label="Open settings"
          >
            <Settings className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
