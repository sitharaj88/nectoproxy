import { useState, useEffect } from 'react';
import { Play, Pause, Trash2, Download, Settings, Circle, ListFilter, Octagon, Gauge, Command, List, BarChart3, Sun, Moon } from 'lucide-react';
import { useTrafficStore, useFilteredEntries } from '@/stores/trafficStore';
import { useBreakpointStore } from '@/stores/breakpointStore';
import { getCACertificateDownloadUrl, getActiveSession } from '@/services/api';
import { HarExportImport } from './HarExportImport';
import { useTheme } from '@/hooks/useTheme';
import type { ViewMode } from '@/stores/viewStore';
import type { Session } from '@proxyscope/shared';

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
  onOpenCommandPalette?: () => void;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
}

export function Header({ isConnected, proxyPort, onToggleRules, showRules, onToggleBreakpoints, showBreakpoints, onToggleSettings, onToggleNetwork, showNetwork, hasActiveNetworkProfile, onOpenCommandPalette, viewMode, onViewModeChange }: HeaderProps) {
  const isPaused = useTrafficStore((state) => state.isPaused);
  const setPaused = useTrafficStore((state) => state.setPaused);
  const clearEntries = useTrafficStore((state) => state.clearEntries);
  const entries = useFilteredEntries();
  const pendingHits = useBreakpointStore((state) => state.pendingHits);
  const [session, setSession] = useState<Session | null>(null);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    getActiveSession()
      .then(setSession)
      .catch(console.error);
  }, []);

  const handleDownloadCert = () => {
    // Use the download endpoint which provides .crt format (better for mobile)
    window.location.href = getCACertificateDownloadUrl();
  };

  const handleImportComplete = () => {
    // Refresh traffic list after import
    window.location.reload();
  };

  return (
    <header className="bg-gray-800 border-b border-gray-700 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-primary-400">Proxy</span>
            <span>Scope</span>
          </h1>

          <div className="flex items-center gap-2 text-sm">
            <Circle
              className={`w-2.5 h-2.5 ${
                isConnected ? 'fill-green-400 text-green-400' : 'fill-red-400 text-red-400'
              }`}
            />
            <span className="text-gray-400">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
            {proxyPort && (
              <span className="text-gray-500">| Port {proxyPort}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400 mr-2">
            {entries.length} requests
          </span>

          <button
            onClick={() => setPaused(!isPaused)}
            className={`p-2 rounded-md transition-colors ${
              isPaused
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
            title={isPaused ? 'Resume capture' : 'Pause capture'}
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>

          <button
            onClick={clearEntries}
            className="p-2 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
            title="Clear all requests"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={onToggleRules}
            className={`p-2 rounded-md transition-colors ${
              showRules
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
            title={showRules ? 'Hide Rules' : 'Show Rules'}
          >
            <ListFilter className="w-4 h-4" />
          </button>

          <button
            onClick={onToggleBreakpoints}
            className={`relative p-2 rounded-md transition-colors ${
              showBreakpoints
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
            title={showBreakpoints ? 'Hide Breakpoints' : 'Show Breakpoints'}
          >
            <Octagon className="w-4 h-4" />
            {pendingHits.length > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-red-500 rounded-full">
                {pendingHits.length}
              </span>
            )}
          </button>

          <button
            onClick={onToggleNetwork}
            className={`relative p-2 rounded-md transition-colors ${
              hasActiveNetworkProfile
                ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                : showNetwork
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
            title={hasActiveNetworkProfile ? 'Network Throttling Active' : 'Network Conditioning'}
          >
            <Gauge className="w-4 h-4" />
            {hasActiveNetworkProfile && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-yellow-400" />
            )}
          </button>

          {session && (
            <HarExportImport
              sessionId={session.id}
              sessionName={session.name}
              onImportComplete={handleImportComplete}
            />
          )}

          <div className="w-px h-6 bg-gray-600 mx-1" />

          {/* View Mode Toggle */}
          {onViewModeChange && (
            <div className="flex items-center bg-gray-700 rounded-md">
              <button
                onClick={() => onViewModeChange('list')}
                className={`p-2 rounded-l-md transition-colors ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                title="List View"
                aria-label="List View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => onViewModeChange('waterfall')}
                className={`p-2 rounded-r-md transition-colors ${
                  viewMode === 'waterfall'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                title="Waterfall View"
                aria-label="Waterfall View"
              >
                <BarChart3 className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Command Palette */}
          {onOpenCommandPalette && (
            <button
              onClick={onOpenCommandPalette}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
              title="Command Palette (⌘K)"
              aria-label="Open command palette"
            >
              <Command className="w-4 h-4" />
              <kbd className="text-xs text-gray-500 hidden sm:inline">⌘K</kbd>
            </button>
          )}

          <button
            onClick={handleDownloadCert}
            className="p-2 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
            title="Download CA Certificate"
            aria-label="Download CA Certificate"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={onToggleSettings}
            className="p-2 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
            title="Settings"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
