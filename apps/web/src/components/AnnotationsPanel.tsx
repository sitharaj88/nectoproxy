import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Annotation, AnnotationCreateInput } from '@proxyscope/shared';
import { getAnnotations, createAnnotation, deleteAnnotation } from '@/services/api';

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
      <div className="flex items-center justify-center py-12 text-gray-500 text-sm">
        Loading notes...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-300">
          Notes{' '}
          {annotations.length > 0 && (
            <span className="text-gray-500">({annotations.length})</span>
          )}
        </h3>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Note
          </button>
        )}
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 space-y-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write a note..."
            rows={3}
            className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            autoFocus
          />

          {/* Color Picker */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Color:</span>
            <div className="flex gap-1.5">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  className={`w-5 h-5 rounded-full ${c.bg} ${
                    color === c.value ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-800' : 'opacity-60 hover:opacity-100'
                  } transition-opacity`}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Tags */}
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="Tags (comma-separated)"
            className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setShowForm(false);
                setContent('');
                setColor('gray');
                setTagsInput('');
              }}
              className="px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!content.trim() || submitting}
              className="px-3 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Annotations List */}
      {annotations.length === 0 && !showForm ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          No notes yet. Click "Add Note" to create one.
        </div>
      ) : (
        <div className="space-y-2">
          {annotations.map((annotation) => {
            const colorClasses = getColorClasses(annotation.color);
            return (
              <div
                key={annotation.id}
                className={`bg-gray-800 border-l-2 ${colorClasses.border} rounded-r-md p-3 group`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-gray-200 whitespace-pre-wrap flex-1">
                    {annotation.content}
                  </p>
                  <button
                    onClick={() => handleDelete(annotation.id)}
                    className="p-1 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {annotation.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {annotation.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="px-1.5 py-0.5 text-[10px] bg-gray-700 text-gray-400 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="text-[10px] text-gray-600 mt-1">
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
