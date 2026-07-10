import { useState, useCallback, useRef, useMemo } from 'react';
import { Group, Panel, Separator, type Layout, type LayoutChangedMeta } from 'react-resizable-panels';
import { Header } from '@/components/Header';
import { FilterBar } from '@/components/FilterBar';
import { TrafficList } from '@/components/TrafficList';
import { DetailPanel } from '@/components/DetailPanel';
import { RulesPanel } from '@/components/rules';
import { BreakpointsPanel } from '@/components/breakpoints';
import { SettingsPanel } from '@/components/SettingsPanel';
import { NetworkConditionPanel } from '@/components/NetworkConditionPanel';
import { ThrottlingPanel } from '@/components/ThrottlingPanel';
import { Toaster, toast } from '@/components/ui/Toaster';
import { CommandPalette } from '@/components/CommandPalette';
import { GlobalSearch } from '@/components/GlobalSearch';
import { KeyboardShortcutsHelp } from '@/components/KeyboardShortcutsHelp';
import { MobileNav } from '@/components/MobileNav';
import { WaterfallChart } from '@/components/WaterfallChart';
import { DashboardView } from '@/components/dashboard';
import { CompareModal } from '@/components/compare';
import { SessionTabs } from '@/components/SessionTabs';
import { useSocketConnection } from '@/hooks/useSocket';
import { useSelectedEntry, useTrafficStore, useActiveRawEntries } from '@/stores/trafficStore';
import { useRulesStore } from '@/stores/rulesStore';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useTheme } from '@/hooks/useTheme';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useViewStore } from '@/stores/viewStore';
import type { NetworkProfile } from '@/services/api';

export default function App() {
  const { isConnected, proxyConfig } = useSocketConnection();
  const selectedEntry = useSelectedEntry();
  const { setSelected, clearEntries } = useTrafficStore();
  const entries = useActiveRawEntries();
  const { mode: viewMode, setMode: setViewMode } = useViewStore();

  const [showRules, setShowRules] = useState(false);
  const [showBreakpoints, setShowBreakpoints] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNetwork, setShowNetwork] = useState(false);
  const [showThrottling, setShowThrottling] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [activeNetworkProfile, setActiveNetworkProfile] = useState<NetworkProfile | null>(null);
  const [mobileTab, setMobileTab] = useState<'traffic' | 'rules' | 'breakpoints' | 'settings' | 'waterfall'>('traffic');

  const searchInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();
  const rules = useRulesStore((state) => state.rules);

  // Persisted layout for the resizable traffic | detail split (equivalent of
  // autoSaveId — react-resizable-panels v4 persists via defaultLayout + onLayoutChanged).
  const [splitLayout] = useState<Layout | undefined>(() => {
    try {
      const raw = localStorage.getItem('necto-main-split');
      return raw ? (JSON.parse(raw) as Layout) : undefined;
    } catch {
      return undefined;
    }
  });

  const handleSplitLayoutChanged = useCallback((layout: Layout, meta: LayoutChangedMeta) => {
    if (!meta.isUserInteraction) return;
    try {
      localStorage.setItem('necto-main-split', JSON.stringify(layout));
    } catch {
      /* ignore persistence failures */
    }
  }, []);

  // Check if there are any active throttle/delay rules
  const hasActiveThrottleRules = useMemo(
    () => rules.some((r) => r.enabled && (r.action === 'throttle' || r.action === 'delay')),
    [rules]
  );

  // Initialize theme
  useTheme();

  // Get current selection index for keyboard navigation
  const selectedIndex = entries.findIndex((e) => e.id === selectedEntry?.id);

  // Keyboard shortcuts handlers
  const handleNavigateUp = useCallback(() => {
    if (entries.length === 0) return;
    const newIndex = selectedIndex <= 0 ? entries.length - 1 : selectedIndex - 1;
    setSelected(entries[newIndex].id);
  }, [entries, selectedIndex, setSelected]);

  const handleNavigateDown = useCallback(() => {
    if (entries.length === 0) return;
    const newIndex = selectedIndex >= entries.length - 1 ? 0 : selectedIndex + 1;
    setSelected(entries[newIndex].id);
  }, [entries, selectedIndex, setSelected]);

  const handleClosePanel = useCallback(() => {
    if (showGlobalSearch) {
      setShowGlobalSearch(false);
    } else if (showCommandPalette) {
      setShowCommandPalette(false);
    } else if (showShortcutsHelp) {
      setShowShortcutsHelp(false);
    } else if (showSettings) {
      setShowSettings(false);
    } else if (showBreakpoints) {
      setShowBreakpoints(false);
    } else if (showNetwork) {
      setShowNetwork(false);
    } else if (showThrottling) {
      setShowThrottling(false);
    } else if (selectedEntry) {
      setSelected(null);
    } else if (showRules) {
      setShowRules(false);
    }
  }, [showGlobalSearch, showCommandPalette, showShortcutsHelp, showSettings, showBreakpoints, showNetwork, showThrottling, selectedEntry, showRules, setSelected]);

  const handleClearTraffic = useCallback(() => {
    clearEntries();
    toast.success('Traffic cleared');
  }, [clearEntries]);

  // Register keyboard shortcuts
  useKeyboardShortcuts({
    onOpenCommandPalette: () => setShowCommandPalette(true),
    onFocusSearch: () => searchInputRef.current?.focus(),
    onOpenGlobalSearch: () => setShowGlobalSearch(true),
    onOpenSettings: () => setShowSettings(true),
    onToggleRules: () => setShowRules((s) => !s),
    onToggleBreakpoints: () => setShowBreakpoints((s) => !s),
    onNavigateUp: handleNavigateUp,
    onNavigateDown: handleNavigateDown,
    onClosePanel: handleClosePanel,
    onShowShortcuts: () => setShowShortcutsHelp(true),
    onClearTraffic: handleClearTraffic,
  });

  // Command palette navigation handler
  const handleCommandNavigate = useCallback((action: string) => {
    switch (action) {
      case 'settings':
        setShowSettings(true);
        break;
      case 'rules':
        setShowRules((s) => !s);
        break;
      case 'breakpoints':
        setShowBreakpoints(true);
        break;
      case 'network':
        setShowNetwork(true);
        break;
      case 'throttling':
        setShowThrottling(true);
        break;
      case 'global-search':
        setShowGlobalSearch(true);
        break;
      case 'clear':
        handleClearTraffic();
        break;
      case 'view-list':
        setViewMode('list');
        break;
      case 'view-waterfall':
        setViewMode('waterfall');
        break;
      case 'view-dashboard':
        setViewMode('dashboard');
        break;
      case 'filter-errors':
        toast.info('Filtering errors...');
        break;
      case 'filter-clear':
        toast.info('Filters cleared');
        break;
      default:
        toast.info(`Action: ${action}`);
    }
  }, [handleClearTraffic, setViewMode]);

  // Mobile tab change handler
  const handleMobileTabChange = useCallback((tab: typeof mobileTab) => {
    setMobileTab(tab);
    if (tab === 'settings') setShowSettings(true);
    if (tab === 'breakpoints') setShowBreakpoints(true);
    if (tab === 'waterfall') setViewMode('waterfall');
    if (tab === 'traffic') setViewMode('list');
  }, [setViewMode]);

  // Determine content view based on mode
  const renderMainContent = () => {
    // Dashboard view takes full screen
    if (viewMode === 'dashboard') {
      return <DashboardView />;
    }

    if (isMobile) {
      // Mobile: Single panel based on active tab
      switch (mobileTab) {
        case 'waterfall':
          return <WaterfallChart />;
        case 'rules':
          return <RulesPanel onClose={() => setMobileTab('traffic')} />;
        default:
          return selectedEntry ? <DetailPanel /> : <TrafficList searchInputRef={searchInputRef} />;
      }
    }

    // Desktop: Multi-panel layout — resizable split between traffic list and detail.
    return (
      <>
        <Group
          orientation="horizontal"
          id="necto-main-split"
          defaultLayout={splitLayout}
          onLayoutChanged={handleSplitLayoutChanged}
          className="flex-1 min-w-0"
        >
          {/* Traffic List or Waterfall */}
          <Panel id="traffic" defaultSize={selectedEntry ? 55 : 100} minSize={30}>
            <div
              className={`flex flex-col h-full ${
                showRules && !selectedEntry ? 'border-r border-edge' : ''
              }`}
            >
              {viewMode === 'waterfall' ? (
                <WaterfallChart />
              ) : (
                <TrafficList searchInputRef={searchInputRef} onOpenCompare={() => setShowCompare(true)} />
              )}
            </div>
          </Panel>

          {/* Detail Panel */}
          {selectedEntry && (
            <>
              <Separator className="resizer" />
              <Panel id="detail" defaultSize={45} minSize={25}>
                <div className="h-full">
                  <DetailPanel />
                </div>
              </Panel>
            </>
          )}
        </Group>

        {/* Rules Panel */}
        {showRules && <RulesPanel onClose={() => setShowRules(false)} />}
      </>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-canvas text-ink">
      {/* Header */}
      <Header
        isConnected={isConnected}
        proxyPort={proxyConfig?.port}
        onToggleRules={() => setShowRules(!showRules)}
        showRules={showRules}
        onToggleBreakpoints={() => setShowBreakpoints(!showBreakpoints)}
        showBreakpoints={showBreakpoints}
        onToggleSettings={() => setShowSettings(!showSettings)}
        onToggleNetwork={() => setShowNetwork(!showNetwork)}
        showNetwork={showNetwork}
        hasActiveNetworkProfile={activeNetworkProfile !== null}
        onToggleThrottling={() => setShowThrottling(!showThrottling)}
        hasActiveThrottleRules={hasActiveThrottleRules}
        onOpenCommandPalette={() => setShowCommandPalette(true)}
        onOpenGlobalSearch={() => setShowGlobalSearch(true)}
        onOpenCompare={() => setShowCompare(true)}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Filter Bar - Hidden on mobile when not on traffic view, and hidden in dashboard */}
      {viewMode !== 'dashboard' && (!isMobile || mobileTab === 'traffic') && (
        <FilterBar searchInputRef={searchInputRef} />
      )}

      {/* Session Tabs */}
      {viewMode !== 'dashboard' && <SessionTabs />}

      {/* Main Content */}
      <div className={`flex-1 flex overflow-hidden ${isMobile ? 'pb-16' : ''}`}>
        {renderMainContent()}
      </div>

      {/* Mobile Navigation */}
      {isMobile && (
        <MobileNav
          activeTab={mobileTab}
          onTabChange={handleMobileTabChange}
        />
      )}

      {/* Modals */}
      <BreakpointsPanel
        isOpen={showBreakpoints}
        onClose={() => setShowBreakpoints(false)}
      />

      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      <NetworkConditionPanel
        isOpen={showNetwork}
        onClose={() => setShowNetwork(false)}
        onProfileChange={setActiveNetworkProfile}
      />

      <ThrottlingPanel
        isOpen={showThrottling}
        onClose={() => setShowThrottling(false)}
      />

      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onNavigate={handleCommandNavigate}
      />

      <GlobalSearch
        isOpen={showGlobalSearch}
        onClose={() => setShowGlobalSearch(false)}
      />

      <KeyboardShortcutsHelp
        isOpen={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
      />

      <CompareModal
        isOpen={showCompare}
        onClose={() => setShowCompare(false)}
      />

      {/* Toast Notifications */}
      <Toaster />
    </div>
  );
}
