import { useMemo } from 'react';
import { useCompareStore } from '@/stores/compareStore';
import { useTrafficStore } from '@/stores/trafficStore';
import { DiffViewer } from './DiffViewer';

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CompareModal({ isOpen, onClose }: CompareModalProps) {
  const { selectedIds, exitCompareMode } = useCompareStore();
  const entries = useTrafficStore((state) => state.entries);
  const importedEntries = useTrafficStore((state) => state.importedEntries);

  const [leftEntry, rightEntry] = useMemo(() => {
    // Search in both live and imported entries
    const allEntries = [
      ...entries,
      ...Object.values(importedEntries).flat(),
    ];
    const left = allEntries.find((e) => e.id === selectedIds[0]);
    const right = allEntries.find((e) => e.id === selectedIds[1]);
    return [left, right];
  }, [entries, importedEntries, selectedIds]);

  const handleClose = () => {
    exitCompareMode();
    onClose();
  };

  if (!isOpen || !leftEntry || !rightEntry) return null;

  return (
    <DiffViewer
      leftEntry={leftEntry}
      rightEntry={rightEntry}
      onClose={handleClose}
    />
  );
}
