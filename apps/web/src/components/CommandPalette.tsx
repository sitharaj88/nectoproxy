import { Command } from 'cmdk';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Settings,
  FileCode,
  Pause,
  Trash2,
  Download,
  Upload,
  Wifi,
  Filter,
  AlertCircle,
  Globe,
  Zap,
  Clock,
  List,
  BarChart3,
} from 'lucide-react';
import { Kbd } from '@/components/ui';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (action: string) => void;
}

interface CommandItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  group: string;
}

const COMMANDS: CommandItem[] = [
  // Navigation
  { id: 'settings', label: 'Open Settings', icon: <Settings className="w-4 h-4" />, shortcut: '⌘,', group: 'Navigation' },
  { id: 'rules', label: 'Toggle Rules Panel', icon: <FileCode className="w-4 h-4" />, shortcut: '⌘⇧R', group: 'Navigation' },
  { id: 'breakpoints', label: 'Toggle Breakpoints', icon: <Pause className="w-4 h-4" />, shortcut: '⌘⇧B', group: 'Navigation' },
  { id: 'network', label: 'Network Conditioning', icon: <Wifi className="w-4 h-4" />, group: 'Navigation' },
  { id: 'global-search', label: 'Search Across All Sessions', icon: <Search className="w-4 h-4" />, shortcut: '⌘⇧F', group: 'Navigation' },

  // Actions
  { id: 'clear', label: 'Clear Traffic', icon: <Trash2 className="w-4 h-4" />, shortcut: '⌘⇧X', group: 'Actions' },
  { id: 'export', label: 'Export as HAR', icon: <Download className="w-4 h-4" />, shortcut: '⌘E', group: 'Actions' },
  { id: 'import', label: 'Import HAR', icon: <Upload className="w-4 h-4" />, group: 'Actions' },

  // Quick Filters
  { id: 'filter-errors', label: 'Show Errors Only', icon: <AlertCircle className="w-4 h-4" />, group: 'Quick Filters' },
  { id: 'filter-xhr', label: 'Show XHR/Fetch', icon: <Globe className="w-4 h-4" />, group: 'Quick Filters' },
  { id: 'filter-slow', label: 'Show Slow Requests (>1s)', icon: <Clock className="w-4 h-4" />, group: 'Quick Filters' },
  { id: 'filter-websocket', label: 'Show WebSockets', icon: <Zap className="w-4 h-4" />, group: 'Quick Filters' },
  { id: 'filter-clear', label: 'Clear All Filters', icon: <Filter className="w-4 h-4" />, group: 'Quick Filters' },

  // Views
  { id: 'view-list', label: 'List View', icon: <List className="w-4 h-4" />, group: 'Views' },
  { id: 'view-waterfall', label: 'Waterfall View', icon: <BarChart3 className="w-4 h-4" />, group: 'Views' },
];

export function CommandPalette({ isOpen, onClose, onNavigate }: CommandPaletteProps) {
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
    }
  }, [isOpen]);

  const handleSelect = (id: string) => {
    onNavigate(id);
    onClose();
  };

  // Group commands
  const groups = COMMANDS.reduce((acc, cmd) => {
    if (!acc[cmd.group]) acc[cmd.group] = [];
    acc[cmd.group].push(cmd);
    return acc;
  }, {} as Record<string, CommandItem[]>);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/50"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className="w-[560px] overflow-hidden rounded-md bg-surface-overlay border border-edge shadow-popover"
            onClick={(e) => e.stopPropagation()}
          >
            <Command
              className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-ink-muted"
              loop
            >
              {/* Search Input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-edge">
                <Search className="w-5 h-5 text-ink-faint" />
                <Command.Input
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Type a command or search..."
                  className="flex-1 bg-transparent text-ink placeholder:text-ink-faint outline-none text-sm"
                  autoFocus
                />
                <Kbd>Esc</Kbd>
              </div>

              {/* Commands List */}
              <Command.List className="max-h-[400px] overflow-y-auto p-2">
                <Command.Empty className="py-6 text-center text-sm text-ink-muted">
                  No results found.
                </Command.Empty>

                {Object.entries(groups).map(([group, items]) => (
                  <Command.Group key={group} heading={group}>
                    {items.map((item) => (
                      <Command.Item
                        key={item.id}
                        value={item.label}
                        onSelect={() => handleSelect(item.id)}
                        className="flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer text-ink-secondary hover:bg-surface-raised hover:text-ink aria-selected:bg-surface-raised aria-selected:text-ink"
                      >
                        <span className="text-ink-muted">{item.icon}</span>
                        <span className="flex-1 text-sm">{item.label}</span>
                        {item.shortcut && <Kbd>{item.shortcut}</Kbd>}
                      </Command.Item>
                    ))}
                  </Command.Group>
                ))}
              </Command.List>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
