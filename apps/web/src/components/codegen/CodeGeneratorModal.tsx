import { useState, useMemo, useCallback } from 'react';
import { X, Copy, Check, Code2 } from 'lucide-react';
import { languages, type GeneratorInput } from './generators';
import type { TrafficEntry } from '@proxyscope/shared';

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
      await navigator.clipboard.writeText(generated.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [generated.code]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-scaleIn"
        role="dialog"
        aria-modal="true"
        aria-labelledby="codegen-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-blue-400" />
            <h2 id="codegen-title" className="text-lg font-semibold text-white">
              Generate Code
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Request Info */}
        <div className="px-4 py-2 bg-gray-900/50 border-b border-gray-700">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-mono text-blue-400">{entry.method}</span>
            <span className="text-gray-300 truncate">{entry.url}</span>
          </div>
        </div>

        {/* Language Tabs */}
        <div className="flex gap-1 px-4 py-2 border-b border-gray-700 overflow-x-auto">
          {languages.map((lang) => (
            <button
              key={lang.id}
              onClick={() => setSelectedLanguage(lang.id)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors whitespace-nowrap ${
                selectedLanguage === lang.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {lang.name}
            </button>
          ))}
        </div>

        {/* Code Display */}
        <div className="flex-1 overflow-auto p-4">
          <div className="relative">
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
              aria-label={copied ? 'Copied!' : 'Copy code'}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
            <pre className="p-4 bg-gray-900 rounded-lg overflow-auto text-sm font-mono text-gray-300 whitespace-pre-wrap">
              <code>{generated.code}</code>
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700 bg-gray-900/30">
          <span className="text-sm text-gray-400">
            Language: <span className="text-gray-300">{generated.language}</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
