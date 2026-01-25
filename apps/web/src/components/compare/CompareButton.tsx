import { ArrowLeftRight, X } from 'lucide-react';
import { useCompareStore } from '@/stores/compareStore';

interface CompareButtonProps {
  onOpenCompare: () => void;
}

export function CompareButton({ onOpenCompare }: CompareButtonProps) {
  const { isCompareMode, selectedIds, enterCompareMode, exitCompareMode, canCompare } =
    useCompareStore();

  if (isCompareMode) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400">
          {selectedIds.length}/2 selected
        </span>
        <button
          onClick={onOpenCompare}
          disabled={!canCompare()}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            canCompare()
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          <ArrowLeftRight className="w-4 h-4" />
          Compare
        </button>
        <button
          onClick={exitCompareMode}
          className="p-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
          title="Exit compare mode"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={enterCompareMode}
      className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm transition-colors"
      title="Compare requests"
    >
      <ArrowLeftRight className="w-4 h-4" />
      <span className="hidden sm:inline">Compare</span>
    </button>
  );
}
