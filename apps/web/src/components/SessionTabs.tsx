import { X, Circle, FileDown } from 'lucide-react';
import { useSessionStore } from '@/stores/sessionStore';
import { useTrafficStore } from '@/stores/trafficStore';

export function SessionTabs() {
  const { tabs, activeTabId, setActiveTab, closeTab } = useSessionStore();
  const { removeSessionEntries, setSelected } = useTrafficStore();

  if (tabs.length <= 1) return null;

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    closeTab(tabId);
    removeSessionEntries(tabId);
    setSelected(null);
  };

  const handleSwitchTab = (tabId: string) => {
    if (tabId !== activeTabId) {
      setSelected(null);
      setActiveTab(tabId);
    }
  };

  return (
    <div className="flex items-center bg-surface-raised border-b border-edge px-2 overflow-x-auto">
      {tabs.map((tab) => (
        <div key={tab.id} className="relative flex items-center shrink-0">
          <button
            onClick={() => handleSwitchTab(tab.id)}
            aria-current={activeTabId === tab.id ? 'true' : undefined}
            className={`flex items-center gap-1.5 py-1.5 pl-3 text-sm border-b-2 whitespace-nowrap transition-colors ${
              tab.type === 'imported' ? 'pr-8' : 'pr-3'
            } ${
              activeTabId === tab.id
                ? 'border-accent text-ink bg-surface-overlay'
                : 'border-transparent text-ink-muted hover:text-ink hover:bg-surface'
            }`}
          >
            {tab.type === 'live' ? (
              <Circle className="w-2.5 h-2.5 fill-success text-success shrink-0" />
            ) : (
              <FileDown className="w-3.5 h-3.5 text-info shrink-0" />
            )}
            <span className="max-w-[200px] truncate">{tab.name}</span>
          </button>
          {tab.type === 'imported' && (
            <button
              type="button"
              onClick={(e) => handleCloseTab(e, tab.id)}
              aria-label={`Close ${tab.name}`}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center justify-center rounded p-0.5 text-ink-faint hover:text-ink hover:bg-surface-raised transition-colors"
            >
              <X className="w-3.5 h-3.5 shrink-0" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
