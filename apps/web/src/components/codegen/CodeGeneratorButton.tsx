import { useState } from 'react';
import { Code2 } from 'lucide-react';
import { Button, Tooltip } from '@/components/ui';
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
      <Tooltip content="Generate code from this request">
        <Button
          variant="primary"
          onClick={() => setIsOpen(true)}
          aria-label="Generate code"
        >
          <Code2 className="w-4 h-4" />
          <span className="hidden sm:inline">Code</span>
        </Button>
      </Tooltip>

      <CodeGeneratorModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        entry={entry}
        requestBody={requestBody}
      />
    </>
  );
}
