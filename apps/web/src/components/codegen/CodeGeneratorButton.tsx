import { useState } from 'react';
import { Code2 } from 'lucide-react';
import { CodeGeneratorModal } from './CodeGeneratorModal';
import type { TrafficEntry } from '@nectoproxy/shared';

interface CodeGeneratorButtonProps {
  entry: TrafficEntry;
  requestBody?: string | null;
}

export function CodeGeneratorButton({ entry, requestBody }: CodeGeneratorButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-2 py-1 rounded text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
        title="Generate code from this request"
        aria-label="Generate code"
      >
        <Code2 className="w-4 h-4" />
        <span className="hidden sm:inline">Code</span>
      </button>

      <CodeGeneratorModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        entry={entry}
        requestBody={requestBody}
      />
    </>
  );
}
