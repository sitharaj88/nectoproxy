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
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-400 tabular-nums">
          {selectedIds.length}/2
        </span>
        <button
          onClick={onOpenCompare}
          disabled={!canCompare()}
          className={`p-1.5 rounded transition-colors ${
            canCompare()
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
          title={canCompare() ? 'Compare selected' : 'Select 2 requests to compare'}
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={exitCompareMode}
          className="p-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
          title="Exit compare mode"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={enterCompareMode}
      className="p-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
      title="Compare requests"
    >
      <ArrowLeftRight className="w-3.5 h-3.5" />
    </button>
  );
}
