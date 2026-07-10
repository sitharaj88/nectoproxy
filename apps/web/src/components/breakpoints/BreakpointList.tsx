import { Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import type { Breakpoint } from '@nectoproxy/shared';
import { Badge, Button, IconButton, Switch, Tooltip, EmptyState, cn } from '@/components/ui';

interface BreakpointListProps {
  breakpoints: Breakpoint[];
  onToggle: (id: string) => void;
  onEdit: (breakpoint: Breakpoint) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

export function BreakpointList({
  breakpoints,
  onToggle,
  onEdit,
  onDelete,
  onAdd,
}: BreakpointListProps) {
  return (
    <div className="p-4">
      {/* Add button */}
      <div className="mb-4">
        <Button variant="primary" size="md" onClick={onAdd}>
          <Plus className="w-4 h-4" aria-hidden="true" />
          Add Breakpoint
        </Button>
      </div>

      {/* Breakpoints list */}
      {breakpoints.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="No breakpoints configured"
          description="Add a breakpoint to pause requests and inspect them"
        />
      ) : (
        <div className="space-y-2">
          {breakpoints.map((bp) => (
            <div
              key={bp.id}
              className={cn(
                'p-4 rounded-md border',
                bp.enabled
                  ? 'bg-surface-raised border-edge'
                  : 'bg-surface border-edge-subtle opacity-60'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Enable toggle */}
                  <Switch
                    checked={bp.enabled}
                    onCheckedChange={() => onToggle(bp.id)}
                    aria-label={bp.enabled ? 'Disable breakpoint' : 'Enable breakpoint'}
                  />

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-ink">{bp.name}</span>
                      <Badge
                        tone={
                          bp.type === 'request'
                            ? 'success'
                            : bp.type === 'response'
                            ? 'accent'
                            : 'info'
                        }
                      >
                        {bp.type}
                      </Badge>
                      {bp.conditions && bp.conditions.length > 0 && (
                        <Tooltip
                          content={`${bp.conditions.length} condition${bp.conditions.length > 1 ? 's' : ''} (${bp.conditionLogic || 'and'})`}
                        >
                          <span className="inline-flex">
                            <Badge tone="warn">
                              {bp.conditions.length} condition{bp.conditions.length > 1 ? 's' : ''}
                            </Badge>
                          </span>
                        </Tooltip>
                      )}
                    </div>
                    <div className="text-sm text-ink-muted mt-1">
                      {formatMatcher(bp.match)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <IconButton
                    label="Edit"
                    icon={<Pencil className="w-4 h-4" />}
                    onClick={() => onEdit(bp)}
                  />
                  <IconButton
                    label="Delete"
                    icon={<Trash2 className="w-4 h-4" />}
                    onClick={() => onDelete(bp.id)}
                    className="hover:!text-danger"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatMatcher(match: Breakpoint['match']): string {
  const parts: string[] = [];

  if (match.url) {
    const urlStr = typeof match.url === 'string' ? match.url : match.url.source;
    parts.push(`URL: ${urlStr}`);
  }
  if (match.method) {
    const methodStr = Array.isArray(match.method) ? match.method.join(', ') : match.method;
    parts.push(`Method: ${methodStr}`);
  }
  if (match.host) {
    parts.push(`Host: ${match.host}`);
  }
  if (match.path) {
    const pathStr = typeof match.path === 'string' ? match.path : match.path.source;
    parts.push(`Path: ${pathStr}`);
  }

  return parts.length > 0 ? parts.join(' | ') : 'Match all requests';
}
