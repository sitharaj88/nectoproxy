import { X, Keyboard } from 'lucide-react';
import { KEYBOARD_SHORTCUTS } from '@/hooks/useKeyboardShortcuts';
import { motion, AnimatePresence } from 'framer-motion';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="bg-gray-800 rounded-lg shadow-xl w-[500px] max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-semibold text-white">Keyboard Shortcuts</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-white rounded hover:bg-gray-700"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Shortcuts List */}
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="space-y-2">
                {KEYBOARD_SHORTCUTS.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 px-3 rounded hover:bg-gray-700/50"
                  >
                    <span className="text-gray-300">{shortcut.description}</span>
                    <kbd className="px-2 py-1 text-xs font-mono bg-gray-900 text-gray-300 rounded border border-gray-600">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-700 bg-gray-900/50">
              <p className="text-xs text-gray-500 text-center">
                Press <kbd className="px-1 py-0.5 text-xs font-mono bg-gray-800 rounded">Esc</kbd> to close
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
