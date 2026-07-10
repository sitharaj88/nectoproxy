import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Annotation, AnnotationCreateInput } from '@nectoproxy/shared';
import { getAnnotations, createAnnotation, deleteAnnotation } from '@/services/api';
import { Button, IconButton, Input, Card, EmptyState } from '@/components/ui';

interface AnnotationsPanelProps {
  trafficId: string;
}

const COLORS: Array<{ value: Annotation['color']; label: string; border: string; bg: string }> = [
  { value: 'gray', label: 'Gray', border: 'border-gray-400', bg: 'bg-gray-400' },
  { value: 'red', label: 'Red', border: 'border-red-400', bg: 'bg-red-400' },
  { value: 'orange', label: 'Orange', border: 'border-orange-400', bg: 'bg-orange-400' },
  { value: 'yellow', label: 'Yellow', border: 'border-yellow-400', bg: 'bg-yellow-400' },
  { value: 'green', label: 'Green', border: 'border-green-400', bg: 'bg-green-400' },
  { value: 'blue', label: 'Blue', border: 'border-blue-400', bg: 'bg-blue-400' },
  { value: 'purple', label: 'Purple', border: 'border-purple-400', bg: 'bg-purple-400' },
];

function getColorClasses(color: Annotation['color']): { border: string; bg: string } {
  const found = COLORS.find((c) => c.value === color);
  return found || { border: 'border-gray-400', bg: 'bg-gray-400' };
}

export function AnnotationsPanel({ trafficId }: AnnotationsPanelProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState('');
  const [color, setColor] = useState<Annotation['color']>('gray');
  const [tagsInput, setTagsInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadAnnotations = useCallback(async () => {
    try {
      const result = await getAnnotations(trafficId);
      setAnnotations(result.annotations);
    } catch (err) {
      console.error('Failed to load annotations:', err);
    } finally {
      setLoading(false);
    }
  }, [trafficId]);

  useEffect(() => {
    setLoading(true);
    setAnnotations([]);
    loadAnnotations();
  }, [loadAnnotations]);

  const handleAdd = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      const input: AnnotationCreateInput = {
        trafficId,
        content: content.trim(),
        color,
        tags: tagsInput
          .split(',')
          .map((t) => t.trim())
          .filter((t) => t.length > 0),
      };
      await createAnnotation(input);
      setContent('');
      setColor('gray');
      setTagsInput('');
      setShowForm(false);
      await loadAnnotations();
    } catch (err) {
      console.error('Failed to create annotation:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAnnotation(id);
      setAnnotations((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error('Failed to delete annotation:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-ink-muted text-sm">
        Loading notes...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-ink-secondary">
          Notes{' '}
          {annotations.length > 0 && (
            <span className="text-ink-muted">({annotations.length})</span>
          )}
        </h3>
        {!showForm && (
          <Button variant="ghost" size="xs" onClick={() => setShowForm(true)}>
            <Plus className="w-3.5 h-3.5" />
            Add Note
          </Button>
        )}
      </div>

      {/* Add Form */}
      {showForm && (
        <Card className="p-3 space-y-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write a note..."
            rows={3}
            className="w-full bg-canvas border border-edge rounded-md px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent resize-none"
            autoFocus
          />

          {/* Color Picker */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-secondary">Color:</span>
            <div className="flex gap-1.5">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  className={`w-5 h-5 rounded-full ${c.bg} ${
                    color === c.value ? 'ring-2 ring-white ring-offset-1 ring-offset-surface-raised' : 'opacity-60 hover:opacity-100'
                  } transition-opacity`}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Tags */}
          <Input
            type="text"
            sizeVariant="md"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="Tags (comma-separated)"
          />

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowForm(false);
                setContent('');
                setColor('gray');
                setTagsInput('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleAdd}
              disabled={!content.trim() || submitting}
            >
              {submitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </Card>
      )}

      {/* Annotations List */}
      {annotations.length === 0 && !showForm ? (
        <EmptyState
          compact
          title="No notes yet"
          description={'Click "Add Note" to create one.'}
        />
      ) : (
        <div className="space-y-2">
          {annotations.map((annotation) => {
            const colorClasses = getColorClasses(annotation.color);
            return (
              <div
                key={annotation.id}
                className={`bg-surface-raised border-l-2 ${colorClasses.border} rounded-r-md p-3 group`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-ink whitespace-pre-wrap flex-1">
                    {annotation.content}
                  </p>
                  <IconButton
                    label="Delete"
                    variant="danger"
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                    onClick={() => handleDelete(annotation.id)}
                    className="opacity-0 group-hover:opacity-100 flex-shrink-0"
                  />
                </div>
                {annotation.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {annotation.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="px-1.5 py-0.5 text-[10px] bg-surface-overlay text-ink-secondary rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="text-[10px] text-ink-faint mt-1">
                  {new Date(annotation.createdAt).toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
