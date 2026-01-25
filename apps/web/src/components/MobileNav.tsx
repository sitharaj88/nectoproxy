import { List, FileCode, Pause, Settings, BarChart3 } from 'lucide-react';

interface MobileNavProps {
  activeTab: 'traffic' | 'rules' | 'breakpoints' | 'settings' | 'waterfall';
  onTabChange: (tab: 'traffic' | 'rules' | 'breakpoints' | 'settings' | 'waterfall') => void;
  breakpointCount?: number;
}

export function MobileNav({ activeTab, onTabChange, breakpointCount = 0 }: MobileNavProps) {
  const tabs = [
    { id: 'traffic' as const, icon: List, label: 'Traffic' },
    { id: 'waterfall' as const, icon: BarChart3, label: 'Waterfall' },
    { id: 'rules' as const, icon: FileCode, label: 'Rules' },
    { id: 'breakpoints' as const, icon: Pause, label: 'Breakpoints', badge: breakpointCount },
    { id: 'settings' as const, icon: Settings, label: 'Settings' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 z-40 sm:hidden">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors relative ${
                isActive
                  ? 'text-blue-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {tab.badge && tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center">
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 font-medium">{tab.label}</span>

              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-blue-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
