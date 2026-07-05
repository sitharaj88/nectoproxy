import { useEffect, useState } from 'react';
import { useBreakpointStore } from '../../stores/breakpointStore';
import { getBreakpoints, createBreakpoint, deleteBreakpoint, toggleBreakpoint } from '../../services/api';
import { subscribeToBreakpoints } from '../../services/socket';
import { BreakpointList } from './BreakpointList';
import { BreakpointEditor } from './BreakpointEditor';
import { InterceptedPanel } from './InterceptedPanel';
import { Modal } from '../ui/Modal';
import type { BreakpointCreateInput } from '@nectoproxy/shared';

interface BreakpointsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BreakpointsPanel({ isOpen, onClose }: BreakpointsPanelProps) {
  const {
    breakpoints,
    pendingHits,
    selectedHit,
    isEditorOpen,
    editingBreakpoint,
    setBreakpoints,
    addPendingHit,
    removePendingHit,
    setEditorOpen,
    setEditingBreakpoint,
    updateBreakpoint,
    removeBreakpoint,
    addBreakpoint,
  } = useBreakpointStore();

  const [activeTab, setActiveTab] = useState<'breakpoints' | 'intercepted'>('breakpoints');
  const [error, setError] = useState<string | null>(null);

  // Load breakpoints on mount
  useEffect(() => {
    async function loadBreakpoints() {
      try {
        const response = await getBreakpoints();
        setBreakpoints(response.breakpoints);
      } catch (err) {
        setError((err as Error).message);
      }
    }
    loadBreakpoints();
  }, [setBreakpoints]);

  // Subscribe to breakpoint events
  useEffect(() => {
    const unsubscribe = subscribeToBreakpoints(
      (hit) => addPendingHit(hit),
      (id) => removePendingHit(id),
      (id) => removePendingHit(id)
    );
    return unsubscribe;
  }, [addPendingHit, removePendingHit]);

  const handleCreateBreakpoint = async (input: BreakpointCreateInput) => {
    try {
      const breakpoint = await createBreakpoint(input);
      addBreakpoint(breakpoint);
      setEditorOpen(false);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleToggleBreakpoint = async (id: string) => {
    try {
      const breakpoint = await toggleBreakpoint(id);
      updateBreakpoint(breakpoint);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDeleteBreakpoint = async (id: string) => {
    try {
      await deleteBreakpoint(id);
      removeBreakpoint(id);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Breakpoints"
      size="xl"
      maxHeight="85vh"
    >
      <div className="flex flex-col h-full">
        <div className="flex border-b border-gray-700">
          <button
            type="button"
            onClick={() => setActiveTab('breakpoints')}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'breakpoints'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
            aria-pressed={activeTab === 'breakpoints'}
          >
            Breakpoints ({breakpoints.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('intercepted')}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'intercepted'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
            aria-pressed={activeTab === 'intercepted'}
          >
            Intercepted ({pendingHits.length})
            {pendingHits.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                {pendingHits.length}
              </span>
            )}
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-900/30 text-red-400 text-sm" role="alert">
            {error}
            <button
              type="button"
              onClick={() => setError(null)}
              className="ml-2 text-red-300 hover:text-red-100"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="flex-1 overflow-auto">
          {activeTab === 'breakpoints' ? (
            <BreakpointList
              breakpoints={breakpoints}
              onToggle={handleToggleBreakpoint}
              onEdit={(bp) => {
                setEditingBreakpoint(bp);
                setEditorOpen(true);
              }}
              onDelete={handleDeleteBreakpoint}
              onAdd={() => {
                setEditingBreakpoint(null);
                setEditorOpen(true);
              }}
            />
          ) : (
            <InterceptedPanel
              hits={pendingHits}
              selectedHit={selectedHit}
            />
          )}
        </div>

        {isEditorOpen && (
          <BreakpointEditor
            breakpoint={editingBreakpoint}
            onSave={handleCreateBreakpoint}
            onClose={() => {
              setEditorOpen(false);
              setEditingBreakpoint(null);
            }}
          />
        )}
      </div>
    </Modal>
  );
}
