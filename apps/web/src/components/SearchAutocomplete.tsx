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
import { Badge, Button, IconButton, Input, Kbd, cn, type BadgeProps } from '@/components/ui';

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

    const getTypeTone = (type: SearchSuggestion['type']): BadgeProps['tone'] => {
      switch (type) {
        case 'recent':
          return 'neutral';
        case 'host':
          return 'info';
        case 'path':
          return 'success';
        case 'filter':
          return 'accent';
        default:
          return 'neutral';
      }
    };

    return (
      <div ref={containerRef} className={cn('relative', className)}>
        <div className="relative">
          <Input
            ref={ref}
            type="text"
            sizeVariant="md"
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            leftIcon={<Search className="w-4 h-4" />}
            className="pr-8"
            aria-label="Search traffic"
            aria-expanded={isOpen}
            aria-autocomplete="list"
            aria-controls="search-suggestions"
            role="combobox"
          />
          {value && (
            <IconButton
              label="Clear search"
              tooltip={false}
              icon={<X className="w-4 h-4" />}
              onClick={handleClear}
              className="absolute right-0.5 top-1/2 -translate-y-1/2"
            />
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
              className="absolute z-50 w-full mt-1 bg-surface-overlay border border-edge rounded-md shadow-popover overflow-hidden"
            >
              {/* Group by type */}
              {suggestions.some((s) => s.type === 'recent') && (
                <div className="px-3 py-1.5 flex items-center justify-between border-b border-edge">
                  <span className="text-xs font-medium text-ink-muted uppercase tracking-wider">
                    Recent
                  </span>
                  <Button variant="ghost" size="xs" onClick={handleClearRecent}>
                    Clear
                  </Button>
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
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
                      isSelected ? 'bg-surface-raised' : 'hover:bg-surface-raised'
                    )}
                  >
                    <Icon className="w-4 h-4 text-ink-faint flex-shrink-0" />
                    <span className="flex-1 text-sm text-ink truncate">
                      {suggestion.label}
                    </span>
                    <Badge tone={getTypeTone(suggestion.type)}>
                      {getTypeLabel(suggestion.type)}
                    </Badge>
                  </button>
                );
              })}

              {/* Help text */}
              <div className="px-3 py-2 border-t border-edge flex items-center gap-2 text-[10px] text-ink-muted">
                <Kbd>↑↓</Kbd>
                <span>Navigate</span>
                <Kbd>↵</Kbd>
                <span>Select</span>
                <Kbd>esc</Kbd>
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
