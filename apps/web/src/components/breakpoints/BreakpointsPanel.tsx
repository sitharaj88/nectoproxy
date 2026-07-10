import { useEffect, useState } from 'react';
import { useBreakpointStore } from '../../stores/breakpointStore';
import { getBreakpoints, createBreakpoint, deleteBreakpoint, toggleBreakpoint } from '../../services/api';
import { subscribeToBreakpoints } from '../../services/socket';
import { BreakpointList } from './BreakpointList';
import { BreakpointEditor } from './BreakpointEditor';
import { InterceptedPanel } from './InterceptedPanel';
import { Modal, Tabs, Badge, Button } from '@/components/ui';
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
        <Tabs
          size="md"
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as 'breakpoints' | 'intercepted')}
          items={[
            { value: 'breakpoints', label: `Breakpoints (${breakpoints.length})` },
            {
              value: 'intercepted',
              label: (
                <>
                  Intercepted ({pendingHits.length})
                  {pendingHits.length > 0 && (
                    <Badge tone="danger" className="ml-1">
                      {pendingHits.length}
                    </Badge>
                  )}
                </>
              ),
            },
          ]}
        />

        {error && (
          <div className="p-3 bg-danger/12 text-danger text-sm flex items-center" role="alert">
            <span className="flex-1">{error}</span>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => setError(null)}
              className="ml-2 !text-danger"
            >
              Dismiss
            </Button>
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
