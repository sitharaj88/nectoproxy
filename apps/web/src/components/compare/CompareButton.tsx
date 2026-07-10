import { ArrowLeftRight, X } from 'lucide-react';
import { useCompareStore } from '@/stores/compareStore';
import { IconButton } from '@/components/ui';

interface CompareButtonProps {
  onOpenCompare: () => void;
}

export function CompareButton({ onOpenCompare }: CompareButtonProps) {
  const { isCompareMode, selectedIds, enterCompareMode, exitCompareMode, canCompare } =
    useCompareStore();

  if (isCompareMode) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs text-ink-muted tabular-nums">
          {selectedIds.length}/2
        </span>
        <IconButton
          label={canCompare() ? 'Compare selected' : 'Select 2 requests to compare'}
          icon={<ArrowLeftRight className="w-3.5 h-3.5" />}
          onClick={onOpenCompare}
          disabled={!canCompare()}
          variant={canCompare() ? 'primary' : 'secondary'}
        />
        <IconButton
          label="Exit compare mode"
          icon={<X className="w-3.5 h-3.5" />}
          onClick={exitCompareMode}
          variant="secondary"
        />
      </div>
    );
  }

  return (
    <IconButton
      label="Compare requests"
      icon={<ArrowLeftRight className="w-3.5 h-3.5" />}
      onClick={enterCompareMode}
      variant="secondary"
    />
  );
}
