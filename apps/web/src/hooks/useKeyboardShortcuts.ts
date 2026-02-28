import { useHotkeys } from 'react-hotkeys-hook';

interface ShortcutHandlers {
  onOpenCommandPalette?: () => void;
  onFocusSearch?: () => void;
  onOpenGlobalSearch?: () => void;
  onOpenSettings?: () => void;
  onToggleRules?: () => void;
  onToggleBreakpoints?: () => void;
  onNavigateUp?: () => void;
  onNavigateDown?: () => void;
  onSelectEntry?: () => void;
  onClosePanel?: () => void;
  onShowShortcuts?: () => void;
  onClearTraffic?: () => void;
  onExportHar?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  // Command Palette - Cmd/Ctrl + K
  useHotkeys('mod+k', (e) => {
    e.preventDefault();
    handlers.onOpenCommandPalette?.();
  }, { enableOnFormTags: false });

  // Focus Search - Cmd/Ctrl + F
  useHotkeys('mod+f', (e) => {
    e.preventDefault();
    handlers.onFocusSearch?.();
  }, { enableOnFormTags: false });

  // Global Search - Cmd/Ctrl + Shift + F
  useHotkeys('mod+shift+f', (e) => {
    e.preventDefault();
    handlers.onOpenGlobalSearch?.();
  }, { enableOnFormTags: false });

  // Settings - Cmd/Ctrl + ,
  useHotkeys('mod+comma', (e) => {
    e.preventDefault();
    handlers.onOpenSettings?.();
  }, { enableOnFormTags: false });

  // Toggle Rules - Cmd/Ctrl + Shift + R
  useHotkeys('mod+shift+r', (e) => {
    e.preventDefault();
    handlers.onToggleRules?.();
  }, { enableOnFormTags: false });

  // Toggle Breakpoints - Cmd/Ctrl + Shift + B
  useHotkeys('mod+shift+b', (e) => {
    e.preventDefault();
    handlers.onToggleBreakpoints?.();
  }, { enableOnFormTags: false });

  // Navigate Up - K or Arrow Up
  useHotkeys('k, up', (e) => {
    if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
      e.preventDefault();
      handlers.onNavigateUp?.();
    }
  }, { enableOnFormTags: false });

  // Navigate Down - J or Arrow Down
  useHotkeys('j, down', (e) => {
    if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
      e.preventDefault();
      handlers.onNavigateDown?.();
    }
  }, { enableOnFormTags: false });

  // Select Entry - Enter
  useHotkeys('enter', (e) => {
    if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
      e.preventDefault();
      handlers.onSelectEntry?.();
    }
  }, { enableOnFormTags: false });

  // Close Panel - Escape
  useHotkeys('escape', (e) => {
    e.preventDefault();
    handlers.onClosePanel?.();
  }, { enableOnFormTags: true });

  // Show Shortcuts - ?
  useHotkeys('shift+/', (e) => {
    if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
      e.preventDefault();
      handlers.onShowShortcuts?.();
    }
  }, { enableOnFormTags: false });

  // Clear Traffic - Cmd/Ctrl + Shift + X
  useHotkeys('mod+shift+x', (e) => {
    e.preventDefault();
    handlers.onClearTraffic?.();
  }, { enableOnFormTags: false });

  // Export HAR - Cmd/Ctrl + E
  useHotkeys('mod+e', (e) => {
    e.preventDefault();
    handlers.onExportHar?.();
  }, { enableOnFormTags: false });
}

export const KEYBOARD_SHORTCUTS = [
  { key: '⌘/Ctrl + K', description: 'Open command palette' },
  { key: '⌘/Ctrl + F', description: 'Focus search' },
  { key: '⌘/Ctrl + Shift + F', description: 'Global search across sessions' },
  { key: '⌘/Ctrl + ,', description: 'Open settings' },
  { key: '⌘/Ctrl + Shift + R', description: 'Toggle rules panel' },
  { key: '⌘/Ctrl + Shift + B', description: 'Toggle breakpoints' },
  { key: 'J / ↓', description: 'Navigate down in list' },
  { key: 'K / ↑', description: 'Navigate up in list' },
  { key: 'Enter', description: 'Select entry' },
  { key: 'Escape', description: 'Close panel / Clear selection' },
  { key: '?', description: 'Show keyboard shortcuts' },
  { key: '⌘/Ctrl + Shift + X', description: 'Clear traffic' },
  { key: '⌘/Ctrl + E', description: 'Export as HAR' },
];
