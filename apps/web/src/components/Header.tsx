import { useState, useEffect, type ReactNode } from 'react';
import { Play, Pause, Trash2, Download, Settings, ListFilter, Octagon, Gauge, Command, Search, List, BarChart3, Sun, Moon, PieChart, Activity } from 'lucide-react';
import { useTrafficStore, useActiveEntries } from '@/stores/trafficStore';
import { useBreakpointStore } from '@/stores/breakpointStore';
import { getCACertificateDownloadUrl, getActiveSession } from '@/services/api';
import { HarExportImport } from './HarExportImport';
import { CompareButton } from './compare';
import { useTheme } from '@/hooks/useTheme';
import { IconButton, SegmentedControl, Wordmark } from './ui';
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

/** A small status dot rendered over an IconButton (pending hits, active flags). */
function Indicator({ children, className }: { children?: ReactNode; className: string }) {
  return <span className={className} aria-hidden="true">{children}</span>;
}

function Divider() {
  return <div className="w-px h-5 bg-edge shrink-0" />;
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
    getActiveSession().then(setSession).catch(console.error);
  }, []);

  const handleDownloadCert = () => {
    window.location.href = getCACertificateDownloadUrl();
  };

  return (
    <header className="bg-surface-raised border-b border-edge px-3 h-12 flex items-center">
      <div className="flex items-center gap-3 min-w-0 w-full">
        {/* Brand + live status */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Wordmark />
          <div
            className="flex items-center gap-1.5 rounded-full border border-edge bg-surface px-2 py-0.5 text-[11px]"
            title={isConnected ? 'Live capture connected' : 'Disconnected'}
          >
            <span className="relative flex h-1.5 w-1.5">
              {isConnected && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60" />
              )}
              <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-success' : 'bg-danger'}`} />
            </span>
            <span className="text-ink-muted">{isConnected ? 'Live' : 'Offline'}</span>
          </div>
        </div>

        <Divider />

        <span className="text-xs text-ink-faint tabular-nums shrink-0">
          <span className="text-ink-secondary font-medium">{entries.length.toLocaleString()}</span> requests
        </span>

        <div className="flex-1" />

        {/* Capture controls */}
        <div className="flex items-center gap-0.5 shrink-0" role="group" aria-label="Capture controls">
          <IconButton
            label={isPaused ? 'Resume capture' : 'Pause capture'}
            icon={isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            onClick={() => setPaused(!isPaused)}
            active={isPaused}
            className={isPaused ? '!bg-success/15 !text-success' : ''}
          />
          <IconButton
            label="Clear all requests"
            shortcut="⌘⇧X"
            icon={<Trash2 className="w-3.5 h-3.5" />}
            onClick={clearEntries}
          />
        </div>

        <Divider />

        {/* Panels */}
        <div className="flex items-center gap-0.5 shrink-0" role="group" aria-label="Panels">
          <IconButton
            label="Rules"
            shortcut="⌘⇧R"
            icon={<ListFilter className="w-3.5 h-3.5" />}
            onClick={onToggleRules}
            active={!!showRules}
          />
          <div className="relative">
            <IconButton
              label="Breakpoints"
              shortcut="⌘⇧B"
              icon={<Octagon className="w-3.5 h-3.5" />}
              onClick={onToggleBreakpoints}
              active={!!showBreakpoints}
            />
            {pendingHits.length > 0 && (
              <Indicator className="absolute -top-1 -right-1 flex items-center justify-center min-w-[15px] h-[15px] px-0.5 text-[10px] font-bold text-white bg-danger rounded-full">
                {pendingHits.length}
              </Indicator>
            )}
          </div>
          <div className="relative">
            <IconButton
              label={hasActiveNetworkProfile ? 'Network throttling active' : 'Network conditioning'}
              icon={<Gauge className="w-3.5 h-3.5" />}
              onClick={onToggleNetwork}
              active={!!showNetwork || hasActiveNetworkProfile}
              className={hasActiveNetworkProfile ? '!bg-warn/15 !text-warn' : ''}
            />
            {hasActiveNetworkProfile && (
              <Indicator className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-warn" />
            )}
          </div>
          <div className="relative">
            <IconButton
              label={hasActiveThrottleRules ? 'Per-URL throttling active' : 'Per-URL throttling'}
              icon={<Activity className="w-3.5 h-3.5" />}
              onClick={onToggleThrottling}
              active={hasActiveThrottleRules}
              className={hasActiveThrottleRules ? '!bg-orange-500/15 !text-orange-400' : ''}
            />
            {hasActiveThrottleRules && (
              <Indicator className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-orange-400" />
            )}
          </div>
        </div>

        <Divider />

        {/* Data actions */}
        <div className="flex items-center gap-0.5 shrink-0">
          {session && <HarExportImport sessionId={session.id} sessionName={session.name} />}
          {onOpenCompare && <CompareButton onOpenCompare={onOpenCompare} />}
        </div>

        <Divider />

        {/* View mode */}
        {onViewModeChange && (
          <SegmentedControl
            aria-label="View mode"
            value={viewMode ?? 'list'}
            onChange={(m) => onViewModeChange(m as ViewMode)}
            segments={[
              { value: 'list', label: '', ariaLabel: 'List view', icon: <List className="w-3.5 h-3.5" /> },
              { value: 'waterfall', label: '', ariaLabel: 'Waterfall view', icon: <BarChart3 className="w-3.5 h-3.5" /> },
              { value: 'dashboard', label: '', ariaLabel: 'Performance dashboard', icon: <PieChart className="w-3.5 h-3.5" /> },
            ]}
          />
        )}

        {/* Utilities */}
        <div className="flex items-center gap-0.5 shrink-0">
          {onOpenCommandPalette && (
            <IconButton
              label="Command palette"
              shortcut="⌘K"
              icon={<Command className="w-3.5 h-3.5" />}
              onClick={onOpenCommandPalette}
            />
          )}
          {onOpenGlobalSearch && (
            <IconButton
              label="Search all sessions"
              shortcut="⌘⇧F"
              icon={<Search className="w-3.5 h-3.5" />}
              onClick={onOpenGlobalSearch}
            />
          )}
          <IconButton
            label="Download CA certificate"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={handleDownloadCert}
          />
          <IconButton
            label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            icon={theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          />
          <IconButton
            label="Settings"
            shortcut="⌘,"
            icon={<Settings className="w-3.5 h-3.5" />}
            onClick={onToggleSettings}
          />
        </div>
      </div>
    </header>
  );
}
