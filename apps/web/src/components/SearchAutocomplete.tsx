import { useState, useRef, useEffect, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Clock,
  Globe,
  FileText,
  Filter,
  CheckCircle,
  AlertCircle,
  XCircle,
  Code,
  Image,
  X,
} from 'lucide-react';
import { useSearchSuggestions, addRecentSearch, clearRecentSearches, type SearchSuggestion } from '@/hooks/useSearchSuggestions';

interface SearchAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const iconMap: Record<string, React.ElementType> = {
  history: Clock,
  globe: Globe,
  file: FileText,
  filter: Filter,
  check: CheckCircle,
  alert: AlertCircle,
  error: XCircle,
  method: Filter,
  clock: Clock,
  size: FileText,
  code: Code,
  image: Image,
};

export const SearchAutocomplete = forwardRef<HTMLInputElement, SearchAutocompleteProps>(
  ({ value, onChange, onSearch, placeholder = 'Search...', className = '' }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const suggestions = useSearchSuggestions(value);

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Reset selection when suggestions change
    useEffect(() => {
      setSelectedIndex(0);
    }, [suggestions]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!isOpen || suggestions.length === 0) {
        if (e.key === 'Enter') {
          handleSubmit();
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => (i < suggestions.length - 1 ? i + 1 : 0));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => (i > 0 ? i - 1 : suggestions.length - 1));
          break;
        case 'Enter':
          e.preventDefault();
          if (suggestions[selectedIndex]) {
            selectSuggestion(suggestions[selectedIndex]);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          break;
      }
    };

    const selectSuggestion = (suggestion: SearchSuggestion) => {
      onChange(suggestion.value);
      addRecentSearch(suggestion.value);
      onSearch(suggestion.value);
      setIsOpen(false);
    };

    const handleSubmit = () => {
      if (value.trim()) {
        addRecentSearch(value.trim());
        onSearch(value.trim());
      }
      setIsOpen(false);
    };

    const handleClear = () => {
      onChange('');
      onSearch('');
    };

    const handleClearRecent = (e: React.MouseEvent) => {
      e.stopPropagation();
      clearRecentSearches();
      // Force re-render by briefly closing/opening
      setIsOpen(false);
      setTimeout(() => setIsOpen(true), 0);
    };

    const getTypeLabel = (type: SearchSuggestion['type']) => {
      switch (type) {
        case 'recent':
          return 'Recent';
        case 'host':
          return 'Host';
        case 'path':
          return 'Path';
        case 'filter':
          return 'Filter';
        default:
          return '';
      }
    };

    const getTypeColor = (type: SearchSuggestion['type']) => {
      switch (type) {
        case 'recent':
          return 'bg-gray-600 text-gray-300';
        case 'host':
          return 'bg-blue-600/30 text-blue-400';
        case 'path':
          return 'bg-green-600/30 text-green-400';
        case 'filter':
          return 'bg-purple-600/30 text-purple-400';
        default:
          return 'bg-gray-600 text-gray-300';
      }
    };

    return (
      <div ref={containerRef} className={`relative ${className}`}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            ref={ref}
            type="text"
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full pl-9 pr-8 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label="Search traffic"
            aria-expanded={isOpen}
            aria-autocomplete="list"
            aria-controls="search-suggestions"
            role="combobox"
          />
          {value && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <AnimatePresence>
          {isOpen && suggestions.length > 0 && (
            <motion.div
              id="search-suggestions"
              role="listbox"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden"
            >
              {/* Group by type */}
              {suggestions.some((s) => s.type === 'recent') && (
                <div className="px-3 py-1.5 flex items-center justify-between border-b border-gray-700">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recent
                  </span>
                  <button
                    onClick={handleClearRecent}
                    className="text-xs text-gray-500 hover:text-gray-300"
                  >
                    Clear
                  </button>
                </div>
              )}

              {suggestions.map((suggestion, index) => {
                const Icon = iconMap[suggestion.icon || 'filter'] || Filter;
                const isSelected = index === selectedIndex;

                return (
                  <button
                    key={`${suggestion.type}-${suggestion.value}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => selectSuggestion(suggestion)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                      isSelected ? 'bg-gray-700' : 'hover:bg-gray-700/50'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span className="flex-1 text-sm text-gray-200 truncate">
                      {suggestion.label}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${getTypeColor(
                        suggestion.type
                      )}`}
                    >
                      {getTypeLabel(suggestion.type)}
                    </span>
                  </button>
                );
              })}

              {/* Help text */}
              <div className="px-3 py-2 border-t border-gray-700 flex items-center gap-2 text-[10px] text-gray-500">
                <span className="px-1 py-0.5 bg-gray-700 rounded">↑↓</span>
                <span>Navigate</span>
                <span className="px-1 py-0.5 bg-gray-700 rounded">↵</span>
                <span>Select</span>
                <span className="px-1 py-0.5 bg-gray-700 rounded">esc</span>
                <span>Close</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

SearchAutocomplete.displayName = 'SearchAutocomplete';
