import { useMemo, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { xml } from '@codemirror/lang-xml';
import { html } from '@codemirror/lang-html';
import { javascript } from '@codemirror/lang-javascript';
import { css } from '@codemirror/lang-css';
import { EditorView } from '@codemirror/view';
import { Copy, Check, WrapText, Code2 } from 'lucide-react';
import { toast } from 'sonner';
import { copyToClipboard } from '@/utils/clipboard';

interface CodeViewerProps {
  content: string;
  contentType?: string;
  maxHeight?: string;
  showLineNumbers?: boolean;
  className?: string;
}

// Dark theme matching the app
const darkTheme = EditorView.theme({
  '&': {
    backgroundColor: 'rgb(17 24 39)',
    color: 'rgb(229 231 235)',
  },
  '.cm-content': {
    caretColor: '#fff',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    fontSize: '13px',
  },
  '.cm-gutters': {
    backgroundColor: 'rgb(17 24 39)',
    color: 'rgb(107 114 128)',
    border: 'none',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'rgb(31 41 55)',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgb(31 41 55)',
  },
  '.cm-selectionMatch': {
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
  },
  '&.cm-focused .cm-selectionBackground, ::selection': {
    backgroundColor: 'rgba(59, 130, 246, 0.4)',
  },
  '.cm-foldPlaceholder': {
    backgroundColor: 'rgb(55 65 81)',
    color: 'rgb(156 163 175)',
    border: 'none',
  },
});

function detectLanguage(contentType?: string) {
  if (!contentType) return null;

  const ct = contentType.toLowerCase();

  if (ct.includes('json')) return json();
  if (ct.includes('xml')) return xml();
  if (ct.includes('html')) return html();
  if (ct.includes('javascript') || ct.includes('ecmascript')) return javascript();
  if (ct.includes('css')) return css();

  return null;
}

function formatXml(xmlStr: string): string {
  let formatted = '';
  let indent = 0;
  const parts = xmlStr.replace(/>\s*</g, '><').split(/(<[^>]+>)/);

  for (const part of parts) {
    if (!part.trim()) continue;

    if (part.startsWith('</')) {
      indent = Math.max(0, indent - 1);
      formatted += '  '.repeat(indent) + part + '\n';
    } else if (part.startsWith('<') && part.endsWith('/>')) {
      formatted += '  '.repeat(indent) + part + '\n';
    } else if (part.startsWith('<?') || part.startsWith('<!')) {
      formatted += '  '.repeat(indent) + part + '\n';
    } else if (part.startsWith('<') && !part.startsWith('</')) {
      formatted += '  '.repeat(indent) + part + '\n';
      indent++;
    } else {
      formatted += '  '.repeat(indent) + part + '\n';
    }
  }

  return formatted.trimEnd();
}

function isFormattable(contentType?: string): boolean {
  if (!contentType) return false;
  const ct = contentType.toLowerCase();
  return ct.includes('json') || ct.includes('xml') || ct.includes('html');
}

function tryPrettyPrint(content: string, contentType?: string): string {
  if (!contentType) return content;

  const ct = contentType.toLowerCase();

  if (ct.includes('json')) {
    try {
      const parsed = JSON.parse(content);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return content;
    }
  }

  if (ct.includes('xml') || ct.includes('html')) {
    try {
      return formatXml(content);
    } catch {
      return content;
    }
  }

  return content;
}

export function CodeViewer({
  content,
  contentType,
  maxHeight = '400px',
  showLineNumbers = true,
  className = '',
}: CodeViewerProps) {
  const [copied, setCopied] = useState(false);
  const [wordWrap, setWordWrap] = useState(true);
  const [prettyPrint, setPrettyPrint] = useState(true);

  const language = useMemo(() => detectLanguage(contentType), [contentType]);

  const displayContent = useMemo(() => {
    if (prettyPrint) {
      return tryPrettyPrint(content, contentType);
    }
    return content;
  }, [content, contentType, prettyPrint]);

  const extensions = useMemo(() => {
    const exts = [darkTheme];

    if (language) exts.push(language);
    if (wordWrap) exts.push(EditorView.lineWrapping);

    return exts;
  }, [language, wordWrap]);

  const handleCopy = async () => {
    try {
      await copyToClipboard(displayContent);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const formattable = isFormattable(contentType);

  return (
    <div className={`relative rounded-lg overflow-hidden bg-gray-900 border border-gray-700 ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 bg-gray-800">
        <div className="flex items-center gap-2">
          {contentType && (
            <span className="text-xs text-gray-500 font-mono">
              {contentType.split(';')[0]}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {formattable && (
            <button
              onClick={() => setPrettyPrint(!prettyPrint)}
              className={`p-1.5 rounded transition-colors ${
                prettyPrint
                  ? 'text-blue-400 bg-blue-400/10'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
              }`}
              title={prettyPrint ? 'Show raw' : 'Pretty print'}
            >
              <Code2 className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setWordWrap(!wordWrap)}
            className={`p-1.5 rounded transition-colors ${
              wordWrap
                ? 'text-blue-400 bg-blue-400/10'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
            }`}
            title={wordWrap ? 'Disable word wrap' : 'Enable word wrap'}
          >
            <WrapText className="w-4 h-4" />
          </button>

          <button
            onClick={handleCopy}
            className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded transition-colors"
            title="Copy to clipboard"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div style={{ maxHeight }} className="overflow-auto">
        <CodeMirror
          value={displayContent}
          extensions={extensions}
          theme="dark"
          editable={false}
          basicSetup={{
            lineNumbers: showLineNumbers,
            foldGutter: true,
            highlightActiveLine: false,
            highlightSelectionMatches: true,
          }}
        />
      </div>
    </div>
  );
}
