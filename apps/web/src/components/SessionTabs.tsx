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
    <div className="flex items-center bg-gray-800 border-b border-gray-700 px-2 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => handleSwitchTab(tab.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm border-b-2 whitespace-nowrap transition-colors ${
            activeTabId === tab.id
              ? 'border-primary-500 text-white bg-gray-700/50'
              : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-700/30'
          }`}
        >
          {tab.type === 'live' ? (
            <Circle className="w-2.5 h-2.5 fill-green-400 text-green-400 shrink-0" />
          ) : (
            <FileDown className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          )}
          <span className="max-w-[200px] truncate">{tab.name}</span>
          {tab.type === 'imported' && (
            <X
              className="w-3.5 h-3.5 text-gray-500 hover:text-gray-200 shrink-0"
              onClick={(e) => handleCloseTab(e, tab.id)}
            />
          )}
        </button>
      ))}
    </div>
  );
}
