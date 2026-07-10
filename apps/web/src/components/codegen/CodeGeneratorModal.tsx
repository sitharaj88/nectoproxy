import { useState, useMemo, useCallback } from 'react';
import { Copy, Check, Code2 } from 'lucide-react';
import { Modal, Button, Select } from '@/components/ui';
import { languages, type GeneratorInput } from './generators';
import type { TrafficEntry } from '@nectoproxy/shared';
import { copyToClipboard } from '@/utils/clipboard';

interface CodeGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: TrafficEntry;
  requestBody?: string | null;
}

export function CodeGeneratorModal({
  isOpen,
  onClose,
  entry,
  requestBody,
}: CodeGeneratorModalProps) {
  const [selectedLanguage, setSelectedLanguage] = useState('curl');
  const [copied, setCopied] = useState(false);

  const generatorInput: GeneratorInput = useMemo(
    () => ({ entry, requestBody }),
    [entry, requestBody]
  );

  const selectedLang = languages.find((l) => l.id === selectedLanguage) || languages[0];
  const generated = useMemo(() => selectedLang.generator(generatorInput), [selectedLang, generatorInput]);

  const handleCopy = useCallback(async () => {
    try {
      await copyToClipboard(generated.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [generated.code]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Code"
      titleIcon={<Code2 className="w-5 h-5 text-accent" />}
      size="xl"
      maxHeight="90vh"
      footer={
        <div className="flex items-center justify-between">
          <span className="text-sm text-ink-muted">
            Language: <span className="text-ink-secondary">{generated.language}</span>
          </span>
          <Button variant="primary" size="md" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      {/* Request Info */}
      <div className="px-4 py-2 bg-surface border-b border-edge">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-mono text-accent">{entry.method}</span>
          <span className="text-ink-secondary truncate">{entry.url}</span>
        </div>
      </div>

      {/* Language Selector */}
      <div className="px-4 py-2 border-b border-edge">
        <Select
          sizeVariant="md"
          aria-label="Language"
          value={selectedLanguage}
          onChange={(e) => setSelectedLanguage(e.target.value)}
        >
          {languages.map((lang) => (
            <option key={lang.id} value={lang.id}>
              {lang.name}
            </option>
          ))}
        </Select>
      </div>

      {/* Code Display */}
      <div className="p-4">
        <div className="relative">
          <Button
            variant="secondary"
            size="xs"
            onClick={handleCopy}
            className="absolute top-2 right-2"
            aria-label={copied ? 'Copied!' : 'Copy code'}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-success" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </Button>
          <pre className="p-4 bg-canvas border border-edge rounded-md overflow-auto text-sm font-mono text-ink-secondary whitespace-pre-wrap">
            <code>{generated.code}</code>
          </pre>
        </div>
      </div>
    </Modal>
  );
}
