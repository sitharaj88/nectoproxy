import { useState, useCallback, useRef } from 'react';
import { Header } from '@/components/Header';
import { FilterBar } from '@/components/FilterBar';
import { TrafficList } from '@/components/TrafficList';
import { DetailPanel } from '@/components/DetailPanel';
import { RulesPanel } from '@/components/rules';
import { BreakpointsPanel } from '@/components/breakpoints';
import { SettingsPanel } from '@/components/SettingsPanel';
import { NetworkConditionPanel } from '@/components/NetworkConditionPanel';
import { Toaster, toast } from '@/components/ui/Toaster';
import { CommandPalette } from '@/components/CommandPalette';
import { KeyboardShortcutsHelp } from '@/components/KeyboardShortcutsHelp';
import { MobileNav } from '@/components/MobileNav';
import { WaterfallChart } from '@/components/WaterfallChart';
import { DashboardView } from '@/components/dashboard';
import { CompareModal } from '@/components/compare';
import { useSocketConnection } from '@/hooks/useSocket';
import { useSelectedEntry, useTrafficStore } from '@/stores/trafficStore';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useTheme } from '@/hooks/useTheme';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useViewStore } from '@/stores/viewStore';
import type { NetworkProfile } from '@/services/api';

export default function App() {
  const { isConnected, proxyConfig } = useSocketConnection();
  const selectedEntry = useSelectedEntry();
  const { entries, setSelected, clearEntries } = useTrafficStore();
  const { mode: viewMode, setMode: setViewMode } = useViewStore();

  const [showRules, setShowRules] = useState(false);
  const [showBreakpoints, setShowBreakpoints] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNetwork, setShowNetwork] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [activeNetworkProfile, setActiveNetworkProfile] = useState<NetworkProfile | null>(null);
  const [mobileTab, setMobileTab] = useState<'traffic' | 'rules' | 'breakpoints' | 'settings' | 'waterfall'>('traffic');

  const searchInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

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
    if (showCommandPalette) {
      setShowCommandPalette(false);
    } else if (showShortcutsHelp) {
      setShowShortcutsHelp(false);
    } else if (showSettings) {
      setShowSettings(false);
    } else if (showBreakpoints) {
      setShowBreakpoints(false);
    } else if (showNetwork) {
      setShowNetwork(false);
    } else if (selectedEntry) {
      setSelected(null);
    } else if (showRules) {
      setShowRules(false);
    }
  }, [showCommandPalette, showShortcutsHelp, showSettings, showBreakpoints, showNetwork, selectedEntry, showRules, setSelected]);

  const handleClearTraffic = useCallback(() => {
    clearEntries();
    toast.success('Traffic cleared');
  }, [clearEntries]);

  // Register keyboard shortcuts
  useKeyboardShortcuts({
    onOpenCommandPalette: () => setShowCommandPalette(true),
    onFocusSearch: () => searchInputRef.current?.focus(),
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

    // Desktop: Multi-panel layout
    return (
      <>
        {/* Traffic List or Waterfall */}
        <div
          className={`flex flex-col ${
            selectedEntry ? (showRules ? 'w-1/3' : 'w-1/2') : showRules ? 'flex-1' : 'w-full'
          } border-r border-gray-700`}
        >
          {viewMode === 'waterfall' ? (
            <WaterfallChart />
          ) : (
            <TrafficList searchInputRef={searchInputRef} />
          )}
        </div>

        {/* Detail Panel */}
        {selectedEntry && (
          <div className={showRules ? 'w-1/3' : 'w-1/2'}>
            <DetailPanel />
          </div>
        )}

        {/* Rules Panel */}
        {showRules && <RulesPanel onClose={() => setShowRules(false)} />}
      </>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-gray-100">
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
        onOpenCommandPalette={() => setShowCommandPalette(true)}
        onOpenCompare={() => setShowCompare(true)}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Filter Bar - Hidden on mobile when not on traffic view, and hidden in dashboard */}
      {viewMode !== 'dashboard' && (!isMobile || mobileTab === 'traffic') && (
        <FilterBar searchInputRef={searchInputRef} />
      )}

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

      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onNavigate={handleCommandNavigate}
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
